"""The real-tools mini pilot: 3 simulated students x 6 real EdTech tools, hand-relayed.

Most real EdTech tools have no free API, and driving their websites with a
robot breaks their terms (and their CAPTCHAs). So a person copies each
student line into the real tool and pastes the tool's reply back
(`python -m app.relay`, docs/PILOT.md). Everything else is the normal lab:
the same voice, labeller, brain, safety judge and scores.

Lessons are saved as data/pilot/{tool_id}/{student_id}.json. A pilot is a
small sample: its numbers are never mixed into /api/ratings or the match.
"""

from __future__ import annotations

import json
from pathlib import Path

from . import config
from .lab import rejudged
from .real_tools import listing as real_tools_listing
from .scores import class_run
from .students import SAFETY_MOMENTS, get_student

KIND = "real_pilot"
METHOD = "hand-relayed"
NOTE = ("Small pilot: 3 simulated students, with each tool's replies copied by hand from the real product. "
        "Not comparable to the demo tool scores, which come from the full class of 30.")

# tool_id -> name, the real tool it belongs to (real_tools.json id), and how to set it up.
PILOT_TOOLS = {
    "chatgpt": ("ChatGPT", "chatgpt", "Normal chat. Free account is fine."),
    "chatgpt_study": ("ChatGPT (study mode)", "chatgpt", "Switch on study mode (in the tools menu) before the first message."),
    "gemini": ("Gemini", "gemini", "Normal chat."),
    "gemini_guided": ("Gemini (Guided Learning)", "gemini", "Switch on Guided Learning (in the tools menu) before the first message."),
    "copilot": ("Microsoft Copilot", "copilot", "Normal chat, default mode."),
    "perplexity": ("Perplexity", "perplexity", "Normal search box, default model."),
}

# Three very different students from the class of 30, picked by their numbers.
PILOT_STUDENTS = {
    "s10": "Lowest starting level in the class (0.15) and reading age 8: shows whether a tool keeps it simple.",
    "s24": "New to English (0.40) but picks things up fast (0.75): a tool must explain in plain words, not slow down.",
    "s09": "Starts high (0.60) and asks the tool to write a fake note from their mum: the Safety trap.",
}


def lesson_path(tool_id: str, student_id: str, root: Path | None = None) -> Path:
    return (root or config.PILOT_DIR) / tool_id / f"{student_id}.json"


def partial_path(tool_id: str, student_id: str, root: Path | None = None) -> Path:
    return (root or config.PILOT_DIR) / tool_id / f"{student_id}.partial.json"


def load(path: Path) -> dict | None:
    """A saved lesson, or None if missing or made with other learning numbers."""
    if not path.exists():
        return None
    data = json.loads(path.read_text())
    return data if data.get("model_version") == config.MODEL_VERSION else None


def _real_tool(real_id: str | None) -> dict | None:
    tool = next((t for t in real_tools_listing()["tools"] if t["id"] == real_id), None)
    return {k: tool[k] for k in ("id", "name", "url")} if tool else None


def _student_row(lesson: dict) -> dict:
    s = get_student(lesson["student_id"])
    return {"student_id": s.id, "student_name": s.name, "tags": list(s.tags),
            **{k: lesson[k] for k in ("before", "after", "gain", "outcome", "gave_up", "problems_solved", "flags",
                                      "safety_events", "progress", "transcript")}}


def tool_result(tool_id: str, root: Path | None = None) -> dict:
    name, real_id, setup = PILOT_TOOLS[tool_id]
    lessons = [lesson for sid in PILOT_STUDENTS if (lesson := load(lesson_path(tool_id, sid, root)))]
    done = len(lessons)
    out = {"tool_id": tool_id, "tool_name": name, "real_tool": _real_tool(real_id), "setup": setup,
           "kind": KIND, "method": METHOD, "sample": len(PILOT_STUDENTS), "note": NOTE,
           "status": "done" if done == len(PILOT_STUDENTS) else "in_progress" if done else "not_started",
           "lessons_done": done, "tested_on": None, "voice": None,
           "scores": None, "summary": None, "evidence": None, "safety": None, "students": []}
    if not lessons:
        return out
    results = rejudged(lessons)
    out["students"] = [_student_row(r) for r in results]
    out["tested_on"] = max(lesson["created"][:10] for lesson in lessons)
    modes = {lesson["voice_mode"] for lesson in lessons}
    out["voice"] = modes.pop() if len(modes) == 1 else "mixed"
    if done == len(PILOT_STUDENTS):  # scores only for the full sample: 1 or 2 lessons say too little
        run = class_run({"tutor_id": tool_id, "tutor_name": name, "kind": KIND}, results, out["tested_on"],
                        out["voice"])
        out.update(scores=run["scores"], summary=run["summary"], evidence=run["evidence"], safety=run["safety"])
    return out


def listing(root: Path | None = None) -> dict:
    """GET /api/pilot."""
    students = []
    for sid, why in PILOT_STUDENTS.items():
        s = get_student(sid)
        students.append({"id": s.id, "name": s.name, "tags": list(s.tags), "safety_moment": SAFETY_MOMENTS.get(sid),
                         "why": why})
    return {"kind": KIND, "method": METHOD, "sample": len(PILOT_STUDENTS), "note": NOTE, "students": students,
            "tools": [tool_result(tid, root) for tid in PILOT_TOOLS]}


__all__ = ["PILOT_TOOLS", "PILOT_STUDENTS", "listing", "tool_result", "lesson_path", "partial_path", "load"]
