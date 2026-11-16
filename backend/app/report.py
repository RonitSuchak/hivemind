"""The tool maker report: which kinds of students a tutor fails, why, and example chats (item 9)."""

from __future__ import annotations

from collections import Counter
from statistics import mean

from . import config
from .scores import normalised_gain
from .students import STUDENTS, TAG_LABELS, TAG_RULES, get_student

REASONS = ("safety", "gave_up", "too_hard_to_read", "gave_answer", "off_topic", "stuck", "finished_early")


def _reasons(lesson: dict) -> list[str]:
    found = []
    if any(e["critical"] and not e["passed"] for e in lesson["safety_events"]):
        found.append("safety")
    if lesson["gave_up"]:
        found.append("gave_up")
    found += [f for f in ("too_hard_to_read", "gave_answer", "off_topic", "stuck") if f in lesson["flags"]]
    tutor_turns = sum(m["from"] == "tutor" for m in lesson["transcript"])
    if lesson.get("problems_solved") == 3 and tutor_turns < config.LESSON_TURNS:
        found.append("finished_early")
    return found


def _reading(lessons: list[dict]) -> tuple[float, float]:
    ages = [m["reading_age"] for r in lessons for m in r["transcript"] if m["from"] == "tutor" and m["reading_age"]]
    readers = [get_student(r["student_id"]).effective_reading_age for r in lessons]
    return (mean(ages) if ages else 0.0), mean(readers)


def _reason_text(reason: str, lessons: list[dict]) -> str:
    n = len(lessons)
    count = sum(reason in _reasons(r) for r in lessons)
    if reason == "too_hard_to_read":
        tutor_age, reader_age = _reading(lessons)
        return f"Replies averaged reading age {tutor_age:.1f}; these students read at about {reader_age:.1f}."
    return {
        "safety": f"It failed a safety check with {count} of these {n} students.",
        "gave_up": f"{count} of these {n} students gave up before the end of the lesson.",
        "gave_answer": f"It gave the answer away to {count} of these {n} students, so they copied instead of learning.",
        "off_topic": f"It drifted off topic with {count} of these {n} students.",
        "stuck": f"{count} of these {n} students stayed stuck on one problem for several messages.",
        "finished_early": f"{count} of these {n} students solved all 3 problems early, so their lesson was short. "
                          f"A harder follow-up problem could stretch them.",
    }[reason]


def _example(lesson: dict, reason: str) -> dict:
    student = get_student(lesson["student_id"])
    return {"student_id": student.id, "name": student.name, "outcome": lesson["outcome"], "gain": lesson["gain"],
            "gave_up": lesson["gave_up"], "transcript": lesson["transcript"]}


def _norm(lessons: list[dict]) -> float:
    values = [g for r in lessons if (g := normalised_gain(r)) is not None]
    return mean(values) if values else 1.0


def report(tutor: dict, run: dict) -> dict:
    lessons = {r["student_id"]: r for r in run["results"]}
    class_avg = mean(r["gain"] for r in run["results"])
    class_norm = _norm(run["results"])
    below = []
    for tag in TAG_RULES:
        group = [lessons[s.id] for s in STUDENTS if tag in s.tags and s.id in lessons]
        if not group:
            continue
        avg = mean(r["gain"] for r in group)
        # Below average = learned less of what they could (normalised gain), so students
        # who start high and have little room to improve are not blamed on the tutor.
        if _norm(group) >= class_norm:
            continue
        counts = Counter(reason for r in group for reason in _reasons(r))
        main = max(REASONS, key=lambda x: (counts[x], -REASONS.index(x))) if counts else "stuck"
        if not counts:
            main = None
        shown = sorted(group, key=lambda r: (main not in _reasons(r) if main else 0, r["gain"]))
        below.append({
            "group": tag, "label": TAG_LABELS[tag], "size": len(group),
            "avg_gain": round(avg, 1), "gap": round(avg - class_avg, 1),
            "main_reason": main,
            "reason_text": _reason_text(main, group) if main else "No single cause stood out; these students "
                                                                  "had less room or time to improve.",
            "examples": [_example(r, main) for r in shown[: config.REPORT_EXAMPLES]],
        })
    below.sort(key=lambda g: g["gap"])
    return {
        "tutor_id": tutor["tutor_id"], "tutor_name": tutor["tutor_name"], "kind": tutor["kind"],
        "tested_on": run["tested_on"], "scores": run["scores"], "evidence": run["evidence"],
        "critical_fail": run["safety"]["critical_fail"], "safety": run["safety"],
        "class_avg_gain": round(class_avg, 1), "below_average": below[: config.REPORT_MAX_GROUPS],
        "message": None if below else "No group did worse than the class average with this tool.",
    }
