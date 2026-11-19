"""Check accuracy test: 40 made-up students with known answers take the real check (docs/DESIGN.md).

    cd backend && .venv/bin/python -m app.check_test     # writes data/export/check-test.json and prints the summary

Why: before real classmates take the check, we test the check itself the way any measuring tool is tested
(in testing research this is called "parameter recovery"). Each made-up student gets hidden true traits that we
set first. A separate answer model decides how they click, then the real scoring code (check.profile_from) and the
real match (matching.nearest) run on those clicks. We compare what the check measured with the hidden truth.

What this proves, and what it does not:
  - It shows how well the check measures a student and finds the right simulated students for them, and how much
    rushing or not trying spoils that.
  - It says nothing about whether our simulated students learn like real children. Only real classmates on the
    Proof page can answer that, so these 40 never go into the classmate results.

The answer model is ours and is a stated assumption, written separately from the scoring code:
  - Knowing more makes a right answer more likely (a logistic curve per question, with a harder question needing
    more knowledge), and a guess is still right 1 time in 4.
  - The mini-lesson teaches each student a share of what they didn't know, set by their true learning speed.
  - Reading questions depend on reading age (lowered for students new to English) against each passage.
  - The English rating is the true level give or take about a point: children misjudge themselves.
  - Students who give up sooner skip more, mostly the questions they don't know.
  - Behaviours: careful, rushing (a third of clicks are random), not trying (random clicks or always the same
    button, very fast) and quitting after quiz 1.
Everything is seeded, so the same 40 students and the same results come out every run.
"""

from __future__ import annotations

import json
import math
import random
from functools import lru_cache

from . import catalog, config
from .check import ENGLISH, QUIZ_1, QUIZ_2, READING, check_quality, profile_from, shuffled
from .matching import CLASS_RANGE, enough, nearest, nearest_radar, on_class_scale, rank
from .students import READING_AGE_MIN, READING_AGE_SPAN, STUDENTS, radar

SEED = "hivemind-check-test-v1"  # the set that found the two weak measures (19 Nov)
FRESH_SEEDS = ("unseen-d", "unseen-e", "unseen-f")  # never used to choose the fix; reported to confirm it
MIX = {"careful": 25, "rushing": 8, "not_trying": 4, "quit_halfway": 3}
TRAITS = ("start_level", "learn_speed", "reading", "english", "persistence")
CLOSE = 0.15  # a measured trait within this of the truth (on the 0-1 class scale) counts as close

# How much knowledge (0-1, the student's place in the class) each question needs. Equivalent fractions are easiest,
# adding with different bottom numbers hardest, as in brain.SKILL_OFFSET.
NEEDS = {"c1": 0.25, "c2": 0.15, "c3": 0.55, "c4": 0.45, "c5": 0.7,
         "c6": 0.25, "c7": 0.15, "c8": 0.6, "c9": 0.45, "c10": 0.55}
SHARPNESS = 7  # how quickly a right answer becomes likely once a student knows enough
PASSAGE_AGE = {"p1": 8, "p2": 13}  # reading age each passage needs: the pizza one is easy, the recipe one is not
GUESS = 0.25
SECONDS = {"careful": (330, 600), "rushing": (160, 280), "not_trying": (50, 120), "quit_halfway": (150, 240)}


def _logistic(x: float) -> float:
    return 1 / (1 + math.exp(-x))


def _make_students(rng: random.Random) -> list[dict]:
    """40 students with true traits spread over the class's range. Traits are partly linked, as in a real class
    (a student who reads well is more likely to know more), but each still varies on its own."""
    behaviours = [b for b, n in MIX.items() for _ in range(n)]
    rng.shuffle(behaviours)
    students = []
    for i, behaviour in enumerate(behaviours, 1):
        base = rng.random()
        share = {k: max(0.0, min(1.0, 0.4 * base + 0.6 * rng.random())) for k in TRAITS}
        true = {k: round(CLASS_RANGE[k][0] + share[k] * (CLASS_RANGE[k][1] - CLASS_RANGE[k][0]), 3)
                for k in ("start_level", "learn_speed", "english", "persistence")}
        reading_age = 8 + round(7 * share["reading"])
        true["reading"] = round((reading_age - READING_AGE_MIN) / READING_AGE_SPAN, 3)
        students.append({"id": f"T{i:02d}", "behaviour": behaviour, "reading_age": reading_age,
                         "share": share, "true": true})
    return students


def _click(rng: random.Random, q, p_know: float, skip_chance: float):
    """One careful answer: skip, know it, or guess."""
    if rng.random() < skip_chance * (1 - p_know):
        return None
    if rng.random() < p_know + (1 - p_know) * GUESS:
        return q.answer
    return rng.choice([o for o in q.options if o != q.answer])


def take_check(student: dict, rng: random.Random) -> dict:
    """The body the website would send to POST /api/match for this student."""
    behaviour, share = student["behaviour"], student["share"]
    skip_chance = 0.6 * (1 - share["persistence"])
    random_share = 0.35 if behaviour == "rushing" else 0.0
    button = rng.randrange(4)

    def answer(q, knows: float):
        if behaviour == "not_trying":
            return shuffled(q)[button] if student["id_kind"] == "same_button" else rng.choice(q.options)
        if rng.random() < random_share:
            return rng.choice(q.options)
        return _click(rng, q, knows, skip_chance)

    knowledge = share["start_level"]
    body = {"quiz_1": {q.id: answer(q, _logistic(SHARPNESS * (knowledge - NEEDS[q.id]))) for q in QUIZ_1}}
    if behaviour == "quit_halfway":
        body.update({"quiz_2": {}, "reading": {}, "english_confidence": None})
    else:
        learned = 0.1 + 0.8 * share["learn_speed"]  # the share of what they didn't know that the mini-lesson teaches
        knowledge2 = knowledge + (1 - knowledge) * learned
        body["quiz_2"] = {q.id: answer(q, _logistic(SHARPNESS * (knowledge2 - NEEDS[q.id]))) for q in QUIZ_2}
        effective_age = student["reading_age"] - 2 * (1 - share["english"])
        body["reading"] = {q.id: answer(q, _logistic(1.3 * (effective_age - PASSAGE_AGE[pid] + 1)))
                           for pid, _, qs in READING for q in qs}
        if behaviour == "not_trying":
            body["english_confidence"] = 3 if student["id_kind"] == "same_button" else rng.randint(1, 5)
        elif rng.random() < 0.05:
            body["english_confidence"] = None  # skipped it
        else:
            rating = round(1 + 4 * share["english"] + rng.gauss(0, 0.7))
            body["english_confidence"] = max(ENGLISH["min"], min(ENGLISH["max"], rating))
    body["seconds_taken"] = rng.randint(*SECONDS[behaviour])
    return body


def _measured(profile: dict) -> dict:
    return on_class_scale(radar(profile["start_level"], profile["learn_speed"], profile["reading_age"],
                                profile["english"], profile["persistence"]))


def _compare(true: dict, measured_radar: dict, measured_near: list[dict], rated) -> dict:
    truth_near = nearest_radar(true)
    truth_rank, measured_rank = rank(truth_near, rated), rank(measured_near, rated)
    truth_gain = {r["tutor_id"]: r["predicted_gain"] for r in truth_rank}
    gain_gaps = [abs(r["predicted_gain"] - truth_gain[r["tutor_id"]]) for r in measured_rank]
    return {
        "errors": {k: round(abs(measured_radar[k] - true[k]), 3) for k in TRAITS},
        "same_students": len({m["student_id"] for m in truth_near} & {m["student_id"] for m in measured_near}),
        "same_closest": truth_near[0]["student_id"] == measured_near[0]["student_id"],
        "same_best_tool": truth_rank[0]["tutor_id"] == measured_rank[0]["tutor_id"],
        "gain_gap": round(sum(gain_gaps) / len(gain_gaps), 2),
        "truth_enough": enough(truth_near),
        "measured_enough": enough(measured_near),
    }


def _summary(rows: list[dict]) -> dict:
    n = len(rows)
    if not n:
        return {"students": 0}
    return {
        "students": n,
        "trait_error": {k: round(sum(r["errors"][k] for r in rows) / n, 3) for k in TRAITS},
        "trait_close_share": {k: round(sum(r["errors"][k] <= CLOSE for r in rows) / n, 2) for k in TRAITS},
        "avg_same_students": round(sum(r["same_students"] for r in rows) / n, 2),
        "same_best_tool_share": round(sum(r["same_best_tool"] for r in rows) / n, 2),
        "avg_gain_gap": round(sum(r["gain_gap"] for r in rows) / n, 2),
        "enough_agrees_share": round(sum(r["truth_enough"] == r["measured_enough"] for r in rows) / n, 2),
    }


def _students_for(seed: str) -> tuple[list[dict], random.Random]:
    rng = random.Random(seed)
    students = _make_students(rng)
    not_trying = [s for s in students if s["behaviour"] == "not_trying"]
    for s in students:  # half the students who don't try click at random, half always press the same button
        s["id_kind"] = ("same_button" if not_trying.index(s) % 2 else "random") if s in not_trying else s["behaviour"]
    return students, rng


def _rows_for(seed: str, rated) -> tuple[list[dict], list[dict]]:
    """Every student's row, and what assuming the class average would have given them."""
    students, rng = _students_for(seed)
    class_average = {k: round(sum(s.radar[k] for s in STUDENTS) / len(STUDENTS), 3) for k in TRAITS}
    average_near = nearest_radar(class_average)
    rows, baseline = [], []
    for s in students:
        body = take_check(s, rng)
        profile = profile_from(body)
        measured = _measured(profile)
        quality = check_quality(body)
        row = {"id": s["id"], "behaviour": s["id_kind"] if s["behaviour"] == "not_trying" else s["behaviour"],
               "seconds_taken": body["seconds_taken"], "true": s["true"],
               "measured": {k: measured[k] for k in TRAITS}, "profile": profile,
               **_compare(s["true"], measured, nearest(profile), rated),
               "flagged": not quality["reliable"], "flag_reasons": [r["code"] for r in quality["reasons"]]}
        rows.append(row)
        baseline.append(_compare(s["true"], class_average, average_near, rated))
    return rows, baseline


@lru_cache(maxsize=1)
def run() -> dict:
    """The whole test. Cached: it is fixed by the seeds and the saved lesson runs."""
    rated = catalog.rated()
    rows, baseline = _rows_for(SEED, rated)
    fresh = {}
    for seed in FRESH_SEEDS:  # sets never used to choose the 19 Nov fix: the honest check that it works
        fresh_rows, _ = _rows_for(seed, rated)
        fresh[seed] = _summary([r for r in fresh_rows if r["behaviour"] == "careful"])

    careful = [r for r in rows if r["behaviour"] == "careful"]
    careful_baseline = [b for r, b in zip(rows, baseline) if r["behaviour"] == "careful"]
    gave_up = [r for r in rows if r["behaviour"] in ("random", "same_button", "quit_halfway")]
    rushing = [r for r in rows if r["behaviour"] == "rushing"]
    groups = {"careful": careful, "rushing": rushing, "not_trying": [r for r in gave_up if r["behaviour"] != "quit_halfway"],
              "quit_halfway": [r for r in gave_up if r["behaviour"] == "quit_halfway"]}
    summary = {
        "careful": _summary(careful),
        "everyone": _summary(rows),
        "no_check_careful": _summary(careful_baseline),
        "by_behaviour": {k: _summary(v) for k, v in groups.items()},
        "fresh_sets_careful": fresh,
        "flag": {"caught": sum(r["flagged"] for r in gave_up), "of": len(gave_up),
                 "rushing_flagged": sum(r["flagged"] for r in rushing), "rushing": len(rushing),
                 "careful_flagged": sum(r["flagged"] for r in careful), "careful": len(careful)},
    }
    return {
        "title": "Check accuracy test",
        "simulated": True,
        "note": (f"{len(rows)} made-up students with known answers took the real check. This tests the check as a "
                 "measuring tool. It is not evidence about real children, and these students are never added to "
                 "the classmate results."),
        "seed": SEED,
        "mix": dict(MIX),
        "close_means": CLOSE,
        "summary": summary,
        "findings": findings(summary),
        "students": rows,
    }


WHY_WEAK = {
    "start_level": "Five questions are not many to place a student with.",
    "learn_speed": "It comes from the change between two 5-question quizzes, so one lucky guess moves it a lot.",
    "reading": "Four reading questions are not many to place a student with.",
    "english": "It comes from one question about how confident the student feels.",
    "persistence": "It only counts skipped questions, and most careful students skip none, so it can rarely tell them apart.",
}


def findings(summary: dict) -> list[str]:
    """The results in plain sentences, worked out from the numbers (never typed in by hand)."""
    c, base, flag = summary["careful"], summary["no_check_careful"], summary["flag"]
    names = {"start_level": "starting level", "learn_speed": "learning speed", "reading": "reading",
             "english": "English", "persistence": "staying power"}
    best = min(TRAITS, key=lambda k: c["trait_error"][k] - base["trait_error"][k])
    worst = max(TRAITS, key=lambda k: c["trait_error"][k] - base["trait_error"][k])
    out = [
        (f"For the {c['students']} careful students, the check put {names[best]} within {CLOSE} of the truth for "
         f"{round(100 * c['trait_close_share'][best])}% of them, against {round(100 * base['trait_close_share'][best])}% "
         "if we just assumed every student was average for the class."),
        (f"It found on average {c['avg_same_students']} of the same 5 simulated students that their true traits "
         f"would pick (assuming average gets {base['avg_same_students']})."),
        (f"Its advice was within {c['avg_gain_gap']} marks out of 10 of the advice we'd give if we knew the student "
         f"perfectly, and it picked the same best tool for {round(100 * c['same_best_tool_share'])}% of them "
         f"(assuming average: {base['avg_gain_gap']} marks, {round(100 * base['same_best_tool_share'])}%)."),
        (f"The weakest part is {names[worst]}: off by {c['trait_error'][worst]} on average, against "
         f"{base['trait_error'][worst]} for assuming average. {WHY_WEAK[worst]}"),
        (f"The didn't-try flag caught {flag['caught']} of the {flag['of']} students who clicked through or quit, "
         f"flagged {flag['rushing_flagged']} of {flag['rushing']} who rushed, and wrongly flagged "
         f"{flag['careful_flagged']} of {flag['careful']} careful students."),
    ]
    return out


def main() -> None:
    result = run()
    path = config.DATA_DIR / "export" / "check-test.json"  # the demo-mode copy the website reads
    path.write_text(json.dumps(result, indent=1, ensure_ascii=False))  # same format as app.export
    print(result["note"])
    for line in result["findings"]:
        print("-", line)
    print(f"Saved to {path}")


if __name__ == "__main__":
    main()
