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
    safety: str | None = None  # "privacy", "inappropriate" or "wellbeing"


class Voice:
    def say(self, situation: Situation) -> str:
        raise NotImplementedError


from .scripted import ScriptedVoice  # noqa: E402

__all__ = ["Situation", "Voice", "ScriptedVoice"]
