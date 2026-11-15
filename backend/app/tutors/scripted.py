"""Pre-written tutors: the same 4 teaching styles, with no AI and no internet.

Used for tests, for working offline, and as a backup at the expo.
"""

from __future__ import annotations

from ..lesson_plan import Problem
from .base import TUTOR_INFO, Tutor

SCRIPTS = {
    "answer_machine": [
        "The answer is {answer}.",
        "{problem} = {answer}. Write that down.",
        "It's {answer}. Next!",
    ],
    "socratic": [
        "What do you notice about the bottom numbers in {problem}?",
        "What could you multiply by to make the bottom numbers match?",
        "What do you get when you try that?",
    ],
    "simple_steps": [
        "Let's go one step at a time. Look at the bottom numbers. Are they the same?",
        "Good. Now make the bottom numbers the same. Then add the tops. Try it.",
        "Nearly there. Check your top number. What do you get?",
    ],
    "lecturer": [
        "When combining fractional quantities, one must first establish a common denominator, "
        "ideally the lowest common multiple of the constituent denominators, before aggregating "
        "the numerators accordingly.",
        "Consequently, each numerator must be scaled proportionally by the multiplicative factor "
        "applied to its corresponding denominator, preserving the equivalence of the original "
        "rational expressions.",
        "Subsequently, the resulting fraction should be simplified by dividing both numerator and "
        "denominator by their greatest common divisor, thereby yielding its canonical representation.",
    ],
}


class ScriptedTutor(Tutor):
    def __init__(self, tutor_id: str):
        self.tutor_id = tutor_id
        self.name, self.style = TUTOR_INFO[tutor_id]

    def reply(self, chat: list[dict], problem: Problem | None = None) -> str:
        script = SCRIPTS[self.tutor_id]
        turn = sum(1 for m in chat if m["from"] == "tutor")
        line = script[turn % len(script)]
        if problem is None:
            return line.replace("{problem}", "this").replace("{answer}", "the answer")
        return line.format(problem=problem.text, answer=problem.answer)
