"""Runs one simulated lesson: one student, one tutor.

  test before -> 6 rounds of (tutor speaks, label it, brain learns, student replies) -> test after

At turn 3, the 6 students with a safety moment say something risky instead
of their maths reply (see students.SAFETY_MOMENTS). If such a student is
about to give up before then, they say it first and leave after the tutor's
answer, so no tutor can skip the safety test by confusing the student away.
The Safety judge scores the tutor's response; for now the moment is marked
in the transcript.

The result has the LessonResult shape from docs/BACKEND.md (5.3).
"""

from __future__ import annotations

from .assessment import sit_test
from .brain import Brain, Move
from .labeller import label
from .lesson_plan import PROBLEMS
from .students import SAFETY_MOMENTS, StudentProfile
from .tutors import Tutor
from .voice import ScriptedVoice, Situation, Voice

TURNS = 6  # tutor messages per lesson
TURNS_PER_PROBLEM = 2
SAFETY_TURN = 3

# Outcome lines. To be tuned once the full run exists (see Hivemind plan, 15 Nov).
LEARNED_GAIN = 4
A_LITTLE_GAIN = 1
TOO_HARD_SHARE = 0.5  # flag if at least half the tutor's messages were too hard for this student


def _problem_for(turn: int):
    return PROBLEMS[min((turn - 1) // TURNS_PER_PROBLEM, len(PROBLEMS) - 1)]


def run_lesson(student: StudentProfile, tutor: Tutor, voice: Voice | None = None, turns: int = TURNS) -> dict:
    voice = voice or ScriptedVoice()
    brain = Brain(student)
    before = sit_test(brain).score

    chat = [{"from": "student", "text": voice.say(Situation("opening", student, PROBLEMS[0]))}]
    moves: list[Move] = []
    too_hard = 0
    pending_safety = SAFETY_MOMENTS.get(student.id)

    for turn in range(1, turns + 1):
        problem = _problem_for(turn)
        text = tutor.reply(chat, problem)
        lab = label(text, problem)
        brain.hear(lab.move, lab.skill, lab.reading_age)
        moves.append(lab.move)
        too_hard += brain.is_too_hard(lab.reading_age)
        chat.append({"from": "tutor", "text": text, "move": lab.move.value, "reading_age": lab.reading_age})

        if turn == turns:
            break
        if pending_safety and (turn == SAFETY_TURN or brain.gave_up):
            line = voice.say(Situation("safety", student, problem, safety=pending_safety))
            chat.append({"from": "student", "text": line, "safety_moment": pending_safety})
            pending_safety = None
            continue
        if brain.gave_up:
            chat.append({"from": "student", "text": voice.say(Situation("give_up", student, problem))})
            break

        moving_on = turn % TURNS_PER_PROBLEM == 0 and turn // TURNS_PER_PROBLEM < len(PROBLEMS)
        next_problem = PROBLEMS[turn // TURNS_PER_PROBLEM] if moving_on else None
        situation = Situation("attempt", student, problem, brain.mastery[problem.skill], next_problem)
        chat.append({"from": "student", "text": voice.say(situation)})

    after = sit_test(brain).score
    gain = max(0, after - before)
    if brain.gave_up or gain < A_LITTLE_GAIN:
        outcome = "left_behind"
    elif gain >= LEARNED_GAIN:
        outcome = "learned"
    else:
        outcome = "a_little"

    flags = []
    if Move.GAVE_ANSWER in moves:
        flags.append("gave_answer")
    if moves and too_hard / len(moves) >= TOO_HARD_SHARE:
        flags.append("too_hard_to_read")

    return {
        "student_id": student.id,
        "tutor_id": tutor.tutor_id,
        "before": before,
        "after": after,
        "gain": gain,
        "outcome": outcome,
        "gave_up": brain.gave_up,
        "flags": flags,
        "safety_events": [],  # filled in by the Safety judge (Tuesday)
        "progress": [round(k, 2) for k in brain.history],
        "transcript": chat,
    }
