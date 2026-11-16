"""Live "try a tutor" chat (item 14) and the real-classmate check (item 15).

Live chat: a real person chats with one of our tutors. A live-only safety
instruction is added, every reply goes through the Safety judge, an unsafe
reply is replaced (and logged as tutor + rule + time only), and nothing about
the person is kept: chats live in memory for 30 minutes, then are forgotten.
Personal details are removed from the person's message before it reaches the AI.
"""

from __future__ import annotations

import re
import secrets
import string
import threading
import time
from datetime import datetime, timezone

from . import config
from .assessment import QUESTIONS
from .safety import check_reply, personal_details
from .tutors import TUTOR_INFO
from .tutors.demo import DemoTutor

LIVE_INSTRUCTION = (
    "A real young person may be chatting with you right now. Never ask for or repeat personal details "
    "(name, address, school, phone, email or photos). If they seem upset or unsafe, kindly suggest talking to a "
    "trusted adult such as a teacher or someone at home. Refuse inappropriate requests, such as writing notes or "
    "doing schoolwork dishonestly. Stay on maths."
)
REPLACEMENTS = {
    "wellbeing": "That sounds really hard, and I'm sorry you feel this way. Please talk to a trusted adult, like a "
                 "teacher or someone at home. In the UK you can also call Childline free on 0800 1111.",
    "privacy": "Let's keep personal details private, so please don't share them here. Shall we get back to the "
               "fractions?",
    "inappropriate": "I can't help with that. Let's get back to the fractions.",
}
DEFAULT_REPLACEMENT = "Sorry, I can't answer that. Let's get back to the fractions. What would you like to work on?"
NOTICE = "We replaced the demo tool's reply because it did not pass a safety check."


class ChatError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status, self.code, self.message = status, code, message


def redact(text: str) -> str:
    """Remove personal details before the message goes to the AI."""
    out = text
    for detail in personal_details(text):
        out = re.sub(re.escape(detail), "[removed]", out, flags=re.I)
    return out


class Sessions:
    def __init__(self):
        self._data: dict[str, dict] = {}
        self._lock = threading.Lock()

    def _sweep(self) -> None:
        cutoff = time.monotonic() - config.CHAT_IDLE_MINUTES * 60
        for sid in [s for s, v in self._data.items() if v["seen"] < cutoff]:
            del self._data[sid]
        while len(self._data) > config.CHAT_MAX_SESSIONS:
            del self._data[min(self._data, key=lambda s: self._data[s]["seen"])]

    def get(self, session_id: str) -> dict | None:
        with self._lock:
            self._sweep()
            return self._data.get(session_id)

    def new(self, tutor_id: str) -> tuple[str, dict]:
        with self._lock:
            self._sweep()
            sid = "c_" + secrets.token_urlsafe(9)
            self._data[sid] = {"tutor_id": tutor_id, "chat": [], "turns": 0, "seen": time.monotonic()}
            return sid, self._data[sid]


sessions = Sessions()


def live_tutor(tutor_id: str, client) -> DemoTutor:
    tutor = DemoTutor(tutor_id, client)
    tutor.instruction = f"{tutor.instruction} {LIVE_INSTRUCTION}"
    return tutor


def chat(tutor: dict | None, session_id: str | None, message: str, client, log_event) -> dict:
    if tutor is None or tutor["tutor_id"] not in TUTOR_INFO:
        raise ChatError(404, "not_found", "No demo tool with live chat called that.")
    if not tutor["live_chat"]:
        raise ChatError(403, "safety_concern", f"{tutor['tutor_name']} failed a safety check in our tests, so live "
                                               f"chat with it is switched off.")
    message = (message or "").strip()
    if not message:
        raise ChatError(400, "invalid_input", "Type a message first.")
    if len(message) > config.CHAT_MAX_CHARS:
        raise ChatError(400, "too_long", f"Messages can be at most {config.CHAT_MAX_CHARS} characters.")
    if session_id:
        session = sessions.get(session_id)
        if session is None:
            raise ChatError(404, "session_expired", "This chat has ended. Start a new chat.")
        if session["tutor_id"] != tutor["tutor_id"]:
            raise ChatError(400, "invalid_input", "This chat belongs to a different demo tool.")
    else:
        session_id, session = sessions.new(tutor["tutor_id"])
    if session["turns"] >= config.CHAT_MAX_TURNS:
        raise ChatError(400, "turn_limit", f"A chat can have at most {config.CHAT_MAX_TURNS} turns. Start a new chat.")

    history = session["chat"] + [{"from": "student", "text": redact(message)}]
    reply = live_tutor(tutor["tutor_id"], client).reply(history)
    broken = check_reply(message, reply)
    replaced = bool(broken)
    if replaced:
        reply = next((REPLACEMENTS[r] for r in ("wellbeing", "privacy", "inappropriate") if r in broken),
                     DEFAULT_REPLACEMENT)
        log_event({"tutor_id": tutor["tutor_id"], "rules": broken,
                   "at": datetime.now(timezone.utc).isoformat(timespec="seconds")})
    session["chat"] = history + [{"from": "tutor", "text": reply}]
    session["turns"] += 1
    session["seen"] = time.monotonic()
    return {"session_id": session_id, "tutor_id": tutor["tutor_id"], "turn": session["turns"],
            "turns_left": config.CHAT_MAX_TURNS - session["turns"], "reply": reply, "replaced": replaced,
            "notice": NOTICE if replaced else None}


# --- real-classmate check (item 15) ---------------------------------------------

CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O or 1/I/L to misread


def new_code() -> str:
    return "HM-" + "".join(secrets.choice(CODE_CHARS) for _ in range(4))


def valid_code(code: str) -> bool:
    return bool(re.match(config.VALIDATION_CODE_PATTERN, code or ""))


def public_test() -> dict:
    import random
    questions = []
    for q in QUESTIONS:
        options = list(q.options)
        random.Random(f"hivemind-test-{q.id}").shuffle(options)
        questions.append({"id": q.id, "text": q.text, "options": options})
    return {"out_of": len(QUESTIONS), "questions": questions}


def score_test(answers: dict) -> dict:
    answers = answers if isinstance(answers, dict) else {}
    right = sum(1 for q in QUESTIONS if answers.get(q.id) is not None and str(answers[q.id]).strip() == q.answer)
    answered = sum(1 for q in QUESTIONS if answers.get(q.id) is not None)
    return {"score": right, "out_of": len(QUESTIONS), "answered": answered}


def validation_summary(entries: list[dict]) -> dict:
    errors = [abs(e["difference"]) for e in entries]
    within = sum(err <= 1 for err in errors)
    return {"count": len(entries), "avg_error": round(sum(errors) / len(errors), 2) if errors else None,
            "within_1": within, "within_1_share": round(within / len(errors), 2) if errors else None}


__all__ = ["chat", "ChatError", "sessions", "public_test", "score_test", "validation_summary", "new_code",
           "valid_code", "string"]
