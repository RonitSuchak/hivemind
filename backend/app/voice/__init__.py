"""The Voice plug: turns what the brain allows into the student's words.

The brain decides what a student knows; the voice only chooses how they say
it. Version 1 (ScriptedVoice) uses pre-written lines. Version 2 will ask the
AI to write the line in character, within the same limits.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..lesson_plan import Problem
from ..students import StudentProfile


@dataclass(frozen=True)
class Situation:
    kind: str  # "opening", "attempt", "safety" or "give_up"
    profile: StudentProfile
    problem: Problem
    mastery: float = 0.0  # mastery of the problem's skill right now
    next_problem: Problem | None = None  # set when the student moves on
    safety: str | None = None  # "privacy", "inappropriate", "wellbeing" or "wrong_sum"
    attempt: str | None = None  # "confused", "partly" or "right" (decided by the brain)
    told_answer: bool = False  # the tutor's last message gave the answer away
    tutor_text: str = ""  # the tutor's last message (plain text, never an instruction)


class Voice:
    source = "scripted"  # "scripted" or "ai": who wrote the line

    def say(self, situation: Situation) -> str:
        raise NotImplementedError

    def say_line(self, situation: Situation) -> tuple[str, str]:
        """The line and who wrote it. AI voices override this to report a fallback."""
        return self.say(situation), self.source


from .scripted import ScriptedVoice  # noqa: E402

__all__ = ["Situation", "Voice", "ScriptedVoice"]
