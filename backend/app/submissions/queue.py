"""The submission lifecycle and the review queue.

    checking -> failed | needs_ownership -> queued -> approved (class run in the background) | rejected

Checks run in order and stop at the first fail. On approval, all 30 students
are taught by the product in a background thread; each lesson is stored as it
ends, so a restart (or a free host going to sleep) only pauses the run.
"""

from __future__ import annotations

import re
import secrets
import threading
from datetime import datetime, timezone

from .. import catalog, config
from ..safety import judge_lesson
from ..scores import class_run
from ..simulation import run_lesson
from ..store import get_store
from ..students import STUDENTS
from ..voice import ScriptedVoice
from . import safebrowsing
from .links import LinkError, is_https, resolve
from .maker_client import WebTutor, ask_tutor

LABELS = {
    "secure_link": "Links use https",
    "reputation": "Not on Google's dangerous-sites list",
    "public_address": "Points to a public server",
    "responds": "Replied to a test message in time",
    "ownership": "Maker proved they own the tutor",
}
EMAIL = re.compile(r"^[^@\s]{1,64}@[^@\s]+\.[A-Za-z]{2,}$")
PUBLIC_FIELDS = ("id", "product", "tutor_url", "product_url", "subject", "age_range", "status", "checks",
                 "ownership_code", "tutor_id", "try_url", "run", "review_note", "created", "updated")
_lock = threading.Lock()
_running: set[str] = set()


class SubmissionError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status, self.code, self.message = status, code, message


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def public(sub: dict) -> dict:
    """What any route may return: never the contact email."""
    return {k: sub.get(k) for k in PUBLIC_FIELDS}


def validate_form(body: dict) -> dict:
    form = {}
    for field, limit in config.SUBMISSION_FIELD_LIMITS.items():
        value = body.get(field)
        if not isinstance(value, str) or not value.strip():
            raise SubmissionError(400, "invalid_input", f"Fill in '{field}'.")
        value = value.strip()
        if len(value) > limit:
            raise SubmissionError(400, "invalid_input", f"'{field}' can be at most {limit} characters.")
        form[field] = value
    if not EMAIL.match(form["contact_email"]):
        raise SubmissionError(400, "invalid_input", "Check 'contact_email': it doesn't look like an email address.")
    if body.get("agreed_terms") is not True:
        raise SubmissionError(400, "invalid_input", "Please agree to the terms.")
    return form


def _check(name: str, passed, detail: str = "") -> dict:
    return {"name": name, "label": LABELS[name], "passed": passed, "detail": detail}


def run_checks(form: dict, lookup=safebrowsing.dangerous, ask=ask_tutor, resolver=resolve) -> list[dict]:
    urls = [form["tutor_url"], form["product_url"]]
    checks = []
    if not all(is_https(u) for u in urls):
        return [_check("secure_link", False, "Both links must start with https://.")]
    checks.append(_check("secure_link", True))
    try:
        bad = lookup(urls)
    except safebrowsing.NotConfigured:
        return checks + [_check("reputation", False, "The link checker isn't set up yet, so links can't be "
                                                     "accepted. Please try again later.")]
    except RuntimeError:
        return checks + [_check("reputation", False, "Google's link checker didn't answer. Please try again.")]
    if bad:
        return checks + [_check("reputation", False, "Google lists this link as dangerous.")]
    checks.append(_check("reputation", True))
    from urllib.parse import urlsplit
    try:
        for url in urls:
            resolver(urlsplit(url).hostname)
        answer = ask(form["tutor_url"], [{"role": "student", "text": config.MAKER_TEST_MESSAGE}])
    except LinkError as error:
        if error.check == "public_address":
            return checks + [_check("public_address", False, error.detail)]
        return checks + [_check("public_address", True), _check("responds", False, error.detail)]
    checks.append(_check("public_address", True))
    checks.append(_check("responds", True, f"Replied in {answer['seconds']:.1f} s, {len(answer['reply'])} characters"))
    return checks


def _next_id(store) -> str:
    numbers = [int(s["id"].split("_")[1]) for s in store.list("submissions") if s.get("id", "").startswith("sub_")]
    return f"sub_{(max(numbers) + 1) if numbers else 1:03d}"


def submit(body: dict, **check_tools) -> dict:
    form = validate_form(body)
    checks = run_checks(form, **check_tools)
    passed = all(c["passed"] for c in checks) and len(checks) == 4
    store = get_store()
    with _lock:
        sub_id = _next_id(store)
        sub = {"id": sub_id, **form, "status": "needs_ownership" if passed else "failed", "checks": checks,
               "ownership_code": None, "tutor_id": None, "try_url": None, "run": None, "review_note": None,
               "created": now(), "updated": now()}
        if passed:
            sub["ownership_code"] = "HM-" + "".join(secrets.choice("ABCDEFGHJKMNPQRSTUVWXYZ23456789")
                                                    for _ in range(4))
            sub["checks"].append(_check("ownership", None, "Add the code below to your tutor's reply, then press "
                                                           "Verify."))
        store.put("submissions", sub_id, sub)
    return sub


def get(sub_id: str) -> dict:
    try:
        sub = get_store().get("submissions", sub_id)
    except ValueError:
        sub = None
    if sub is None:
        raise SubmissionError(404, "not_found", "No submission with that id.")
    return sub


def all_submissions() -> list[dict]:
    return sorted(get_store().list("submissions"), key=lambda s: s["created"], reverse=True)


def verify(sub_id: str, ask=ask_tutor) -> dict:
    sub = get(sub_id)
    if sub["status"] != "needs_ownership":
        raise SubmissionError(409, "wrong_status", "Only submissions waiting for ownership can be verified.")
    try:
        answer = ask(sub["tutor_url"], [{"role": "student", "text": config.MAKER_TEST_MESSAGE}])
        found = answer["code"] == sub["ownership_code"]
        detail = "Code found in the tutor's reply." if found else "The code wasn't found in the reply yet."
    except LinkError as error:
        found, detail = False, f"Couldn't reach the tutor: {error.detail}"
    sub["checks"] = [c for c in sub["checks"] if c["name"] != "ownership"] + [
        _check("ownership", True if found else None, detail)]
    if found:
        sub["status"] = "queued"
    sub["updated"] = now()
    get_store().put("submissions", sub_id, sub)
    return sub


def review(sub_id: str, approve: bool, note: str | None, start=True) -> dict:
    sub = get(sub_id)
    if sub["status"] != "queued":
        raise SubmissionError(409, "wrong_status", "Only queued submissions can be approved or rejected.")
    sub["status"] = "approved" if approve else "rejected"
    sub["review_note"] = (note or "").strip()[:300] or None
    if approve:
        sub["run"] = {"state": "waiting", "lessons_done": 0, "lessons_total": len(STUDENTS)}
    sub["updated"] = now()
    get_store().put("submissions", sub_id, sub)
    if approve and start:
        start_run(sub_id)
    return sub


# --- the class run ------------------------------------------------------------------

def class_run_for(sub_id: str, make_tutor=None, make_voice=ScriptedVoice) -> None:
    """Teach every missing lesson, then save the class run. Safe to call again after a stop."""
    store = get_store()
    sub = get(sub_id)
    tutor = (make_tutor or (lambda s: WebTutor(s["id"], s["product"], s["tutor_url"])))(sub)
    sub["run"]["state"] = "running"
    store.put("submissions", sub_id, sub)
    results = []
    try:
        for student in STUDENTS:
            key = f"{sub_id}_{student.id}"
            lesson = store.get("sublessons", key)
            if lesson is None:
                lesson = run_lesson(student, tutor, make_voice())
                lesson["model_version"] = config.MODEL_VERSION
                store.put("sublessons", key, lesson)
            results.append({k: v for k, v in lesson.items() if k != "model_version"})
            sub["run"]["lessons_done"] = len(results)
            sub["updated"] = now()
            store.put("submissions", sub_id, sub)
    except Exception as error:  # a maker tutor that stops answering: record it in plain words
        sub["run"]["state"] = "error"
        sub["run"]["detail"] = error.detail if isinstance(error, LinkError) else "The tutor stopped answering."
        store.put("submissions", sub_id, sub)
        return
    for r in results:
        r["safety_events"] = judge_lesson(r)
    info = {"tutor_id": sub_id, "tutor_name": sub["product"], "kind": "submitted"}
    run = class_run(info, results, now()[:10], "scripted")
    store.put("subruns", sub_id, run)
    sub["run"]["state"] = "done"
    sub["tutor_id"], sub["try_url"] = sub_id, sub["product_url"]
    sub["updated"] = now()
    store.put("submissions", sub_id, sub)


def start_run(sub_id: str, **kwargs) -> threading.Thread | None:
    with _lock:
        if sub_id in _running:
            return None
        _running.add(sub_id)

    def work():
        try:
            class_run_for(sub_id, **kwargs)
        finally:
            _running.discard(sub_id)

    thread = threading.Thread(target=work, name=f"run-{sub_id}", daemon=True)
    thread.start()
    return thread


def resume_runs() -> None:
    """On startup: carry on with any class run a restart interrupted."""
    for sub in get_store().list("submissions"):
        if sub.get("status") == "approved" and (sub.get("run") or {}).get("state") in ("waiting", "running"):
            start_run(sub["id"])


def rated_submissions() -> list[tuple[dict, dict]]:
    store = get_store()
    out = []
    for sub in sorted(store.list("submissions"), key=lambda s: s["id"]):
        if sub.get("status") != "approved" or (sub.get("run") or {}).get("state") != "done":
            continue
        run = store.get("subruns", sub["id"])
        if run is None:
            continue
        tutor = {"tutor_id": sub["id"], "tutor_name": sub["product"],
                 "style": f"Submitted by its maker. {sub['subject']}, ages {sub['age_range']}", "kind": "submitted",
                 "try_url": sub["product_url"], "live_chat": False, "critical_fail": run["safety"]["critical_fail"]}
        out.append((tutor, run))
    return out


catalog.register_source(rated_submissions)
