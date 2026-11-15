"""The 8-minute check, and how its answers become a learning profile (docs/DESIGN.md).

Quiz 1 -> 2-minute mini-lesson -> quiz 2 -> 2 reading passages -> English confidence.
No name, age or email. The check uses different numbers from the 10-question
test, so a classmate who does both isn't taught the test.
"""

from __future__ import annotations

import random
from dataclasses import dataclass

from . import config


@dataclass(frozen=True)
class Q:
    id: str
    text: str
    options: tuple[str, ...]
    answer: str


QUIZ_1 = (
    Q("c1", "Which fraction is the same as 1/3?", ("2/6", "1/6", "3/1", "2/3"), "2/6"),
    Q("c2", "3/10 + 4/10 = ?", ("7/10", "7/20", "1/10", "12/10"), "7/10"),
    Q("c3", "1/2 + 1/8 = ?", ("5/8", "2/10", "1/10", "2/8"), "5/8"),
    Q("c4", "Simplify 6/8.", ("3/4", "2/3", "6/4", "1/2"), "3/4"),
    Q("c5", "2/5 + 1/10 = ?", ("1/2", "3/15", "3/10", "1/5"), "1/2"),
)
MINI_LESSON = (
    "You can only add fractions when the bottom numbers (the denominators) match.",
    "To make them match, multiply the top and the bottom of a fraction by the same number. 1/2 is the same as 2/4.",
    "Then add the top numbers and keep the bottom number: 2/4 + 1/4 = 3/4.",
    "Last, simplify if you can: 2/4 is the same as 1/2.",
)
QUIZ_2 = (
    Q("c6", "Which fraction is the same as 2/5?", ("4/10", "2/10", "5/2", "4/5"), "4/10"),
    Q("c7", "2/7 + 4/7 = ?", ("6/7", "6/14", "2/7", "8/7"), "6/7"),
    Q("c8", "1/4 + 1/12 = ?", ("1/3", "2/16", "2/12", "1/16"), "1/3"),
    Q("c9", "Simplify 9/12.", ("3/4", "1/3", "9/4", "2/3"), "3/4"),
    Q("c10", "1/2 + 1/6 = ?", ("2/3", "2/8", "1/8", "2/6"), "2/3"),
)
READING = (
    ("p1", "Sam had a pizza cut into eight equal slices. He ate three slices. He gave two slices to his sister. "
           "The rest went in the fridge for later.",
     (Q("r1", "How many slices went in the fridge?", ("3", "2", "5", "8"), "3"),
      Q("r2", "Who did Sam give slices to?", ("His sister", "His friend", "His mum", "His teacher"), "His sister"))),
    ("p2", "Although Maya had practised her recipe carefully, she realised that the instructions were written for "
           "twelve people, whereas only four guests were expected. Consequently, she decided to use one third of "
           "every ingredient, which meant recalculating each quantity before she began.",
     (Q("r3", "Why did Maya change the recipe?", ("Fewer guests were coming", "She lost the instructions",
                                                  "She had no ingredients", "The guests were vegetarian"),
        "Fewer guests were coming"),
      Q("r4", "What share of each ingredient did she use?", ("One third", "One quarter", "Half",
                                                             "Twelve times as much"), "One third"))),
)
READING_QS = tuple(q for _, _, qs in READING for q in qs)
ENGLISH = {"id": "e1", "text": "How confident are you reading English?", "min": 1, "max": 5,
           "min_label": "Not at all", "max_label": "Very"}
SKIPPABLE = len(QUIZ_1) + len(QUIZ_2) + len(READING_QS)


def shuffled(q: Q) -> list[str]:
    """Options in a fixed shuffled order (seeded by the id), so the answer isn't always first."""
    options = list(q.options)
    random.Random(f"hivemind-{q.id}").shuffle(options)
    return options


def public(q: Q) -> dict:
    return {"id": q.id, "text": q.text, "options": shuffled(q)}


def public_check() -> dict:
    """GET /api/check: the questions without answers."""
    return {
        "minutes": config.CHECK_MINUTES,
        "quiz_1": [public(q) for q in QUIZ_1],
        "mini_lesson": list(MINI_LESSON),
        "mini_lesson_seconds": config.MINI_LESSON_SECONDS,
        "quiz_2": [public(q) for q in QUIZ_2],
        "reading": [{"id": pid, "passage": text, "questions": [public(q) for q in qs]} for pid, text, qs in READING],
        "english_question": dict(ENGLISH),
    }


def _right(questions, answers: dict) -> tuple[int, int]:
    """(right, skipped). A missing key or null counts as skipped."""
    answers = answers if isinstance(answers, dict) else {}
    right = sum(1 for q in questions if answers.get(q.id) is not None and str(answers[q.id]).strip() == q.answer)
    skipped = sum(1 for q in questions if answers.get(q.id) is None)
    return right, skipped


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def profile_from(body: dict) -> dict:
    """The check's answers -> the 5 profile numbers. See docs/DESIGN.md for each formula."""
    q1, s1 = _right(QUIZ_1, body.get("quiz_1"))
    q2, s2 = _right(QUIZ_2, body.get("quiz_2"))
    rd, s3 = _right(READING_QS, body.get("reading"))
    n = len(QUIZ_1)

    start = _clamp((q1 / n - config.CHECK_GUESS) / (1 - config.CHECK_GUESS), 0.0, 1.0)
    if q1 == n:
        speed = config.LEARN_SPEED_IF_PERFECT
    else:
        speed = _clamp((q2 - q1) / (n - q1), config.LEARN_SPEED_MIN, config.LEARN_SPEED_MAX)
    reading_age = int(config.READING_AGE_BASE + config.READING_AGE_PER_RIGHT * rd + 0.5)
    confidence = body.get("english_confidence")
    if isinstance(confidence, (int, float)) and not isinstance(confidence, bool) and 1 <= confidence <= 5:
        english = (confidence - 1) / 4
    else:
        english = config.ENGLISH_IF_SKIPPED
    persistence = _clamp(1 - (s1 + s2 + s3) / SKIPPABLE, config.PERSISTENCE_MIN, config.PERSISTENCE_MAX)
    return {"start_level": round(start, 2), "learn_speed": round(speed, 2), "reading_age": reading_age,
            "english": round(english, 2), "persistence": round(persistence, 2)}
