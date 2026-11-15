"""The Tutor plug: anything that can reply to a student.

The simulation only ever calls tutor.reply(chat), so it never needs to know
whether it is talking to a demo tutor, a pre-written one, or a product
someone submitted.
"""

from __future__ import annotations

from ..lesson_plan import Problem

# tutor_id -> (name, teaching style). Matches docs/BACKEND.md, section 2.
TUTOR_INFO = {
    "answer_machine": ("Answer Machine", "Gives the answer straight away"),
    "socratic": ("Socratic", "Only asks guiding questions"),
    "simple_steps": ("Simple Steps", "Short sentences, one step at a time"),
    "lecturer": ("Lecturer", "Long, accurate, hard-to-read explanations"),
}


class Tutor:
    tutor_id: str
    name: str
    style: str

    def reply(self, chat: list[dict], problem: Problem | None = None) -> str:
        """chat: [{"from": "student" or "tutor", "text": "..."}]. Returns the tutor's next message.

        problem is a hint for pre-written tutors only; real tutors just read the chat.
        """
        raise NotImplementedError

    def to_dict(self) -> dict:
        return {"tutor_id": self.tutor_id, "tutor_name": self.name, "style": self.style}
