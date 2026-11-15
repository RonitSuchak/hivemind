"""Print how much each tutor teaches each kind of student, offline and free.

Used to tune the learning numbers in config.py (docs/DESIGN.md, item 2):
    python3 -m app.tune

"well matched" = starting level 0.5 or below and no reply too hard to read.
"expected" = the average gain over many dice rolls (no luck), next to the
real seeded test gain the website shows.
"""

from __future__ import annotations

from statistics import mean, median

from .assessment import expected_score
from .brain import Brain
from .labeller import label
from .simulation import run_lesson
from .students import STUDENTS, TAG_RULES
from .tutors import TUTOR_INFO, ScriptedTutor


def expected_gain(result: dict, student) -> float:
    """Replay the lesson on a fresh brain to get the dice-free gain."""
    brain = Brain(student)
    start = expected_score(brain)
    from .lesson_plan import PROBLEMS
    for m in result["transcript"]:
        if m["from"] == "tutor":
            problem = next(p for p in PROBLEMS if p.skill == _skill_at(result, m["turn"]))
            lab = label(m["text"], problem)
            brain.hear(lab.move, lab.skill, lab.reading_age)
    return expected_score(brain) - start


def _skill_at(result: dict, turn: int) -> str:
    from .lesson_plan import PROBLEMS
    index = 0
    for m in result["transcript"]:
        if m["from"] == "student" and m.get("attempt") == "right" and m["turn"] < turn:
            index = min(index + 1, len(PROBLEMS) - 1)
    return PROBLEMS[index].skill


def main() -> None:
    print(f"{'tutor':15s} {'avg':>5s} {'exp':>5s} {'matched med':>11s} {'learned':>7s} {'little':>6s} {'behind':>6s} "
          f"{'gave up':>7s} {'solved':>6s}   " + " ".join(f"{t[:8]:>8s}" for t in TAG_RULES))
    for tid in TUTOR_INFO:
        tutor = ScriptedTutor(tid)
        rows = [(s, run_lesson(s, tutor)) for s in STUDENTS]
        gains = [r["gain"] for _, r in rows]
        exp = [expected_gain(r, s) for s, r in rows]
        matched = [r["gain"] for s, r in rows if s.start_level <= 0.5 and "too_hard_to_read" not in r["flags"]]
        outcomes = [r["outcome"] for _, r in rows]
        groups = " ".join(f"{mean([r['gain'] for s, r in rows if tag in s.tags]):8.1f}" for tag in TAG_RULES)
        print(f"{tid:15s} {mean(gains):5.2f} {mean(exp):5.2f} {median(matched) if matched else 0:11.1f} "
              f"{outcomes.count('learned'):7d} {outcomes.count('a_little'):6d} {outcomes.count('left_behind'):6d} "
              f"{sum(r['gave_up'] for _, r in rows):7d} {mean(r['problems_solved'] for _, r in rows):6.1f}   {groups}")


if __name__ == "__main__":
    main()
