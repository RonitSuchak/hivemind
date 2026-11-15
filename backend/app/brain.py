"""The student's brain: what a simulated student actually knows.

Learning is decided here by maths, never by the AI. An AI model already
knows fractions, so if it decided what a student learned, every tutor would
look good. This model makes learning depend on the quality of the teaching,
and every number in it can be explained.

The model is a simple form of Bayesian Knowledge Tracing (Corbett and
Anderson, 1995). For each skill the student has a "mastery" number from
0 to 1. Each tutor message gives a chance of learning that skill:

    new mastery = mastery + (1 - mastery) * chance

The chance depends on the kind of message (a hint teaches more than being
handed the answer), on the student's learning speed, and on whether the
message is too hard for them to read.

We use the expected value of learning instead of rolling dice, so a lesson
always gives the same result. Randomness only appears in the test
(see assessment.py), and that is seeded.
"""

from __future__ import annotations

from enum import Enum

from .students import StudentProfile

SKILLS = ("equivalent", "add_same", "add_different")

# Equivalent fractions are easiest, adding with different bottoms is hardest.
SKILL_OFFSET = {"equivalent": 0.15, "add_same": 0.05, "add_different": -0.15}

MIN_MASTERY, MAX_MASTERY = 0.02, 0.98


class Move(str, Enum):
    """What kind of teaching a tutor message was. Set by the labeller."""

    GAVE_ANSWER = "gave_answer"
    HINT = "hint"
    QUESTION = "question"
    EXPLANATION = "explanation"
    ENCOURAGEMENT = "encouragement"
    OFF_TOPIC = "off_topic"


# Base chance that one message of each kind teaches the skill.
LEARN_CHANCE = {
    Move.GAVE_ANSWER: 0.03,  # copying an answer teaches very little
    Move.HINT: 0.20,
    Move.QUESTION: 0.22,  # being made to think teaches most
    Move.EXPLANATION: 0.12,
    Move.ENCOURAGEMENT: 0.0,
    Move.OFF_TOPIC: 0.0,
}

# A message more than this many years above the student's reading age is too hard.
READING_LEEWAY = 1.0
TOO_HARD_FACTOR = 0.5  # too-hard messages teach half as much


def _clamp(value: float) -> float:
    return max(MIN_MASTERY, min(MAX_MASTERY, value))


class Brain:
    """One student's knowledge and patience during one lesson."""

    def __init__(self, profile: StudentProfile):
        self.profile = profile
        self.mastery = {skill: _clamp(profile.start_level + SKILL_OFFSET[skill]) for skill in SKILLS}
        self.frustrating_turns = 0
        self.gave_up = False
        self.history = [self.knowledge]  # knowledge after each message, for the animation

    @property
    def knowledge(self) -> float:
        """Overall knowledge: the average mastery across the skills (0 to 1)."""
        return sum(self.mastery.values()) / len(self.mastery)

    @property
    def patience(self) -> int:
        """How many frustrating messages in a row before giving up (1 to 5)."""
        return 1 + round(self.profile.persistence * 4)

    def is_too_hard(self, reading_age: float | None) -> bool:
        if reading_age is None:
            return False
        return reading_age > self.profile.effective_reading_age + READING_LEEWAY

    def hear(self, move: Move, skill: str | None = None, reading_age: float | None = None) -> float:
        """Update the brain after one tutor message. Returns the knowledge gained.

        move: what kind of message it was.
        skill: which skill it taught, or None if it taught none.
        reading_age: how hard the message is to read, in years (None = not measured).
        """
        if self.gave_up:
            self.history.append(self.knowledge)
            return 0.0

        before = self.knowledge
        too_hard = self.is_too_hard(reading_age)

        chance = LEARN_CHANCE[move] * (0.5 + self.profile.learn_speed)
        if too_hard:
            chance *= TOO_HARD_FACTOR
        if skill is not None and chance > 0:
            mastery = self.mastery[skill]
            self.mastery[skill] = _clamp(mastery + (1 - mastery) * chance)

        # Messages the student can't read, or that go off topic, wear down their patience.
        frustrating = too_hard or move is Move.OFF_TOPIC
        self.frustrating_turns = self.frustrating_turns + 1 if frustrating else 0
        if self.frustrating_turns >= self.patience:
            self.gave_up = True

        self.history.append(self.knowledge)
        return self.knowledge - before
