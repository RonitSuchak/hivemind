"""The Hivemind API (item 17): thin routes only; the thinking happens in the modules.

Run from backend/:
    RELOAD=1 .venv/bin/python -m app.serve   (never trust X-Forwarded-For from everyone)
Docs to try every request: http://localhost:8000/docs

Rules: errors are always {"error": {"code", "message"}} with no stack traces;
bodies over 16 KB are refused; chat, ask, match, submissions, validation, suggestions
and admin routes are rate-limited per device; no IP address, message or email is
ever logged.
"""

from __future__ import annotations

import hmac
import logging
import secrets
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Literal

from fastapi import Depends, FastAPI, Header, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict, Field
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import advisor, catalog, config, live, live_lab, matching, pilot, real_tools
from .check import check_quality, profile_from, public_check
from .limits import limiter
from .middleware import BodyLimit, SecurityHeaders, client_ip
from .llm import GeminiClient, LLMError
from .ratings import ratings
from .report import report
from .store import StoreUnavailable, get_store
from .students import STUDENTS
from .submissions import queue as submissions

log = logging.getLogger("hivemind")


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str, headers: dict | None = None):
        super().__init__(message)
        self.status, self.code, self.message, self.headers = status, code, message, headers or {}


def error(status: int, code: str, message: str, headers: dict | None = None) -> JSONResponse:
    return JSONResponse({"error": {"code": code, "message": message}}, status_code=status, headers=headers)


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        submissions.resume_runs()  # carry on with any class run a restart interrupted
    except StoreUnavailable:  # start anyway: everything except saved data still works
        log.warning("could not resume submission runs: database unreachable")
    yield


app = FastAPI(title="Hivemind API", version=config.API_VERSION, lifespan=lifespan,
              description="Tests demo tools (built-in AI tutors standing in for types of real EdTech tools) on a simulated "
                          "class of 30. API fields keep the name `tutor`. Contract: docs/BACKEND.md.")
# Order matters: the last one added runs first. CORS is outermost, so even a "too big" answer
# carries CORS headers and the website can read its message.
app.add_middleware(SecurityHeaders)
app.add_middleware(BodyLimit)
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["GET", "POST", "DELETE"],
                   allow_headers=["Content-Type", "X-Admin-Password"], max_age=600)


@app.exception_handler(ApiError)
async def api_error(_: Request, exc: ApiError):
    return error(exc.status, exc.code, exc.message, exc.headers)


@app.exception_handler(StarletteHTTPException)
async def http_error(_: Request, exc: StarletteHTTPException):
    code = {404: "not_found", 405: "method_not_allowed"}.get(exc.status_code, "invalid_input")
    message = {404: "There is nothing at this address.",
               405: "This address does not take that kind of request."}.get(exc.status_code, str(exc.detail))
    return error(exc.status_code, code, message)


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    if first.get("type") == "json_invalid":  # was "Check '1': JSON decode error." (crash test B9)
        return error(400, "invalid_input", "The request is not valid JSON.")
    where = ".".join(str(p) for p in first.get("loc", []) if p != "body") or "body"
    return error(400, "invalid_input", f"Check '{where}': {first.get('msg', 'invalid value')}.")


@app.exception_handler(StoreUnavailable)
async def store_unavailable(_: Request, exc: StoreUnavailable):
    return error(503, "store_unavailable", "Saved data is out of reach right now. Please try again in a minute.")


@app.exception_handler(Exception)
async def unexpected(_: Request, exc: Exception):
    log.error("internal error: %s", type(exc).__name__)  # the type only: no request data
    return error(500, "internal", "Something went wrong on our side. Please try again.")


# --- shared helpers -----------------------------------------------------------------

def client_key(request: Request) -> str:
    return client_ip(request.headers, request.client.host if request.client else None)


def rate_limit(bucket: str):
    def check(request: Request):
        wait = limiter.check(bucket, client_key(request))
        if wait:
            raise ApiError(429, "rate_limited", "Too many requests from this device. Please wait and try again.",
                           {"Retry-After": str(wait)})
    return check


_live_client = None


def live_client():
    """One shared Gemini client for live chat and ask (short gap between calls)."""
    global _live_client
    if _live_client is None:
        try:
            _live_client = GeminiClient(min_seconds=config.LIVE_GEMINI_MIN_SECONDS)
        except config.MissingKeyError:
            raise ApiError(503, "not_configured", "The AI isn't set up on this server yet.") from None
    return _live_client


def require_admin(x_admin_password: str | None = Header(default=None)):
    expected = (config.setting("ADMIN_PASSWORD", "") or "").strip()
    if not expected:
        raise ApiError(503, "not_configured", "Admin routes are switched off until an admin password is set.")
    if not x_admin_password or not hmac.compare_digest(x_admin_password.encode(), expected.encode()):
        raise ApiError(401, "unauthorized", "Wrong admin password.")


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def validation_entries() -> list[dict]:
    return sorted(get_store().list("validation"), key=lambda e: e["created"])


# --- lab ------------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"ok": True, "version": config.API_VERSION, "store": get_store().kind, "tutors": len(catalog.tutors())}


@app.get("/api/tutors")
def tutors():
    return catalog.tutors()


@app.get("/api/students")
def students():
    return [s.to_dict() for s in STUDENTS]


@app.get("/api/runs/{tutor_id}")
def runs(tutor_id: str):
    run = catalog.run(tutor_id)
    if run is None:
        raise ApiError(404, "not_found", "No finished class run for that demo tool.")
    return run


@app.get("/api/ratings")
def get_ratings():
    return ratings(catalog.rated())


@app.get("/api/report/{tutor_id}")
def get_report(tutor_id: str):
    tutor, run = catalog.tutor(tutor_id), catalog.run(tutor_id)
    if tutor is None or run is None:
        raise ApiError(404, "not_found", "No finished class run for that demo tool.")
    return report(tutor, run)


# --- AI Advisor -----------------------------------------------------------------------

Answers = dict[str, str | None] | None


class Topic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    subject: str = Field(min_length=1, max_length=40)
    advanced: bool = False


class LanguageAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=40)
    answer: str | None = Field(default=None, max_length=200)


class HardAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=40)
    answer: str | None = Field(default=None, max_length=200)
    hints_opened: int = Field(default=0, ge=0, le=10)


class Extras(BaseModel):
    """Trial parts of a demo topic pack. Stored with the match, never used in scoring (yet)."""
    model_config = ConfigDict(extra="forbid")
    pack: str | None = Field(default=None, max_length=60)
    language: list[LanguageAnswer] = Field(default_factory=list, max_length=10)
    hard: HardAnswer | None = None


class MatchBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    quiz_1: Answers = None
    quiz_2: Answers = None
    reading: Answers = None
    english_confidence: int | None = Field(default=None, ge=1, le=5)  # 1 to 5, or null when skipped
    seconds_taken: int | None = Field(default=None, ge=0, le=86_400)  # crash test B7: no negative or absurd times
    topic: Topic | None = None
    extras: Extras | None = None


_last_clean = 0.0


def clean_old_matches() -> None:
    """Delete saved matches older than MATCHES_KEEP_DAYS, at most once an hour. Nothing else is cleared:
    classmate results and submissions are kept on purpose."""
    global _last_clean
    if time.monotonic() - _last_clean < config.MATCHES_CLEAN_EVERY_SECONDS and _last_clean:
        return
    _last_clean = time.monotonic()
    gone = get_store().delete_older("matches", config.MATCHES_KEEP_DAYS)
    if gone:
        log.info("cleared %d saved matches older than %d days", gone, config.MATCHES_KEEP_DAYS)


def build_match(profile: dict, topic: dict | None = None, extras: dict | None = None) -> dict:
    """topic: {"subject", "advanced"} narrows real_tools only. extras: stored, never scored."""
    rated = catalog.rated()
    topic = real_tools.clean_topic(topic)
    result = matching.match(profile, rated)
    try:
        entries = validation_entries()
    except StoreUnavailable:
        entries = []
    result["follow_ups"] = advisor.follow_ups(result, rated, live.validation_summary(entries))
    try:  # the match itself never needs the database; only "ask" by match_id does
        get_store().put("matches", result["match_id"], {"profile": result["profile"], "questions": 0, "created": now(),
                                                         "topic": topic, "extras": extras})
        clean_old_matches()
    except StoreUnavailable:
        log.warning("match not saved: database unreachable")
    result["real_tools"] = real_tools.for_match(result["ranked"], topic)
    result["topic"] = topic
    keys = ("match_id", "enough_matches", "profile", "radar", "matches", "ranked", "real_tools", "topic", "follow_ups",
            "message", "note")
    return {k: result[k] for k in keys}


@app.get("/api/real-tools")
def get_real_tools(student: str | None = None, subject: str | None = None, advanced: bool = False):
    """Every real tool; or, with ?student=s07, the tools for one simulated student (Lab drawer)."""
    if subject is not None and not 0 < len(subject.strip()) <= real_tools.SUBJECT_MAX_CHARS:
        raise ApiError(400, "invalid_input", f"subject must be 1 to {real_tools.SUBJECT_MAX_CHARS} characters.")
    if student is None:
        if subject is not None:
            raise ApiError(400, "invalid_input", "subject only works with student. For a person, send topic to /api/match.")
        return real_tools.listing()
    try:
        return real_tools.for_student(student, subject, advanced)
    except KeyError:
        raise ApiError(404, "not_found", "No simulated student with that id.") from None


@app.get("/api/pilot")
def get_pilot():
    return pilot.listing()


SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


@app.get("/api/live-lab")
def get_live_lab(request: Request, tutor_id: str, students: str | None = None, mode: str = "live",
                 delay: float = config.REPLAY_DELAY_SECONDS):
    """Server-Sent Events: a live (or replayed) lab run. Event format in docs/BACKEND.md 5.21."""
    if mode not in ("live", "replay"):
        raise ApiError(400, "invalid_input", 'mode must be "live" or "replay".')
    try:
        chosen = live_lab.parse_students(students)  # checked first, so a typo doesn't use up a live run
        rate_limit("live_lab" if mode == "live" else "live_lab_replay")(request)
        if mode == "replay":
            if not 0 <= delay <= 3:
                raise ApiError(400, "invalid_input", "delay must be between 0 and 3 seconds.")
            stream = live_lab.replay_stream(live_lab.replay_events(tutor_id, chosen), delay)
        else:
            stream = live_lab.start_live(tutor_id, chosen)
    except live_lab.LiveLabError as exc:
        raise ApiError(exc.status, exc.code, exc.message) from None
    return StreamingResponse(stream, media_type="text/event-stream", headers=SSE_HEADERS)


@app.get("/api/check")
def check():
    return public_check()


@app.post("/api/match", dependencies=[Depends(rate_limit("match"))])
def post_match(body: MatchBody):
    data = body.model_dump()
    result = build_match(profile_from(data), data.get("topic"), data.get("extras"))
    result["check_quality"] = check_quality(data)
    return result


class AskBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    match_id: str | None = None
    profile: dict | None = None
    question: str


@app.post("/api/ask", dependencies=[Depends(rate_limit("ask"))])
def post_ask(body: AskBody):
    question = body.question.strip()
    if not question:
        raise ApiError(400, "invalid_input", "Type a question first.")
    if len(question) > config.ASK_MAX_CHARS:
        raise ApiError(400, "too_long", f"Questions can be at most {config.ASK_MAX_CHARS} characters.")
    store = get_store()
    record = None
    if body.match_id:
        try:
            record = store.get("matches", body.match_id)
        except ValueError:
            record = None
        if record is None:
            raise ApiError(404, "not_found", "That match wasn't found. Take the check again.")
        match_id = body.match_id
    else:
        profile = matching.valid_profile(body.profile)
        if profile is None:
            raise ApiError(400, "invalid_input", "Send a match_id, or a profile with the 5 numbers.")
        created = build_match(profile)
        match_id, record = created["match_id"], store.get("matches", created["match_id"])
    if record["questions"] >= config.ASK_PER_MATCH:
        raise ApiError(429, "question_limit", f"You can ask {config.ASK_PER_MATCH} questions about one result.")
    profile = matching.valid_profile(record["profile"])
    result = matching.match(profile, catalog.rated())
    try:
        answer = advisor.ask(result, question, live_client())
    except LLMError:
        raise ApiError(503, "ai_unavailable", "The AI is busy right now. Please try again in a minute.") from None
    record["questions"] += 1
    store.put("matches", match_id, record)
    return {"match_id": match_id, **answer, "questions_left": config.ASK_PER_MATCH - record["questions"]}


# --- try a tutor ------------------------------------------------------------------------

class ChatBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    tutor_id: str
    session_id: str | None = None
    message: str


def log_live_event(event: dict) -> None:
    store = get_store()
    store.put("live_events", f"e_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}", event)


@app.post("/api/chat", dependencies=[Depends(rate_limit("chat"))])
def post_chat(body: ChatBody):
    tutor = catalog.tutor(body.tutor_id)
    if tutor and tutor["kind"] != "built_in":
        raise ApiError(400, "invalid_input", "Try submitted products on their own website (see try_url).")
    if len(body.message.strip()) > config.CHAT_MAX_CHARS:  # checked before any AI call
        raise ApiError(400, "too_long", f"Messages can be at most {config.CHAT_MAX_CHARS} characters.")
    try:
        return live.chat(tutor, body.session_id, body.message, live_client() if tutor and tutor["live_chat"] else None,
                         log_live_event)
    except live.ChatError as exc:
        raise ApiError(exc.status, exc.code, exc.message) from None
    except LLMError:
        raise ApiError(503, "ai_unavailable", "The demo tool is busy right now. Please try again in a minute.") from None


# --- real-classmate check ---------------------------------------------------------------

@app.get("/api/test")
def get_test():
    return live.public_test()


class ScoreBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    answers: Answers = None


@app.post("/api/test/score")
def post_score(body: ScoreBody):
    return live.score_test(body.answers or {})


class ValidationBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    code: str | None = None
    match_id: str | None = None
    profile: dict | None = None
    tutor_id: str
    before: int
    after: int


@app.post("/api/validation", dependencies=[Depends(rate_limit("validation"))])
def post_validation(body: ValidationBody):
    store = get_store()
    if not (0 <= body.before <= 10 and 0 <= body.after <= 10):
        raise ApiError(400, "invalid_input", "Test scores must be between 0 and 10.")
    profile = matching.valid_profile(body.profile) if body.profile else None
    if profile is None and body.match_id:
        try:
            record = store.get("matches", body.match_id)
        except ValueError:
            record = None
        profile = matching.valid_profile(record["profile"]) if record else None
    if profile is None:
        raise ApiError(400, "invalid_input", "Send a match_id from the check, or a profile with the 5 numbers.")
    rated = catalog.rated()
    rows = matching.rank(matching.nearest(profile), rated)
    row = next((r for r in rows if r["tutor_id"] == body.tutor_id), None)
    if row is None:
        raise ApiError(404, "not_found", "No rated demo tool called that.")
    code = (body.code or "").strip().upper() or live.new_code()
    if not live.valid_code(code):
        raise ApiError(400, "invalid_input", "Codes look like HM-4XK2. Never use a name.")
    if store.get("validation", code.replace("-", "_")):
        raise ApiError(400, "invalid_input", "That code is already used.")
    real = max(0, body.after - body.before)
    entry = {"code": code, "tutor_id": body.tutor_id, "before": body.before, "after": body.after,
             "real_gain": real, "predicted_gain": row["predicted_gain"],
             "difference": round(real - row["predicted_gain"], 1), "created": now()}
    store.put("validation", code.replace("-", "_"), entry)
    return entry


@app.get("/api/validation")
def get_validation():
    entries = validation_entries()
    return {"entries": entries, "summary": live.validation_summary(entries),
            "note": "Real classmates, anonymous codes. A first check, not a final verdict."}


@app.delete("/api/admin/validation/{code}", dependencies=[Depends(rate_limit("admin")), Depends(require_admin)])
def delete_validation(code: str):
    key = code.strip().upper().replace("-", "_")
    try:
        deleted = get_store().delete("validation", key)
    except ValueError:
        deleted = False
    if not deleted:
        raise ApiError(404, "not_found", "No entry with that code.")
    return {"deleted": code.strip().upper()}


# --- suggestion box -----------------------------------------------------------------------

class SuggestionBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    kind: Literal["tool", "measure", "feature"]
    text: str


@app.post("/api/suggestions", dependencies=[Depends(rate_limit("suggestions"))])
def post_suggestion(body: SuggestionBody):
    """The website's suggestion box. Stores kind, text and time only: no name, email or address,
    and personal details in the text are removed first (the same rule as live chat)."""
    text = live.redact(body.text.strip()[:config.SUGGESTION_MAX_CHARS]).strip()
    if not text:
        raise ApiError(400, "invalid_input", "Write a suggestion first.")
    created = now()
    item_id = created.replace("-", "").replace(":", "") + "_" + secrets.token_hex(3)  # sorts by time
    get_store().put("suggestions", item_id, {"kind": body.kind, "text": text, "created": created})
    return {"ok": True, "kind": body.kind, "created": created}


# --- product submissions ----------------------------------------------------------------

class SubmissionBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    product: str | None = None
    tutor_url: str | None = None
    product_url: str | None = None
    contact_email: str | None = None
    subject: str | None = None
    age_range: str | None = None
    agreed_terms: bool | None = None


class ReviewBody(BaseModel):
    model_config = ConfigDict(extra="ignore")
    note: str | None = None


def _sub(call, *args, **kwargs):
    try:
        return submissions.public(call(*args, **kwargs))
    except submissions.SubmissionError as exc:
        raise ApiError(exc.status, exc.code, exc.message) from None


@app.post("/api/submissions", dependencies=[Depends(rate_limit("submissions"))])
def post_submission(body: SubmissionBody):
    return _sub(submissions.submit, body.model_dump())


@app.get("/api/submissions")
def list_submissions():
    return [submissions.public(s) for s in submissions.all_submissions()]


@app.get("/api/submissions/{sub_id}")
def get_submission(sub_id: str):
    return _sub(submissions.get, sub_id)


@app.post("/api/submissions/{sub_id}/verify", dependencies=[Depends(rate_limit("verify"))])
def verify_submission(sub_id: str):
    return _sub(submissions.verify, sub_id)


@app.post("/api/admin/submissions/{sub_id}/approve",
          dependencies=[Depends(rate_limit("admin")), Depends(require_admin)])
def approve_submission(sub_id: str, body: ReviewBody | None = None):
    return _sub(submissions.review, sub_id, True, body.note if body else None)


@app.post("/api/admin/submissions/{sub_id}/reject",
          dependencies=[Depends(rate_limit("admin")), Depends(require_admin)])
def reject_submission(sub_id: str, body: ReviewBody | None = None):
    return _sub(submissions.review, sub_id, False, body.note if body else None)
