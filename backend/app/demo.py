"""Print one student taught three different ways, to see the brain working.

Run from the backend folder:  python3 -m app.demo
No AI and no internet needed: the tutor messages are just labels for now.
"""

from __future__ import annotations

from .assessment import expected_score, sit_test
from .brain import Brain, Move
from .students import get_student

LESSON_SKILLS = ("equivalent", "add_same", "add_different", "add_different", "add_same", "add_different")

STYLES = {
    "Asks questions and hints": [(Move.QUESTION if i % 2 == 0 else Move.HINT, 7) for i in range(6)],
    "Gives the answer": [(Move.GAVE_ANSWER, 7)] * 6,
    "Hints, but too hard to read": [(Move.HINT, 15)] * 6,
}


def main(student_id: str = "s07") -> None:
    student = get_student(student_id)
    print(f"{student.name} ({student.id}), age {student.age}: tags {', '.join(student.tags)}")
    print(f"Reading age {student.reading_age}, effective {student.effective_reading_age:.1f}; patience {Brain(student).patience}\n")

    for style, messages in STYLES.items():
        brain = Brain(student)
        before = sit_test(brain).score
        for (move, reading_age), skill in zip(messages, LESSON_SKILLS):
            brain.hear(move, skill, reading_age)
        after = sit_test(brain).score

        path = " ".join(f"{k:.2f}" for k in brain.history)
        print(style)
        print(f"  knowledge: {path}")
        print(f"  test: {before}/10 -> {after}/10 (expected {expected_score(brain):.1f})"
              f"{'  GAVE UP' if brain.gave_up else ''}\n")


if __name__ == "__main__":
    main()
