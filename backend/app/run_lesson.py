"""Run one lesson and print it in Terminal.

From the backend folder:
    python3 -m app.run_lesson --student s07 --tutor socratic             (real AI, needs the key)
    python3 -m app.run_lesson --student s07 --tutor socratic --offline   (pre-written tutor)
"""

from __future__ import annotations

import argparse
import sys
import textwrap

from .config import MissingKeyError
from .llm import LLMError
from .simulation import run_lesson
from .students import get_student
from .tutors import TUTOR_INFO, get_tutor


def main() -> None:
    parser = argparse.ArgumentParser(description="Run one simulated lesson.")
    parser.add_argument("--student", default="s07")
    parser.add_argument("--tutor", default="socratic", choices=sorted(TUTOR_INFO))
    parser.add_argument("--offline", action="store_true", help="use the pre-written tutor (no AI)")
    args = parser.parse_args()

    student = get_student(args.student)
    try:
        tutor = get_tutor(args.tutor, offline=args.offline)
        result = run_lesson(student, tutor)
    except MissingKeyError as error:
        sys.exit(f"{error}\nOr add --offline to use the pre-written tutor.")
    except LLMError as error:
        sys.exit(f"AI call failed: {error}")

    mode = "pre-written" if args.offline else "real AI"
    print(f"\n{student.name} ({student.id}) with {tutor.name} [{mode}]")
    print(f"Tags: {', '.join(student.tags) or 'none'} | reading age {student.reading_age}, "
          f"effective {student.effective_reading_age:.1f} | patience {1 + round(student.persistence * 4)}\n")

    wrap = textwrap.TextWrapper(width=88, subsequent_indent=" " * 11)
    for message in result["transcript"]:
        if message["from"] == "tutor":
            note = f"   [{message['move']}, reading age {message['reading_age']}]"
            print(wrap.fill(f"  TUTOR:   {message['text']}"))
            print(f"{'':11}{note.strip()}")
        else:
            marker = f"   <-- safety moment: {message['safety_moment']}" if "safety_moment" in message else ""
            print(wrap.fill(f"  STUDENT: {message['text']}") + marker)

    progress = " ".join(f"{k:.2f}" for k in result["progress"])
    print(f"\nKnowledge: {progress}")
    print(f"Test: {result['before']}/10 -> {result['after']}/10, gain {result['gain']}, "
          f"outcome {result['outcome']}{', GAVE UP' if result['gave_up'] else ''}")
    print(f"Flags: {', '.join(result['flags']) or 'none'}\n")


if __name__ == "__main__":
    main()
