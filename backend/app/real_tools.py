"""Real EdTech tools (Kien's list), each linked to the demo tool type it most resembles.

Hivemind has NOT tested these products. A type's Safety, Usability and Learning
numbers never apply to them, so they carry no scores at all: only their type,
Kien's estimates from their public features (0 to 2, never called scores), the
subjects they are made for, and in a match, where their type ranked for the person.

The subject rules mirror frontend/src/data/tools.js (MADE_FOR, TOO_YOUNG,
SUBJECT_ONLY at commit f12bdec), so the website shows the same tools as before
when it switches to these fields.
"""

from __future__ import annotations

import json
import re
from functools import lru_cache

from . import catalog, config
from .students import get_student
from .tutors import TUTOR_INFO

ESTIMATE_KEYS = ("beginner", "stretch", "light_reading", "languages", "motivation", "guidance", "self_paced")

# Read from each tool's `kind`. First match wins; a kind that matches none is a general tool (every subject).
_SCIENCES = ["Physics", "Chemistry", "Biology", "Combined Science"]
MADE_FOR = (
    (re.compile(r"coding|computer science", re.I), ["Computer Science"]),
    (re.compile(r"maths|graphing|times tables", re.I), ["Maths", "Further Maths"]),
    (re.compile(r"physics", re.I), ["Physics", "Combined Science"]),
    (re.compile(r"science", re.I), _SCIENCES),
    (re.compile(r"language", re.I), ["Languages"]),
    (re.compile(r"reading|writing", re.I), ["English"]),
)
TOO_YOUNG = re.compile(r"times tables|game|uk schools", re.I)  # not for A level and IB courses
# Tools that don't fit the lab's own lesson (fractions, ages 11 to 14): made for one subject, or for older students.
NOT_LAB_LESSON = re.compile(r"language|coding|computer science|reading|writing|physics|science|a level|online courses|"
                            r"notes helper", re.I)
SUBJECT_MAX_CHARS = 40


def subjects_for(kind: str) -> list[str]:
    return next((list(subjects) for pattern, subjects in MADE_FOR if pattern.search(kind)), [])


@lru_cache(maxsize=1)
def _data() -> dict:
    data = json.loads(config.REAL_TOOLS_FILE.read_text(encoding="utf-8"))
    for tool in data["tools"]:
        if tool["group"] not in TUTOR_INFO:
            raise ValueError(f"real tool {tool['id']!r} has unknown type {tool['group']!r}")
        estimates = tool.get("estimates", {})
        if set(estimates) != set(ESTIMATE_KEYS) or any(v not in (0, 1, 2) for v in estimates.values()):
            raise ValueError(f"real tool {tool['id']!r} needs estimates {ESTIMATE_KEYS}, each 0 to 2")
        tool["subjects"] = subjects_for(tool["kind"])
        tool["for_advanced"] = not TOO_YOUNG.search(tool["kind"])
        tool["fits_lab_lesson"] = not NOT_LAB_LESSON.search(tool["kind"])
    return data


def _type(tutor_id: str) -> dict:
    return {"tutor_id": tutor_id, "tutor_name": TUTOR_INFO[tutor_id][0]}


def _public(tool: dict) -> dict:
    keep = ("id", "name", "url", "kind", "blurb", "most_used", "subjects", "for_advanced", "fits_lab_lesson")
    return {**{k: tool[k] for k in keep}, "type": _type(tool["group"]), "estimates": dict(tool["estimates"]),
            "estimates_note": _data()["estimates_note"]}


def clean_topic(topic) -> dict | None:
    """{"subject", "advanced"} or None. Anything unusable means no topic (the old behaviour)."""
    if not isinstance(topic, dict):
        return None
    subject = topic.get("subject")
    if not isinstance(subject, str) or not subject.strip() or len(subject.strip()) > SUBJECT_MAX_CHARS:
        return None
    return {"subject": subject.strip(), "advanced": topic.get("advanced") is True}


def fits(tool: dict, topic: dict | None) -> bool:
    """A tool made for one subject shows only for that subject; general tools show for every subject.
    Advanced (A level, IB) topics leave out tools made for younger students."""
    if topic is None:
        return True
    if topic["advanced"] and not tool["for_advanced"]:
        return False
    return not tool["subjects"] or topic["subject"].casefold() in {s.casefold() for s in tool["subjects"]}


def listing() -> dict:
    """GET /api/real-tools: every tool in Kien's order (the 12 most used first)."""
    data = _data()
    return {
        "note": data["note"],
        "estimates_note": data["estimates_note"],
        "types": [{**_type(t["tutor_id"]), "how": t["how"]} for t in data["types"]],
        "tools": [_public(t) for t in data["tools"]],
    }


def _ordered(places: dict, keep) -> list[dict]:
    data = _data()
    out = []
    for order, tool in enumerate(data["tools"]):
        place = places.get(tool["group"])
        if place is None or not keep(tool):
            continue
        out.append((place["rank"], order, {**_public(tool), "type_rank": place["rank"],
                                           "type_safety_concern": place["concern"],
                                           "estimated": True, "note": data["note"]}))
    return [item for *_, item in sorted(out, key=lambda x: (x[0], x[1]))]


def for_match(ranked: list[dict], topic: dict | None = None) -> list[dict]:
    """Real tools ordered by how their demo tool type ranked for this person.

    `ranked` already puts types with a safety concern last. Tools whose type isn't
    ranked (no class run yet, or not enough matches) are left out: we never guess.
    With a topic, tools made for other subjects are left out; the order stays the same.
    """
    places = {r["tutor_id"]: {"rank": r["rank"], "concern": r["safety_warning"] is not None}
              for r in ranked if r.get("kind") == "built_in"}
    return _ordered(places, lambda tool: fits(tool, topic))


def for_student(student_id: str, subject: str | None = None, advanced: bool = False) -> dict:
    """GET /api/real-tools?student=s07: real tools for one SIMULATED student (the Lab drawer).

    Types are ranked by the gain this student made with each demo tool, a type with a
    safety concern last (ties keep the lab order); inside a type, Kien's most-used order.
    Without a subject, only tools that fit the lab's own fractions lesson are listed.
    """
    student = get_student(student_id)  # KeyError if unknown
    rows = []
    for tutor, run in catalog.rated():
        if tutor["kind"] != "built_in":
            continue
        lesson = next((r for r in run["results"] if r["student_id"] == student.id), None)
        if lesson is not None:
            rows.append({"tutor_id": tutor["tutor_id"], "tutor_name": tutor["tutor_name"], "gain": lesson["gain"],
                         "outcome": lesson["outcome"], "concern": bool(run["safety"]["critical_fail"])})
    lab = list(config.LAB_ORDER)
    rows.sort(key=lambda r: (r["concern"], -r["gain"], lab.index(r["tutor_id"]) if r["tutor_id"] in lab else 99))
    for i, row in enumerate(rows, 1):
        row["rank"] = i
    topic = clean_topic({"subject": subject, "advanced": advanced}) if subject else None
    keep = (lambda tool: fits(tool, topic)) if topic else (lambda tool: tool["fits_lab_lesson"])
    tools = _ordered({r["tutor_id"]: r for r in rows}, keep)
    return {"student_id": student.id, "student_name": student.name, "topic": topic,
            "note": _data()["note"], "estimates_note": _data()["estimates_note"],
            "types": [{"tutor_id": r["tutor_id"], "tutor_name": r["tutor_name"], "rank": r["rank"], "gain": r["gain"],
                       "outcome": r["outcome"], "safety_concern": r["concern"]} for r in rows],
            "best": best_types(rows, tools),
            "tools": tools}


def best_types(rows: list[dict], tools: list[dict]) -> dict:
    """The demo tool type(s) that taught this student most, like the website's mostEffective().

    Types with a safety concern, or with no real tool left after the subject filter, don't count.
    none: true when even the best gain is 0. Ties (equal gain) are all named.
    """
    with_tools = {t["type"]["tutor_id"] for t in tools}
    pool = [r for r in rows if not r["concern"] and r["tutor_id"] in with_tools]
    if not pool:
        return {"tutor_ids": [], "gain": None, "none": False}
    top = max(r["gain"] for r in pool)
    if top <= 0:
        return {"tutor_ids": [], "gain": top, "none": True}
    return {"tutor_ids": [r["tutor_id"] for r in pool if r["gain"] == top], "gain": top, "none": False}


__all__ = ["listing", "for_match", "for_student", "clean_topic", "fits", "subjects_for", "ESTIMATE_KEYS"]
