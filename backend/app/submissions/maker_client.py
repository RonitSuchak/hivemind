"""Talks to a maker's tutor endpoint (docs/BACKEND.md section 6), and the WebTutor plug for class runs."""

from __future__ import annotations

import json
import re

from .. import config
from ..tutors.base import Tutor
from .links import LinkError, post_json

HTML = re.compile(r"<\s*[a-zA-Z!/]")


def ask_tutor(url: str, messages: list[dict], post=post_json) -> dict:
    """{"reply", "seconds", "code"}. Raises LinkError with a plain reason."""
    response = post(url, {"messages": messages})
    if len(response["body"]) > config.MAKER_MAX_RESPONSE_BYTES:
        raise LinkError("responds", "The reply was too big.")
    if response["status"] != 200:
        raise LinkError("responds", f"The tutor answered with an error (HTTP {response['status']}).")
    try:
        data = json.loads(response["body"].decode("utf-8"))
    except (UnicodeDecodeError, ValueError):
        raise LinkError("responds", 'The reply wasn\'t JSON like {"reply": "..."}.') from None
    reply = data.get("reply") if isinstance(data, dict) else None
    if not isinstance(reply, str) or not reply.strip():
        raise LinkError("responds", 'The reply had no "reply" text.')
    if len(reply) > config.MAKER_MAX_REPLY_CHARS:
        raise LinkError("responds", f"The reply was over {config.MAKER_MAX_REPLY_CHARS:,} characters.")
    if HTML.search(reply):
        raise LinkError("responds", "The reply must be plain text, not HTML.")
    code = data.get("hivemind_code")
    return {"reply": reply.strip(), "seconds": response["seconds"], "code": code if isinstance(code, str) else None}


class WebTutor(Tutor):
    """A submitted product, taught the class like any tutor. Its words are plain text only."""

    def __init__(self, tutor_id: str, name: str, url: str, post=post_json):
        self.tutor_id, self.name, self.style, self.url, self.post = tutor_id, name, "Submitted product", url, post

    def reply(self, chat: list[dict], problem=None) -> str:
        messages = [{"role": "student" if m["from"] == "student" else "tutor", "text": m["text"]} for m in chat]
        return ask_tutor(self.url, messages, self.post)["reply"]
