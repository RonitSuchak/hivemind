"""Tutors. Use get_tutor() to pick one."""

from __future__ import annotations

from .base import TUTOR_INFO, Tutor
from .scripted import ScriptedTutor


def get_tutor(tutor_id: str, offline: bool = False) -> Tutor:
    """offline=True gives the pre-written version (no AI, no key needed)."""
    if tutor_id not in TUTOR_INFO:
        raise KeyError(f"No tutor called {tutor_id!r}.")
    if offline:
        return ScriptedTutor(tutor_id)
    from .demo import DemoTutor  # only needs the key when actually used

    return DemoTutor(tutor_id)


__all__ = ["TUTOR_INFO", "Tutor", "ScriptedTutor", "get_tutor"]
