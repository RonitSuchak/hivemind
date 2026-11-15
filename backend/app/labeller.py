"""Labels each tutor message: what kind of teaching it was, and how hard it is to read.

Simple rules, no AI, so the same message always gets the same label and
every label can be explained.

Reading age uses the Flesch-Kincaid grade formula (US school grade from
sentence length and syllables per word); reading age = grade + 5.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from fractions import Fraction

from .brain import Move
from .lesson_plan import Problem

FRACTION = re.compile(r"(\d+)\s*/\s*(\d+)")
WORD = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?")

HINT_WORDS = ("try", "think about", "remember", "notice", "look at", "what if", "hint",
              "same bottom", "common denominator", "multiply", "step")
ENCOURAGE_WORDS = ("well done", "great", "good try", "nice", "you can do", "keep going",
                   "good job", "brilliant", "don't worry")
MATHS_WORDS = ("fraction", "denominator", "numerator", "bottom", "top number", "equal",
               "multiply", "divide", "half", "quarter", "third", "sum", "plus", "add")

TEACHING_MOVES = {Move.GAVE_ANSWER, Move.HINT, Move.QUESTION, Move.EXPLANATION}


@dataclass(frozen=True)
class Label:
    move: Move
    skill: str | None  # the skill it taught, or None
    reading_age: float | None  # years, or None if there are no words


def count_syllables(word: str) -> int:
    word = word.lower()
    count = len(re.findall(r"[aeiouy]+", word))
    if word.endswith("e") and not word.endswith(("le", "ee")) and count > 1:
        count -= 1  # silent e
    return max(1, count)


def reading_age(text: str) -> float | None:
    words = WORD.findall(text)
    if not words:
        return None
    sentences = max(1, len(re.findall(r"[.!?]+", text)))
    syllables = sum(count_syllables(w) for w in words)
    grade = 0.39 * len(words) / sentences + 11.8 * syllables / len(words) - 15.59
    return round(max(6.0, grade + 5), 1)


def fractions_in(text: str) -> list[tuple[str, Fraction]]:
    found = []
    for match in FRACTION.finditer(text):
        top, bottom = int(match[1]), int(match[2])
        if bottom:
            found.append((f"{top}/{bottom}", Fraction(top, bottom)))
    return found


def gives_answer(text: str, problem: Problem) -> bool:
    """True if the message states the problem's answer (or an equal fraction).

    Fractions already in the problem don't count: for "2/3 = ?/6" the answer
    4/6 equals 2/3, but saying "2/3" is not giving the answer away.
    """
    answer = Fraction(problem.answer)
    return any(value == answer and written not in problem.operands for written, value in fractions_in(text))


def label(text: str, problem: Problem) -> Label:
    lower = text.lower()
    maths = bool(fractions_in(text)) or any(word in lower for word in MATHS_WORDS + HINT_WORDS)
    if gives_answer(text, problem):
        move = Move.GAVE_ANSWER
    elif "?" in text:
        # A question only teaches if it is about the maths; "what's your favourite game?" doesn't.
        move = Move.QUESTION if maths else Move.OFF_TOPIC
    elif any(word in lower for word in HINT_WORDS):
        move = Move.HINT
    elif maths:
        move = Move.EXPLANATION
    elif any(word in lower for word in ENCOURAGE_WORDS):
        move = Move.ENCOURAGEMENT
    else:
        move = Move.OFF_TOPIC
    skill = problem.skill if move in TEACHING_MOVES else None
    return Label(move=move, skill=skill, reading_age=reading_age(text))
