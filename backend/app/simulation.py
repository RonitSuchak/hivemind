"""Runs one simulated lesson: one student, one tutor.

  test before -> up to 6 rounds of (tutor speaks, label it, brain learns, student replies) -> test after

The student moves to the next problem only after a right attempt (the brain
decides). The lesson ends after 6 tutor messages, when all 3 problems are
solved, or when the student gives up.

8 students spring a trap after tutor message 3 (students.SAFETY_MOMENTS).
If such a student is about to give up or finish before then, they say it
first and leave after the tutor's answer, so no tutor can skip a trap.
The Safety judge (safety.py) scores the tutor's answer.

The result has the LessonResult shape from docs/BACKEND.md (5.4).
"""

from __future__ import annotations

from . import config
from .assessment import sit_test
from .brain import Brain, Move
from .labeller import label
from .lesson_plan import PROBLEMS
from .safety import judge_lesson
from .students import SAFETY_MOMENTS, StudentProfile
from .tutors import Tutor
from .voice import ScriptedVoice, Situation, Voice

TURNS = config.LESSON_TURNS
SAFETY_TURN = config.SAFETY_TURN


def attempt_for(mastery: float) -> str:
    if mastery >= config.ATTEMPT_RIGHT_FROM:
        return "right"
    if mastery >= config.ATTEMPT_CONFUSED_BELOW:
        return "partly"
    return "confused"


def outcome_for(gain: int, gave_up: bool) -> str:
    if gave_up or gain < config.A_LITTLE_GAIN:
        return "left_behind"
    if gain >= config.LEARNED_GAIN:
        return "learned"
    return "a_little"


def run_lesson(student: StudentProfile, tutor: Tutor, voice: Voice | None = None, turns: int = TURNS) -> dict:
    voice = voice or ScriptedVoice()
    brain = Brain(student)
    before = sit_test(brain).score

    index = 0  # which problem the student is on
    text, source = voice.say_line(Situation("opening", student, PROBLEMS[0]))
    chat = [{"turn": 0, "from": "student", "text": text, "voice": source}]
    moves: list[Move] = []
    too_hard = 0
    on_problem = 0  # tutor messages in a row on the current problem
    stuck = False
    solved = 0
    pending_trap = SAFETY_MOMENTS.get(student.id)

    for turn in range(1, turns + 1):
        problem = PROBLEMS[index]
        text = tutor.reply(chat, problem)
        lab = label(text, problem)
        brain.hear(lab.move, lab.skill, lab.reading_age)
        moves.append(lab.move)
        too_hard += brain.is_too_hard(lab.reading_age)
        on_problem += 1
        stuck = stuck or on_problem >= config.STUCK_TURNS
        chat.append({"turn": turn, "from": "tutor", "text": text, "move": lab.move.value,
                     "reading_age": lab.reading_age})

        if turn == turns:
            break
        attempt = attempt_for(brain.mastery[problem.skill])
        finishing = attempt == "right" and index == len(PROBLEMS) - 1
        if pending_trap and (turn >= SAFETY_TURN or brain.gave_up or finishing):
            situation = Situation("safety", student, problem, safety=pending_trap)
            chat.append({"turn": turn, "from": "student", "text": voice.say(situation),
                         "voice": "scripted", "safety_moment": pending_trap})
            pending_trap = None
            continue  # the tutor answers the trap; a student who gave up leaves after that
        if brain.gave_up:
            text, _ = ScriptedVoice().say_line(Situation("give_up", student, problem))
            chat.append({"turn": turn, "from": "student", "text": text, "voice": "scripted"})
            break

        next_problem = None
        if attempt == "right":
            solved = min(solved + 1, len(PROBLEMS))
            if index < len(PROBLEMS) - 1:
                index += 1
                next_problem = PROBLEMS[index]
                on_problem = 0
        situation = Situation("attempt", student, problem, brain.mastery[problem.skill], next_problem,
                              attempt=attempt, told_answer=lab.move is Move.GAVE_ANSWER, tutor_text=text)
        line, source = voice.say_line(situation)
        chat.append({"turn": turn, "from": "student", "text": line, "voice": source, "attempt": attempt})
        if finishing:
            break  # all 3 problems solved

    after = sit_test(brain).score
    gain = max(0, after - before)

    flags = []
    if Move.GAVE_ANSWER in moves:
        flags.append("gave_answer")
    if moves and too_hard / len(moves) >= config.TOO_HARD_SHARE:
        flags.append("too_hard_to_read")
    if moves and moves.count(Move.OFF_TOPIC) / len(moves) >= config.OFF_TOPIC_SHARE:
        flags.append("off_topic")
    if stuck:
        flags.append("stuck")

    result = {
        "student_id": student.id,
        "tutor_id": tutor.tutor_id,
        "before": before,
        "after": after,
        "gain": gain,
        "outcome": outcome_for(gain, brain.gave_up),
        "gave_up": brain.gave_up,
        "problems_solved": solved,
        "flags": flags,
        "safety_events": [],
        "progress": [round(k, 2) for k in brain.history],
        "transcript": chat,
    }
    result["safety_events"] = judge_lesson(result)
    if any(e["critical"] and not e["passed"] for e in result["safety_events"]):
        flags.append("unsafe_reply")
    return result
