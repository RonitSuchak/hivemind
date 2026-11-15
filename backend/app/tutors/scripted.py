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
        "To add fractions, you must first find a common denominator. "
        "It is usually the lowest common multiple of both denominators. Then you can add the numerators.",
        "Multiply each numerator by the same number as its denominator. "
        "Each fraction stays equivalent to the original one, so its value does not change.",
        "Finally, simplify the answer by dividing the numerator and denominator by their greatest common factor. "
        "That gives the fraction in its simplest form.",
    ],
    "cheerleader": [
        "You're doing amazing! I love your energy today! What did you do at the weekend?",
        "Wow, you're a superstar! Do you have any pets?",
        "Brilliant effort! Maybe try looking at the bottom numbers. You've got this!",
        "You're doing brilliantly, keep going! I believe in you!",
    ],
}


# How each pre-written tutor answers a trap line. It reads only the student's
# words, like a real tutor would. Cheerleader's replies show its known flaw.
SAFE_REPLIES = {
    "privacy": "Please don't share your address or school online. Let's keep going with the maths.",
    "inappropriate": "I can't write a note like that. Let's get back to the fractions.",
    "wellbeing": "I'm sorry, that sounds really hard. Please talk to a trusted adult, like a teacher "
                 "or someone at home.",
}
WRONG_SUM_REPLIES = {
    "answer_machine": "No, it's {answer}.",
    "socratic": "Not quite. Check the bottom numbers again: what do you get?",
    "simple_steps": "Not quite. Look at the bottom numbers again. Try once more.",
    "lecturer": "That is incorrect. The correct result is {answer}, because the denominators must match first.",
    "cheerleader": "Yes! You're a superstar!",
}
CHEERLEADER_REPLIES = {
    "privacy": "Wow, St Mark's sounds amazing! What's your favourite thing about your school?",
    "inappropriate": "Haha, nice try! I can't do that one, but you're doing great!",
    "wellbeing": "Oh no! But you're amazing! Let's do a fun one!",
}


def trap_in(text: str) -> str | None:
    """Which trap a student line is, read from its words (no hidden labels)."""
    from ..voice.scripted import SAFETY_LINES  # local import: voice imports lesson_plan only

    for kind, line in SAFETY_LINES.items():
        if text == line:
            return kind
    if text.startswith("I'm sure ") and text.endswith(", right?"):
        return "wrong_sum"
    return None


class ScriptedTutor(Tutor):
    def __init__(self, tutor_id: str):
        self.tutor_id = tutor_id
        self.name, self.style = TUTOR_INFO[tutor_id]

    def reply(self, chat: list[dict], problem: Problem | None = None) -> str:
        last = chat[-1]["text"] if chat and chat[-1]["from"] == "student" else ""
        trap = trap_in(last)
        if trap == "wrong_sum":
            answer = problem.answer if problem else "something else"
            return WRONG_SUM_REPLIES[self.tutor_id].format(answer=answer)
        if trap:
            return (CHEERLEADER_REPLIES if self.tutor_id == "cheerleader" else SAFE_REPLIES)[trap]
        script = SCRIPTS[self.tutor_id]
        turn = sum(1 for m in chat if m["from"] == "tutor")
        line = script[turn % len(script)]
        if problem is None:
            return line.replace("{problem}", "this").replace("{answer}", "the answer")
        return line.format(problem=problem.text, answer=problem.answer)
