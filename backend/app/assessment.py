"""The 10-question fractions test every student sits before and after a lesson.

A student's answers come from their brain, never from the AI. For each
question the chance of being right is:

    mastery of that skill * (1 - SLIP) + (1 - mastery) * GUESS

GUESS is a lucky guess (4 options, so 1 in 4). SLIP is a careless mistake
even when the student knows it.

Fair dice ("common random numbers"): a student uses the same dice, seeded
with their id, for the test before and after, and with every tutor. Mastery
only ever goes up, so any question they got right before is still right
after. That means:
  - differences between tutors come only from the teaching, not from luck;
  - the gain can never be negative.
"""

from __future__ import annotations

import random
from dataclasses import dataclass

from .brain import Brain

GUESS = 0.25
SLIP = 0.10


@dataclass(frozen=True)
class Question:
    id: str
    text: str
    options: tuple[str, ...]
    answer: str
    skill: str


QUESTIONS: tuple[Question, ...] = (
    Question("q1", "Which fraction is the same as 1/2?", ("2/4", "1/3", "2/3", "3/2"), "2/4", "equivalent"),
    Question("q2", "Which fraction is the same as 3/4?", ("6/8", "3/8", "4/3", "6/4"), "6/8", "equivalent"),
    Question("q3", "Simplify 4/6.", ("2/3", "1/2", "4/3", "3/2"), "2/3", "equivalent"),
    Question("q4", "1/5 + 2/5 = ?", ("3/5", "3/10", "2/5", "1/5"), "3/5", "add_same"),
    Question("q5", "3/8 + 1/8 = ?", ("1/2", "4/16", "3/8", "1/4"), "1/2", "add_same"),
    Question("q6", "2/7 + 3/7 = ?", ("5/7", "5/14", "6/7", "1/7"), "5/7", "add_same"),
    Question("q7", "1/2 + 1/4 = ?", ("3/4", "2/6", "1/6", "2/4"), "3/4", "add_different"),
    Question("q8", "1/3 + 1/6 = ?", ("1/2", "2/9", "2/6", "1/9"), "1/2", "add_different"),
    Question("q9", "2/3 + 1/4 = ?", ("11/12", "3/7", "3/12", "8/12"), "11/12", "add_different"),
    Question("q10", "1/2 + 1/3 = ?", ("5/6", "2/5", "1/6", "2/6"), "5/6", "add_different"),
)


@dataclass(frozen=True)
class TestResult:
    score: int  # out of 10
    correct: dict[str, bool]  # question id -> right or wrong


def chance_correct(brain: Brain, question: Question) -> float:
    mastery = brain.mastery[question.skill]
    return mastery * (1 - SLIP) + (1 - mastery) * GUESS


def expected_score(brain: Brain) -> float:
    """The average score this brain would get over many tries (no dice)."""
    return sum(chance_correct(brain, q) for q in QUESTIONS)


def sit_test(brain: Brain, seed: str | None = None) -> TestResult:
    """Sit the test once. The same seed always gives the same dice.

    Leave seed empty to use the student's id: the fair default described above.
    """
    dice = random.Random(seed if seed is not None else brain.profile.id)
    correct = {q.id: dice.random() < chance_correct(brain, q) for q in QUESTIONS}
    return TestResult(score=sum(correct.values()), correct=correct)
