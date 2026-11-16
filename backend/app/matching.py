"""Weighted match: a real person's profile -> the 5 nearest simulated students -> ranked tutors.

  1. 5 profile numbers, each 0 to 1 (reading age: (age - 6) / 9, clamped).
  2. Distance = straight-line (Euclidean) distance between the two sets of 5 numbers.
  3. Nearest 5; weight = 1 / (distance + 0.05), scaled to sum to 1.
  4. Predicted gain per tutor = weighted average of those 5 students' gains with it.
  5. Tutors with a critical safety fail go last, with a warning.
  6. If nobody is close enough, no ranking: we say so instead of guessing.
"""

from __future__ import annotations

import math
import secrets

from . import config
from .students import STUDENTS, radar

PROFILE_KEYS = ("start_level", "learn_speed", "reading_age", "english", "persistence")


def valid_profile(profile) -> dict | None:
    """The 5 numbers, checked and cleaned, or None if anything is missing or out of range."""
    if not isinstance(profile, dict):
        return None
    out = {}
    for key in PROFILE_KEYS:
        value = profile.get(key)
        if isinstance(value, bool) or not isinstance(value, (int, float)) or math.isnan(value):
            return None
        low, high = (3, 20) if key == "reading_age" else (0, 1)
        if not low <= value <= high:
            return None
        out[key] = float(value)
    return out


def profile_radar(profile: dict) -> dict:
    return {k: round(v, 2) for k, v in radar(profile["start_level"], profile["learn_speed"], profile["reading_age"],
                                             profile["english"], profile["persistence"]).items()}


def _vec(r: dict) -> list[float]:
    return [r["start_level"], r["learn_speed"], r["reading"], r["english"], r["persistence"]]


def _round_to_one(weights: list[float], places: int = 3) -> list[float]:
    """Round so the shown weights still sum to exactly 1 (largest remainder)."""
    scale = 10**places
    floors = [math.floor(w * scale) for w in weights]
    left = scale - sum(floors)
    order = sorted(range(len(weights)), key=lambda i: -(weights[i] * scale - floors[i]))
    for i in order[:left]:
        floors[i] += 1
    return [f / scale for f in floors]


def nearest(profile: dict) -> list[dict]:
    me = _vec(radar(profile["start_level"], profile["learn_speed"], profile["reading_age"],
                    profile["english"], profile["persistence"]))
    ranked = sorted(STUDENTS, key=lambda s: (math.dist(me, _vec(s.radar)), s.id))[: config.MATCH_K]
    distances = [math.dist(me, _vec(s.radar)) for s in ranked]
    raw = [1 / (d + config.MATCH_WEIGHT_OFFSET) for d in distances]
    weights = _round_to_one([w / sum(raw) for w in raw])
    return [{"student_id": s.id, "name": s.name, "distance": round(d, 3), "weight": w,
             "radar": {k: round(v, 2) for k, v in s.radar.items()}}
            for s, d, w in zip(ranked, distances, weights)]


def enough(matches: list[dict]) -> bool:
    distances = [m["distance"] for m in matches]
    return distances[0] <= config.MATCH_MAX_NEAREST and sum(distances) / len(distances) <= config.MATCH_MAX_MEAN


def _why(tutor: dict, lessons: list[tuple[dict, float]], predicted: float, warning: str | None) -> str:
    def share(test):
        return sum(w for lesson, w in lessons if test(lesson))
    hard, gave_up = share(lambda r: "too_hard_to_read" in r["flags"]), share(lambda r: r["gave_up"])
    answers, chat = share(lambda r: "gave_answer" in r["flags"]), share(lambda r: "off_topic" in r["flags"])
    if warning:
        base = "it chatted more than it taught" if chat >= 0.5 else "it can still teach"
        return f"It failed a safety check in our tests, so it is shown last ({base})."
    if hard >= 0.5 and predicted >= 2:
        return "Good questions, but many replies were wordy for this profile."
    if hard >= 0.5:
        return "Replies were too hard to read for this profile."
    if gave_up >= 0.4:
        return "Several students like you gave up before the end."
    if answers >= 0.5:
        return "It gave the answers, so little was learned."
    if chat >= 0.5:
        return "Friendly, but it chatted more than it taught."
    if predicted >= 2.5:
        return "Clear replies and questions that made students like you think."
    if predicted >= 1:
        return "Students like you learned a little with it."
    return "Students like you learned very little with it."


def safety_warning(run: dict) -> str | None:
    if not run["safety"]["critical_fail"]:
        return None
    event = next((e for r in run["results"] for e in r["safety_events"] if e["critical"] and not e["passed"]), None)
    return f"{event['reason'] if event else 'Failed a safety check.'} Needs review."


def rank(matches: list[dict], rated: list[tuple[dict, dict]]) -> list[dict]:
    weights = {m["student_id"]: m["weight"] for m in matches}
    rows = []
    for tutor, run in rated:
        lessons = [(r, weights[r["student_id"]]) for r in run["results"] if r["student_id"] in weights]
        total = sum(w for _, w in lessons)
        predicted = round(sum(r["gain"] * w for r, w in lessons) / total, 1) if total else 0.0
        warning = safety_warning(run)
        rows.append({"tutor_id": tutor["tutor_id"], "tutor_name": tutor["tutor_name"], "kind": tutor["kind"],
                     "predicted_gain": predicted, "scores": run["scores"], "safety_warning": warning,
                     "why": _why(tutor, lessons, predicted, warning), "try_url": tutor["try_url"]})
    rows.sort(key=lambda row: (row["safety_warning"] is not None, -row["predicted_gain"], row["tutor_id"]))
    for i, row in enumerate(rows, 1):
        row["rank"] = i
    return [{"rank": r.pop("rank"), **r} for r in rows]


def new_match_id() -> str:
    return "m_" + secrets.token_urlsafe(6)


def match(profile: dict, rated: list[tuple[dict, dict]]) -> dict:
    """Everything POST /api/match returns except follow_ups (see advisor.py)."""
    matches = nearest(profile)
    ok = enough(matches)
    n_tutors = len(rated)
    return {
        "match_id": new_match_id(),
        "enough_matches": ok,
        "profile": {k: (int(v) if k == "reading_age" and float(v).is_integer() else v) for k, v in profile.items()},
        "radar": profile_radar(profile),
        "matches": matches,
        "ranked": rank(matches, rated) if ok else [],
        "message": None if ok else (
            f"None of our {len(STUDENTS)} simulated students are close enough to your profile to give a fair "
            "answer, so we won't guess. Your result helps us decide which students to add next."),
        "note": (f"Advice from {config.MATCH_K} simulated students with a similar profile, not real children. "
                 f"{n_tutors} tools tested.") if ok else "Advice from simulated students, not real children.",
    }
