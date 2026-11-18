"""Demo-mode export (item 19): every GET response saved as JSON in data/export/.

    .venv/bin/python -m app.export

Calls the real app (no server needed), so the files are exactly what the API
returns. Kien and Nina copy the folder into the website's public folder and
load it when /api/health fails. live-lab/{tutor_id}.json holds the replay
events of GET /api/live-lab (the default 3 students) as a list, since a file can't stream. Example POST responses are saved too; ask and
chat examples need real AI calls, so they are only made with --with-ai.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys

from fastapi.testclient import TestClient

from . import catalog, config, live_lab
from .api import app
from .check import QUIZ_1, QUIZ_2, READING_QS

OUT = config.DATA_DIR / "export"
NEAR_CHECK = {  # a typical check: answers chosen to give a profile near the middle of the class
    "quiz_1": {"c1": "2/6", "c2": "7/10", "c3": None, "c4": "2/3", "c5": None},
    "quiz_2": {"c6": "4/10", "c7": "6/7", "c8": None, "c9": "3/4", "c10": "2/8"},
    "reading": {"r1": "3", "r2": "His sister", "r3": "Fewer guests were coming", "r4": None},
    "english_confidence": 3, "seconds_taken": 410,
}
# an unusual check: none right before the mini-lesson, all right after it, all reading right (no simulated student
# is like that, so it shows the "no ranking" answer)
FAR_CHECK = {"quiz_1": {q.id: next(o for o in q.options if o != q.answer) for q in QUIZ_1},
             "quiz_2": {q.id: q.answer for q in QUIZ_2},
             "reading": {q.id: q.answer for q in READING_QS}, "english_confidence": 4, "seconds_taken": 300}


def save(name: str, data) -> None:
    path = OUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=1, ensure_ascii=False))


def main() -> None:
    parser = argparse.ArgumentParser(description="Save every GET response for demo mode.")
    parser.add_argument("--with-ai", action="store_true", help="also save ask and chat examples (real AI calls)")
    args = parser.parse_args()
    if OUT.exists():
        shutil.rmtree(OUT)
    client = TestClient(app)

    def get(path: str):
        response = client.get(path)
        if response.status_code != 200:
            sys.exit(f"{path} answered {response.status_code}: {response.text[:200]}")
        return response.json()

    save("health.json", get("/api/health"))
    for name in ("tutors", "students", "ratings", "check", "test", "validation", "submissions"):
        save(f"{name}.json", get(f"/api/{name}"))
    save("real-tools.json", get("/api/real-tools"))
    for student in get("/api/students"):  # the Lab drawer's real tools, one file per simulated student
        save(f"real-tools/students/{student['id']}.json", get(f"/api/real-tools?student={student['id']}"))
    save("pilot.json", get("/api/pilot"))
    for tutor, _ in catalog.rated():
        save(f"runs/{tutor['tutor_id']}.json", get(f"/api/runs/{tutor['tutor_id']}"))
        save(f"report/{tutor['tutor_id']}.json", get(f"/api/report/{tutor['tutor_id']}"))
        if tutor["kind"] == "built_in":  # the live lab's replay events, for demo mode (no server to stream)
            events = live_lab.replay_events(tutor["tutor_id"], live_lab.parse_students(None))
            save(f"live-lab/{tutor['tutor_id']}.json", [{"event": e, "data": d} for e, d in events])

    match = client.post("/api/match", json=NEAR_CHECK).json()
    save("match-example.json", match)
    save("match-not-enough-example.json", client.post("/api/match", json=FAR_CHECK).json())
    save("test-score-example.json", client.post("/api/test/score", json={"answers": {"q1": "2/4", "q4": "3/5"}}).json())
    subs = get("/api/submissions")
    if subs:
        save("submission-example.json", subs[0])
    if args.with_ai:
        save("ask-example.json", client.post("/api/ask", json={"match_id": match["match_id"],
                                                               "question": "Why is the first demo tool best for me?"}).json())
        save("chat-example.json", client.post("/api/chat", json={"tutor_id": "simple_steps",
                                                                 "message": "how do i add 1/3 and 1/6"}).json())
    files = sorted(p.relative_to(OUT).as_posix() for p in OUT.rglob("*.json"))
    for f in files:
        json.loads((OUT / f).read_text())  # every file parses
    print(f"Saved {len(files)} files in {OUT.relative_to(config.BACKEND_DIR)}/ (all parse as JSON):")
    print("  " + "\n  ".join(files))


if __name__ == "__main__":
    main()
