"""The live lab: up to 3 simulated students taught by one demo tool, streamed as it happens.

GET /api/live-lab streams Server-Sent Events (SSE: one HTTP response that stays
open and sends small JSON messages as they happen). Two modes, same events:

  live    runs real lessons now: the demo tool and student voice are real AI
          (up to 11 calls per student). One run at a time, inside the daily budget.
  replay  streams lessons already saved in the class run: 0 AI calls, for when
          the Wi-Fi or the free limit lets us down on stage.

Events, in order (docs/BACKEND.md 5.21):
  start, then per student: lesson_start, message..., safety..., lesson_end;
  then scores, done. An error event ends the stream early.
"""

from __future__ import annotations

import json
import queue
import threading
import time
from collections.abc import Iterator

from . import catalog, config
from .brain import Brain
from .lab import Budget
from .pilot import PILOT_STUDENTS
from .scores import class_run
from .simulation import run_lesson
from .students import SAFETY_MOMENTS, STUDENTS, StudentProfile, get_student

DEFAULT_STUDENTS = tuple(PILOT_STUDENTS)
NOTE = ("A live sample of up to 3 students: these numbers are not the tool's official scores, "
        "which come from the full class of 30.")
_IDS = {s.id for s in STUDENTS}


class LiveLabError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status, self.code, self.message = status, code, message


# --- plugs (tests swap these for fakes) -------------------------------------------------

def _client():
    from .llm import GeminiClient
    return GeminiClient()


def _tutor(tutor_id: str, client):
    from .tutors import get_tutor
    return get_tutor(tutor_id, client=client)


def _voice(client):
    from .voice.ai import AIVoice
    return AIVoice(client)


client_factory, tutor_factory, voice_factory = _client, _tutor, _voice
budget_path = None  # None: config.RUNS_DIR / "budget.json", shared with the lab


# --- one run at a time ----------------------------------------------------------------

class _Slot:
    def __init__(self):
        self._lock, self.since = threading.Lock(), None

    def take(self) -> bool:
        with self._lock:
            if self.since is not None and time.monotonic() - self.since < config.LIVE_LAB_STALE_SECONDS:
                return False
            self.since = time.monotonic()
            return True

    def free(self) -> None:
        with self._lock:
            self.since = None


slot = _Slot()


# --- events -----------------------------------------------------------------------------

def sse(event: str, data: dict, event_id: int) -> str:
    return f"event: {event}\nid: {event_id}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _too_hard(student: StudentProfile, reading_age: float | None) -> bool:
    return reading_age is not None and reading_age > student.effective_reading_age + config.READING_LEEWAY


def message_event(student: StudentProfile, message: dict, progress: list[float]) -> dict:
    """One chat message with what the lab made of it. progress: knowledge after each tutor message."""
    turn = message["turn"]
    out = {"student_id": student.id, "turn": turn, "from": message["from"], "text": message["text"]}
    if message["from"] == "tutor":
        before, after = progress[turn - 1], progress[turn]
        out["label"] = {"move": message["move"], "reading_age": message["reading_age"],
                        "too_hard": _too_hard(student, message["reading_age"])}
        out["knowledge"] = {"before": round(before, 2), "after": round(after, 2), "change": round(after - before, 2)}
    else:
        out["knowledge"] = {"now": round(progress[min(turn, len(progress) - 1)], 2)}
        for key in ("voice", "attempt", "safety_moment"):
            if key in message:
                out[key] = message[key]
    return out


def lesson_start(student: StudentProfile) -> dict:
    return {"student_id": student.id, "student_name": student.name, "tags": list(student.tags),
            "safety_moment": SAFETY_MOMENTS.get(student.id), "knowledge": round(Brain(student).knowledge, 2)}


def lesson_end(result: dict) -> list[tuple[str, dict]]:
    events = [("safety", {"student_id": result["student_id"], **e}) for e in result["safety_events"]]
    events.append(("lesson_end", {"student_id": result["student_id"],
                                  **{k: result[k] for k in ("before", "after", "gain", "outcome", "gave_up",
                                                            "problems_solved", "flags")}}))
    return events


def scores_event(tutor: dict, results: list[dict], mode: str) -> dict:
    run = class_run({"tutor_id": tutor["tutor_id"], "tutor_name": tutor["tutor_name"]}, results, "", mode)
    official = catalog.run(tutor["tutor_id"])
    return {"sample": len(results), "scores": run["scores"], "summary": run["summary"],
            "official_scores": official["scores"] if official else None, "note": NOTE}


def start_event(tutor: dict, students: list[StudentProfile], mode: str) -> dict:
    return {"mode": mode, "tutor_id": tutor["tutor_id"], "tutor_name": tutor["tutor_name"],
            "students": [{"id": s.id, "name": s.name, "tags": list(s.tags)} for s in students],
            "turns": config.LESSON_TURNS, "note": NOTE}


# --- checking a request -------------------------------------------------------------------

def parse_students(raw: str | None) -> list[StudentProfile]:
    ids = [x.strip() for x in raw.split(",") if x.strip()] if raw else list(DEFAULT_STUDENTS)
    if not ids or len(ids) > config.LIVE_LAB_MAX_STUDENTS:
        raise LiveLabError(400, "invalid_input", f"Choose 1 to {config.LIVE_LAB_MAX_STUDENTS} students.")
    if len(set(ids)) != len(ids) or any(i not in _IDS for i in ids):
        raise LiveLabError(400, "invalid_input", "Use different student ids from GET /api/students, like s03.")
    return [get_student(i) for i in ids]


def built_in(tutor_id: str) -> dict:
    tutor = catalog.tutor(tutor_id)
    if tutor is None or tutor["kind"] != "built_in":
        raise LiveLabError(404, "not_found", "No demo tool with that id.")
    return tutor


# --- replay: saved lessons, no AI ------------------------------------------------------------

def replay_events(tutor_id: str, students: list[StudentProfile]) -> list[tuple[str, dict]]:
    tutor = built_in(tutor_id)
    run = catalog.run(tutor_id)
    saved = {r["student_id"]: r for r in (run or {}).get("results", [])}
    missing = [s.id for s in students if s.id not in saved]
    if missing:
        raise LiveLabError(404, "not_found", f"No saved lesson for {', '.join(missing)} with this demo tool yet.")
    mode = "replay"
    events = [("start", {**start_event(tutor, students, mode), "tutor_mode": run.get("tutor_mode", "ai"),
                         "tested_on": run.get("tested_on")})]
    results = []
    for student in students:
        result = saved[student.id]
        events.append(("lesson_start", lesson_start(student)))
        events += [("message", message_event(student, m, result["progress"])) for m in result["transcript"]]
        events += lesson_end(result)
        results.append(result)
    events.append(("scores", scores_event(tutor, results, run.get("voice", "ai"))))
    events.append(("done", {"mode": mode}))
    return events


def replay_stream(events: list[tuple[str, dict]], delay: float, sleep=time.sleep) -> Iterator[str]:
    yield ": replay\n\n"
    for n, (name, data) in enumerate(events, 1):
        if name == "message" and delay:
            sleep(delay)
        yield sse(name, data, n)


# --- live: real lessons now ------------------------------------------------------------------

class _Cancelled(Exception):
    pass


def start_live(tutor_id: str, students: list[StudentProfile]) -> Iterator[str]:
    """Checks everything, takes the run slot and starts the lessons. Returns the event stream."""
    tutor = built_in(tutor_id)
    if not tutor["live_chat"]:
        raise LiveLabError(403, "safety_concern", f"{tutor['tutor_name']} failed a safety check in our tests, so it "
                           "can't run live. Use mode=replay to show its saved lessons.")
    budget = Budget(budget_path or config.RUNS_DIR / "budget.json", config.GEMINI_DAILY_BUDGET)
    needed = config.CALLS_PER_LESSON * len(students)
    if not budget.can_afford(needed):
        raise LiveLabError(503, "budget_reached", "Today's free AI calls are used up. Use mode=replay instead.")
    try:
        client = client_factory()
    except config.MissingKeyError:
        raise LiveLabError(503, "not_configured", "The AI isn't set up on this server yet.") from None
    if not slot.take():
        raise LiveLabError(409, "busy", "A live run is already going. Wait for it to finish, or use mode=replay.")

    events: queue.Queue = queue.Queue()
    cancelled = threading.Event()

    def emit(name: str, data: dict) -> None:
        if cancelled.is_set():
            raise _Cancelled()
        events.put((name, data))

    def work() -> None:
        from .llm import LLMError
        spent = getattr(client, "calls", 0)
        try:
            emit("start", {**start_event(tutor, students, "live"), "tutor_mode": "ai"})
            results = []
            ai_tutor, voice = tutor_factory(tutor_id, client), voice_factory(client)
            for student in students:
                emit("lesson_start", lesson_start(student))
                result = run_lesson(student, ai_tutor, voice,
                                    on_message=lambda m, brain, s=student: emit("message",
                                                                                message_event(s, m, brain.history)))
                for name, data in lesson_end(result):
                    emit(name, data)
                results.append(result)
            emit("scores", scores_event(tutor, results, "ai"))
            emit("done", {"mode": "live"})
        except _Cancelled:
            pass
        except LLMError:
            events.put(("error", {"code": "ai_unavailable",
                                  "message": "The AI stopped answering. Use mode=replay to show saved lessons."}))
        except Exception:  # never leave the stream hanging
            events.put(("error", {"code": "server_error", "message": "Something went wrong on our side."}))
        finally:
            used = getattr(client, "calls", 0) - spent
            if used:
                budget.spend(used)
            slot.free()
            events.put(None)

    threading.Thread(target=work, daemon=True, name="live-lab").start()

    def stream() -> Iterator[str]:
        n = 0
        try:
            yield ": live\n\n"
            while (item := events.get()) is not None:
                n += 1
                yield sse(item[0], item[1], n)
        finally:
            cancelled.set()  # the viewer left: stop at the next message

    return stream()


__all__ = ["start_live", "replay_events", "replay_stream", "parse_students", "LiveLabError", "DEFAULT_STUDENTS"]
