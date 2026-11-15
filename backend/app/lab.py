"""The lab: teaches the class of 30 with each tutor and saves every lesson.

    python3 -m app.lab                     5 tutors x 30 students, real AI (tutors and student voice)
    python3 -m app.lab --offline           pre-written tutors and voice, free and instant
    python3 -m app.lab --tutors socratic --voice scripted

Each lesson is saved as runs/{tutor_id}/{student_id}.json the moment it ends.
Running again skips every lesson already saved with the current MODEL_VERSION,
so a run that stops (free limit, crash, laptop lid) resumes without repeating
a lesson. When all 30 lessons of a tutor exist, the class run
runs/{tutor_id}.json is written (summary, scores, evidence, safety).
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from . import config
from .llm import GeminiClient, LLMError, QuotaError
from .safety import judge_lesson
from .scores import class_run
from .simulation import run_lesson
from .students import STUDENTS, get_student
from .tutors import TUTOR_INFO, get_tutor
from .voice import ScriptedVoice


def pacific_date() -> str:
    """The free quota's day (it resets at midnight Pacific time)."""
    try:
        from zoneinfo import ZoneInfo
        return datetime.now(ZoneInfo("America/Los_Angeles")).date().isoformat()
    except Exception:  # no time zone data: Pacific standard time is UTC-8
        from datetime import timedelta
        return (datetime.now(timezone.utc) - timedelta(hours=8)).date().isoformat()


class Budget:
    """Counts AI calls per quota day in budget.json, so the lab stops before the limit."""

    def __init__(self, path: Path, limit: int):
        self.path, self.limit = path, limit
        data = json.loads(path.read_text()) if path.exists() else {}
        self.used = data.get("calls", 0) if data.get("date") == pacific_date() else 0

    def can_afford(self, calls: int) -> bool:
        return self.used + calls <= self.limit

    def spend(self, calls: int) -> None:
        self.used += calls
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps({"date": pacific_date(), "calls": self.used}))


def lesson_path(out: Path, tutor_id: str, student_id: str) -> Path:
    return out / tutor_id / f"{student_id}.json"


def load_lesson(path: Path) -> dict | None:
    """A saved lesson, or None if missing or made with other learning numbers."""
    if not path.exists():
        return None
    data = json.loads(path.read_text())
    return data if data.get("model_version") == config.MODEL_VERSION else None


def save_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=1, ensure_ascii=False))
    tmp.replace(path)  # never leaves a half-written file behind


def build_class_run(out: Path, tutor: dict, student_ids: list[str] | None = None) -> dict | None:
    """Write runs/{tutor_id}.json once every lesson exists. Returns it, or None if lessons are missing."""
    ids = student_ids or [s.id for s in STUDENTS]
    lessons = [load_lesson(lesson_path(out, tutor["tutor_id"], sid)) for sid in ids]
    if any(lesson is None for lesson in lessons):
        return None
    modes = {lesson["voice_mode"] for lesson in lessons}
    voice = modes.pop() if len(modes) == 1 else "mixed"
    tested_on = max(lesson["created"][:10] for lesson in lessons)
    results = [{k: v for k, v in lesson.items() if k not in ("model_version", "voice_mode", "tutor_mode", "created")}
               for lesson in lessons]
    for r in results:  # re-judge with today's rules: judging is free, the conversation stays as saved
        r["safety_events"] = judge_lesson(r)
        r["flags"] = [f for f in r["flags"] if f != "unsafe_reply"]
        if any(e["critical"] and not e["passed"] for e in r["safety_events"]):
            r["flags"].append("unsafe_reply")
    run = class_run(tutor, results, tested_on, voice)
    tutor_modes = {lesson.get("tutor_mode", "ai") for lesson in lessons}
    run["tutor_mode"] = tutor_modes.pop() if len(tutor_modes) == 1 else "mixed"  # ai = real AI tutor
    save_json(out / f"{tutor['tutor_id']}.json", run)
    return run


def run_lab(tutor_ids, student_ids, out: Path, make_tutor, make_voice, budget: Budget | None = None,
            client: GeminiClient | None = None, voice_mode: str = "scripted", log=print) -> dict:
    """Teach every missing lesson. Returns counts: done, skipped, stopped (reason or None)."""
    done = skipped = 0
    for tid in tutor_ids:
        tutor = make_tutor(tid)
        for sid in student_ids:
            path = lesson_path(out, tid, sid)
            if load_lesson(path):
                skipped += 1
                continue
            if budget and not budget.can_afford(config.CALLS_PER_LESSON):
                return {"done": done, "skipped": skipped, "stopped": "daily AI budget reached; run again tomorrow"}
            before = client.calls if client else 0
            try:
                result = run_lesson(get_student(sid), tutor, make_voice())
            except QuotaError as error:
                if budget and client:
                    budget.spend(client.calls - before)
                return {"done": done, "skipped": skipped, "stopped": str(error)}
            if budget and client:
                budget.spend(client.calls - before)
            result.update(model_version=config.MODEL_VERSION, voice_mode=voice_mode,
                          tutor_mode="scripted" if client is None else "ai",
                          created=datetime.now(timezone.utc).isoformat(timespec="seconds"))
            save_json(path, result)
            done += 1
            log(f"  {tid:15s} {sid}  {result['before']} -> {result['after']}  {result['outcome']}"
                + (f"  (calls today: {budget.used})" if budget and client else ""))
        info = {"tutor_id": tid, "tutor_name": TUTOR_INFO[tid][0], "kind": "built_in"}
        run = build_class_run(out, info, list(student_ids)) if list(student_ids) == [s.id for s in STUDENTS] else None
        if run:
            sc = run["scores"]
            log(f"{tid}: class run saved. Safety {sc['safety']}, Usability {sc['usability']}, "
                f"Learning {sc['learning']}, average gain {run['summary']['avg_gain']}")
    return {"done": done, "skipped": skipped, "stopped": None}


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the lab: every tutor teaches the class of 30.")
    parser.add_argument("--tutors", default="all", help="comma-separated tutor ids, or 'all'")
    parser.add_argument("--students", default="all", help="comma-separated student ids, or 'all'")
    parser.add_argument("--offline", action="store_true", help="pre-written tutors and voice (no AI)")
    parser.add_argument("--voice", choices=("ai", "scripted"), default="ai", help="who writes the student lines")
    args = parser.parse_args()

    tutor_ids = list(config.LAB_ORDER) if args.tutors == "all" else args.tutors.split(",")
    student_ids = [s.id for s in STUDENTS] if args.students == "all" else args.students.split(",")
    for tid in tutor_ids:
        if tid not in TUTOR_INFO:
            sys.exit(f"No tutor called {tid!r}.")

    if args.offline:
        report = run_lab(tutor_ids, student_ids, config.OFFLINE_RUNS_DIR,
                         lambda tid: get_tutor(tid, offline=True), ScriptedVoice, log=lambda *_: None)
    else:
        from .voice.ai import AIVoice
        try:
            client = GeminiClient()
        except config.MissingKeyError as error:
            sys.exit(str(error))
        budget = Budget(config.RUNS_DIR / "budget.json", config.GEMINI_DAILY_BUDGET - config.GEMINI_RESERVE)
        voice = (lambda: AIVoice(client)) if args.voice == "ai" else ScriptedVoice
        print(f"AI calls already used today: {budget.used} of {budget.limit}. ~{config.CALLS_PER_LESSON} per lesson.")
        try:
            report = run_lab(tutor_ids, student_ids, config.RUNS_DIR, lambda tid: get_tutor(tid, client=client),
                             voice, budget, client, args.voice)
        except LLMError as error:
            sys.exit(f"Stopped: {error}\nFinished lessons are saved; run the same command again to resume.")
    print(f"Done {report['done']} lessons, skipped {report['skipped']} already saved.")
    if report["stopped"]:
        print(f"Stopped early: {report['stopped']}. Run the same command again to resume.")


if __name__ == "__main__":
    main()
