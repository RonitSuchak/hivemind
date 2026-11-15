"""The problems a simulated lesson works through.

They use different numbers from the test, so a tutor can't just teach the test.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Problem:
    text: str
    operands: tuple[str, ...]  # fractions written in the problem itself
    answer: str
    mistake: str  # the most common wrong answer (adding tops and bottoms)
    skill: str


PROBLEMS: tuple[Problem, ...] = (
    Problem("2/3 = ?/6", ("2/3",), "4/6", "2/6", "equivalent"),
    Problem("2/9 + 4/9", ("2/9", "4/9"), "6/9", "6/18", "add_same"),
    Problem("1/4 + 1/8", ("1/4", "1/8"), "3/8", "2/12", "add_different"),
)
