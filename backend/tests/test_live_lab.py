"""Live lab (GET /api/live-lab): live mode with a fake AI, and replay of saved lessons."""

import json
import re
import tempfile
import unittest
from pathlib import Path
from unittest import mock

try:
    from fastapi.testclient import TestClient
except ImportError:
    TestClient = None

from app import config


def events(text: str) -> list[tuple[str, dict]]:
    return [(m.group(1), json.loads(m.group(2)))
            for m in re.finditer(r"^event: (\w+)\nid: \d+\ndata: (.*)$", text, re.M)]


class FakeClient:
    def __init__(self):
        self.calls = 0


class CountingTutor:
    """A pre-written tutor that counts its replies like AI calls."""

    def __init__(self, tutor_id, client):
        from app.tutors import ScriptedTutor
        self.inner, self.client, self.tutor_id = ScriptedTutor(tutor_id), client, tutor_id

    def reply(self, chat, problem=None):
        self.client.calls += 1
        return self.inner.reply(chat, problem)


@unittest.skipIf(TestClient is None, "FastAPI not installed (use backend/.venv)")
class LiveLabTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from app import api, store
        from app.lab import run_lab
        from app.students import STUDENTS
        from app.tutors import ScriptedTutor
        from app.voice import ScriptedVoice

        cls.tmp = tempfile.TemporaryDirectory()
        root = Path(cls.tmp.name)
        cls.saved = (config.RUNS_DIR, config.OFFLINE_RUNS_DIR)
        config.RUNS_DIR, config.OFFLINE_RUNS_DIR = root / "none", root / "offline"
        run_lab(list(config.LAB_ORDER), [s.id for s in STUDENTS], config.OFFLINE_RUNS_DIR, ScriptedTutor,
                ScriptedVoice, log=lambda *_: None)
        store.set_store(store.JsonStore(root / "store"))
        cls.client = TestClient(api.app)

    @classmethod
    def tearDownClass(cls):
        from app import store
        config.RUNS_DIR, config.OFFLINE_RUNS_DIR = cls.saved
        store.set_store(None)
        cls.tmp.cleanup()

    def setUp(self):
        from app import live_lab
        from app.limits import limiter
        from app.voice import ScriptedVoice
        limiter.reset()
        live_lab.slot.free()
        self.fake = FakeClient()
        self.budget = Path(self.tmp.name) / "budget.json"
        self.budget.unlink(missing_ok=True)
        self.patches = [mock.patch.object(live_lab, "client_factory", lambda: self.fake),
                        mock.patch.object(live_lab, "tutor_factory", CountingTutor),
                        mock.patch.object(live_lab, "voice_factory", lambda c: ScriptedVoice()),
                        mock.patch.object(live_lab, "budget_path", self.budget)]
        for p in self.patches:
            p.start()

    def tearDown(self):
        for p in self.patches:
            p.stop()

    def get(self, **params):
        return self.client.get("/api/live-lab", params=params)

    def test_live_run_streams_every_step_in_order(self):
        res = self.get(tutor_id="socratic", students="s04,s10")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.headers["content-type"].startswith("text/event-stream"))
        evs = events(res.text)
        names = [e for e, _ in evs]
        self.assertEqual(names[0], "start")
        self.assertEqual(names[-2:], ["scores", "done"])
        self.assertEqual(names.count("lesson_start"), 2)
        self.assertEqual(names.count("lesson_end"), 2)
        self.assertEqual(evs[0][1]["mode"], "live")
        tutor_msgs = [d for e, d in evs if e == "message" and d["from"] == "tutor"]
        self.assertTrue(all({"move", "reading_age", "too_hard"} <= set(d["label"]) for d in tutor_msgs))
        self.assertTrue(all(d["knowledge"]["after"] >= d["knowledge"]["before"] for d in tutor_msgs))
        privacy = [d for e, d in evs if e == "safety" and d["student_id"] == "s04"]
        self.assertEqual(privacy[0]["type"], "privacy")  # s04's trap, judged live
        scores = evs[-2][1]
        self.assertEqual(scores["sample"], 2)
        self.assertEqual(set(scores["scores"]), {"safety", "usability", "learning"})
        self.assertIsNotNone(scores["official_scores"])
        self.assertTrue(scores["note"])

    def test_live_calls_count_towards_the_shared_daily_budget(self):
        self.get(tutor_id="simple_steps", students="s10")
        self.assertGreater(self.fake.calls, 0)
        self.assertEqual(json.loads(self.budget.read_text())["calls"], self.fake.calls)

    def test_live_refuses_when_the_budget_is_used_up(self):
        from app.lab import pacific_date
        self.budget.write_text(json.dumps({"date": pacific_date(), "calls": config.GEMINI_DAILY_BUDGET - 5}))
        res = self.get(tutor_id="socratic")
        self.assertEqual((res.status_code, res.json()["error"]["code"]), (503, "budget_reached"))

    def test_only_one_live_run_at_a_time(self):
        from app import live_lab
        self.assertTrue(live_lab.slot.take())
        res = self.get(tutor_id="socratic")
        self.assertEqual((res.status_code, res.json()["error"]["code"]), (409, "busy"))
        replay = self.get(tutor_id="socratic", mode="replay", delay=0)
        self.assertEqual(replay.status_code, 200)  # replay never needs the slot
        live_lab.slot.free()
        self.assertEqual(self.get(tutor_id="socratic", students="s10").status_code, 200)
        self.assertTrue(live_lab.slot.take())  # freed again after the run

    def test_a_tool_that_failed_safety_cannot_run_live_but_can_replay(self):
        from app import live_lab
        real = live_lab.built_in
        with mock.patch.object(live_lab, "built_in", lambda tid: {**real(tid), "live_chat": False}):
            res = self.get(tutor_id="socratic")
            self.assertEqual((res.status_code, res.json()["error"]["code"]), (403, "safety_concern"))
            self.assertEqual(self.get(tutor_id="socratic", mode="replay", delay=0).status_code, 200)

    def test_bad_requests(self):
        cases = [dict(tutor_id="nope"), dict(tutor_id="socratic", students="s01,s02,s03,s04"),
                 dict(tutor_id="socratic", students="s01,s01"), dict(tutor_id="socratic", students="x9"),
                 dict(tutor_id="socratic", mode="fast"), dict(tutor_id="socratic", mode="replay", delay=9)]
        codes = [(r.status_code, r.json()["error"]["code"]) for r in (self.get(**c) for c in cases)]
        self.assertEqual(codes, [(404, "not_found")] + [(400, "invalid_input")] * 5)
        self.assertEqual(self.fake.calls, 0)

    def test_an_ai_failure_ends_the_stream_with_an_error_event(self):
        from app import live_lab
        from app.llm import LLMError

        class Broken(CountingTutor):
            def reply(self, chat, problem=None):
                raise LLMError("down")

        with mock.patch.object(live_lab, "tutor_factory", Broken):
            evs = events(self.get(tutor_id="socratic", students="s10").text)
        self.assertEqual(evs[-1][0], "error")
        self.assertEqual(evs[-1][1]["code"], "ai_unavailable")
        self.assertTrue(live_lab.slot.take())  # the slot was freed

    def test_live_is_rate_limited(self):
        codes = [self.get(tutor_id="simple_steps", students="s10").status_code
                 for _ in range(config.RATE_LIMITS["live_lab"][0] + 1)]
        self.assertEqual(codes[-1], 429)

    def test_replay_matches_the_saved_lessons_with_no_ai(self):
        from app import catalog
        res = self.get(tutor_id="simple_steps", mode="replay", delay=0)
        evs = events(res.text)
        self.assertEqual(self.fake.calls, 0)
        self.assertEqual(evs[0][1]["mode"], "replay")
        self.assertEqual([s["id"] for s in evs[0][1]["students"]], ["s10", "s24", "s09"])  # the pilot students
        saved = {r["student_id"]: r for r in catalog.run("simple_steps")["results"]}
        for sid in ("s10", "s24", "s09"):
            texts = [d["text"] for e, d in evs if e == "message" and d["student_id"] == sid]
            self.assertEqual(texts, [m["text"] for m in saved[sid]["transcript"]])
            end = next(d for e, d in evs if e == "lesson_end" and d["student_id"] == sid)
            self.assertEqual(end["gain"], saved[sid]["gain"])

    def test_replay_and_live_send_the_same_event_shapes(self):
        live = events(self.get(tutor_id="simple_steps", students="s10").text)
        replay = events(self.get(tutor_id="simple_steps", students="s10", mode="replay", delay=0).text)
        self.assertEqual([e for e, _ in live], [e for e, _ in replay])
        for (_, a), (_, b) in zip(live, replay):
            self.assertEqual(set(a) - {"tutor_mode", "tested_on"}, set(b) - {"tutor_mode", "tested_on"})

    def test_replay_waits_between_messages_only(self):
        from app import live_lab
        waits = []
        evs = live_lab.replay_events("socratic", live_lab.parse_students("s10"))
        list(live_lab.replay_stream(evs, 1.5, sleep=waits.append))
        self.assertEqual(len(waits), sum(e == "message" for e, _ in evs))
        self.assertTrue(all(w == 1.5 for w in waits))


if __name__ == "__main__":
    unittest.main()
