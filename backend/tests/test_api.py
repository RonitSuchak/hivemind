"""API tests (need the .venv: .venv/bin/python -m unittest discover -s tests -t .)."""

import json
import re
import tempfile
import unittest
from pathlib import Path

try:
    from fastapi.testclient import TestClient
except ImportError:  # plain python3 without the .venv: skip these tests
    TestClient = None

from app import config


class FakeLive:
    def __init__(self):
        self.reply, self.seen, self.calls = "Look at the bottom numbers. What could you multiply 3 by?", [], 0

    def chat(self, system, chat):
        self.calls += 1
        self.seen.append((system, [m["text"] for m in chat]))
        return self.reply


@unittest.skipIf(TestClient is None, "FastAPI not installed (use backend/.venv)")
class ApiTests(unittest.TestCase):
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
        cls.store_root = root / "store"
        store.set_store(store.JsonStore(cls.store_root))
        cls.api = api
        cls.client = TestClient(api.app)

    @classmethod
    def tearDownClass(cls):
        config.RUNS_DIR, config.OFFLINE_RUNS_DIR = cls.saved
        from app import store
        store.set_store(None)
        cls.tmp.cleanup()

    def setUp(self):
        from app.limits import limiter
        limiter.reset()
        self.fake = FakeLive()
        self.api._live_client = self.fake

    # --- helpers
    def match(self, body=None):
        body = body or {"quiz_1": {"c1": "2/6", "c2": "7/10", "c3": None}, "quiz_2": {"c6": "4/10", "c7": "6/7"},
                        "reading": {"r1": "3", "r2": "His sister"}, "english_confidence": 3}
        r = self.client.post("/api/match", json=body)
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()

    def assertError(self, response, status, code):
        self.assertEqual(response.status_code, status, response.text)
        self.assertEqual(response.json()["error"]["code"], code)
        self.assertNotIn("Traceback", response.text)

    # --- lab
    def test_health_and_lab_routes(self):
        self.assertEqual(self.client.get("/api/health").json()["ok"], True)
        tutors = self.client.get("/api/tutors").json()
        self.assertEqual([t["tutor_id"] for t in tutors], list(config.LAB_ORDER))
        self.assertEqual(tutors[0]["try_url"], "/try/socratic")
        self.assertEqual(len(self.client.get("/api/students").json()), 30)
        run = self.client.get("/api/runs/simple_steps").json()
        self.assertEqual(len(run["results"]), 30)
        self.assertIn("evidence", run)
        self.assertEqual(len(self.client.get("/api/ratings").json()["rows"]), 5)
        self.assertIn("below_average", self.client.get("/api/report/lecturer").json())
        self.assertError(self.client.get("/api/runs/robot"), 404, "not_found")

    # --- database out of reach (e.g. a Wi-Fi that blocks port 5432)
    def test_the_laptop_demo_keeps_working_when_the_database_is_out_of_reach(self):
        from app import store

        class Unreachable:
            kind = "database"

            def __getattr__(self, name):
                def fail(*args, **kwargs):
                    raise store.StoreUnavailable("database unreachable")
                return fail

        store.set_store(Unreachable())
        try:
            with TestClient(self.api.app) as client:  # startup (resume runs) must not crash
                self.assertEqual(client.get("/api/health").json()["ok"], True)
                self.assertEqual(len(client.get("/api/tutors").json()), 5)
                for path in ("/api/students", "/api/runs/socratic", "/api/ratings", "/api/report/lecturer",
                             "/api/check", "/api/test"):
                    self.assertEqual(client.get(path).status_code, 200, path)
                body = {"quiz_1": {"c1": "2/6"}, "quiz_2": {"c6": "4/10"}, "reading": {"r1": "3"},
                        "english_confidence": 3}
                m = client.post("/api/match", json=body)
                self.assertEqual(m.status_code, 200, m.text)  # the check's result never needs the database
                self.assertError(client.post("/api/ask", json={"match_id": m.json()["match_id"], "question": "Why?"}),
                                 503, "store_unavailable")
                self.assertError(client.get("/api/validation"), 503, "store_unavailable")
                self.assertError(client.get("/api/submissions"), 503, "store_unavailable")
        finally:
            store.set_store(store.JsonStore(self.store_root))

    def test_an_unreachable_database_fails_fast_then_retries(self):
        from app import store

        class FakePsycopg:
            class OperationalError(Exception):
                pass

            calls = 0

            def connect(self, *args, **kwargs):
                FakePsycopg.calls += 1
                raise FakePsycopg.OperationalError("timeout")

        db = store.PostgresStore("postgresql://example.invalid/db")  # connects lazily: no error yet
        db._psycopg = FakePsycopg()
        with self.assertRaises(store.StoreUnavailable):
            db.list("submissions")
        with self.assertRaises(store.StoreUnavailable):  # refused at once, no second wait
            db.get("submissions", "sub_001")
        self.assertEqual(FakePsycopg.calls, 1)
        db._failed_at -= config.STORE_RETRY_SECONDS + 1  # 30 seconds later it tries again
        with self.assertRaises(store.StoreUnavailable):
            db.list("submissions")
        self.assertEqual(FakePsycopg.calls, 2)

    # --- advisor
    def test_match_has_the_contract_shape_and_is_stored(self):
        m = self.match()
        for key in ("match_id", "enough_matches", "profile", "radar", "matches", "ranked", "follow_ups", "message",
                    "note"):
            self.assertIn(key, m)
        self.assertNotIn("tags", m["profile"])
        self.assertAlmostEqual(sum(x["weight"] for x in m["matches"]), 1.0)
        self.assertTrue((self.store_root / "matches" / f"{m['match_id']}.json").exists())
        self.assertIn("real_tools", m)
        if m["enough_matches"]:
            self.assertTrue(m["real_tools"] and all(t["estimated"] for t in m["real_tools"]))
            self.assertNotIn("scores", m["real_tools"][0])

    def test_real_tools_endpoint(self):
        r = self.client.get("/api/real-tools")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.json()["tools"]), 78)

    def test_match_topic_filters_real_tools_and_extras_are_stored_not_scored(self):
        from app.export import NEAR_CHECK
        plain = self.match(dict(NEAR_CHECK))
        extras = {"pack": "languages-spanish-basics", "language": [{"id": "es-l1", "answer": "Hola"}],
                  "hard": {"id": "es-c1", "answer": "B", "hints_opened": 2}}
        m = self.match({**NEAR_CHECK, "topic": {"subject": "Languages", "advanced": False}, "extras": extras})
        self.assertEqual(m["topic"], {"subject": "Languages", "advanced": False})
        self.assertEqual((m["profile"], m["ranked"]), (plain["profile"], plain["ranked"]))  # never scored
        self.assertLess(len(m["real_tools"]), len(plain["real_tools"]))
        self.assertTrue(all(not t["subjects"] or "Languages" in t["subjects"] for t in m["real_tools"]))
        self.assertIsNone(plain["topic"])
        saved = json.loads((self.store_root / "matches" / f"{m['match_id']}.json").read_text())
        self.assertEqual(saved["extras"], extras)
        self.assertEqual(saved["topic"], m["topic"])

    def test_match_extras_are_checked_and_capped(self):
        from app.export import NEAR_CHECK
        bad = [{"language": [{"id": "x"}] * 11}, {"language": [{"id": "x", "answer": "a" * 201}]},
               {"hard": {"id": "c", "hints_opened": 11}}, {"hard": {"id": "c", "secret": 1}},
               {"pack": "p" * 61}]
        for extras in bad:
            r = self.client.post("/api/match", json={**NEAR_CHECK, "extras": extras})
            self.assertEqual((r.status_code, r.json()["error"]["code"]), (400, "invalid_input"), extras)
        r = self.client.post("/api/match", json={**NEAR_CHECK, "topic": {"subject": "x" * 41}})
        self.assertEqual(r.status_code, 400)

    def test_real_tools_for_one_simulated_student(self):
        r = self.client.get("/api/real-tools", params={"student": "s07"})
        self.assertEqual(r.status_code, 200)
        data = r.json()
        types = data["types"]
        self.assertEqual([t["rank"] for t in types], list(range(1, len(types) + 1)))
        safe = [t for t in types if not t["safety_concern"]]
        self.assertEqual(types[:len(safe)], safe)  # safety concerns last
        self.assertEqual([t["gain"] for t in safe], sorted((t["gain"] for t in safe), reverse=True))
        top = max(t["gain"] for t in safe)
        self.assertEqual(set(data["best"]["tutor_ids"]),
                         {t["tutor_id"] for t in safe if t["gain"] == top and
                          any(x["type"]["tutor_id"] == t["tutor_id"] for x in data["tools"])})
        self.assertTrue(data["tools"] and all(t["fits_lab_lesson"] for t in data["tools"]))
        self.assertEqual([t["type_rank"] for t in data["tools"]], sorted(t["type_rank"] for t in data["tools"]))
        self.assertTrue(all("gain" not in t and "scores" not in t for t in data["tools"]))
        physics = self.client.get("/api/real-tools", params={"student": "s07", "subject": "Physics"}).json()
        self.assertEqual(physics["topic"], {"subject": "Physics", "advanced": False})
        self.assertTrue(all(not t["subjects"] or "Physics" in t["subjects"] for t in physics["tools"]))

    def test_real_tools_query_errors(self):
        cases = [({"student": "zz"}, 404), ({"subject": "Maths"}, 400), ({"student": "s07", "subject": ""}, 400)]
        for params, status in cases:
            self.assertEqual(self.client.get("/api/real-tools", params=params).status_code, status, params)

    def test_far_profile_from_the_check_gets_no_ranking(self):
        from app.check import QUIZ_1, QUIZ_2, READING_QS
        m = self.match({"quiz_1": {q.id: q.answer for q in QUIZ_1},
                        "quiz_2": {q.id: q.options[1] for q in QUIZ_2},  # all wrong after the lesson
                        "reading": {q.id: q.answer for q in READING_QS}, "english_confidence": 1})
        self.assertFalse(m["enough_matches"])
        self.assertEqual(m["ranked"], [])
        self.assertEqual(m["real_tools"], [])  # no ranking, no guessing

    def test_ask_answers_counts_and_stops_at_5(self):
        m = self.match()
        for left in (4, 3, 2, 1, 0):
            r = self.client.post("/api/ask", json={"match_id": m["match_id"], "question": "Why is it first?"})
            self.assertEqual(r.status_code, 200, r.text)
            self.assertEqual(r.json()["questions_left"], left)
        self.assertError(self.client.post("/api/ask", json={"match_id": m["match_id"], "question": "And?"}),
                         429, "question_limit")

    def test_ask_refuses_off_topic_and_long_questions(self):
        m = self.match()
        self.fake.reply = "OFF_TOPIC"
        r = self.client.post("/api/ask", json={"match_id": m["match_id"], "question": "Who won the football?"})
        self.assertTrue(r.json()["refused"])
        self.assertError(self.client.post("/api/ask", json={"match_id": m["match_id"], "question": "x" * 301}),
                         400, "too_long")

    def test_ask_works_on_its_own_with_a_profile(self):
        profile = {"start_level": 0.33, "learn_speed": 0.75, "reading_age": 10, "english": 0.5, "persistence": 0.6}
        r = self.client.post("/api/ask", json={"profile": profile, "question": "Why is it first?"})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertTrue(r.json()["match_id"].startswith("m_"))

    # --- live chat
    def test_chat_round_trip_and_turn_13_is_rejected(self):
        r = self.client.post("/api/chat", json={"tutor_id": "simple_steps", "message": "how do i add 1/3 and 1/6"})
        body = r.json()
        self.assertEqual((body["turn"], body["turns_left"], body["replaced"]), (1, 11, False))
        self.assertIn("A real young person", self.fake.seen[-1][0])  # live-only safety instruction
        for _ in range(11):
            last = self.client.post("/api/chat", json={"tutor_id": "simple_steps", "session_id": body["session_id"],
                                                       "message": "ok"})
            self.assertEqual(last.status_code, 200)
        self.assertEqual(last.json()["turns_left"], 0)
        self.assertError(self.client.post("/api/chat", json={"tutor_id": "simple_steps",
                                                             "session_id": body["session_id"], "message": "13"}),
                         400, "turn_limit")

    def test_chat_rejects_a_501_character_message_before_calling_the_ai(self):
        self.assertError(self.client.post("/api/chat", json={"tutor_id": "socratic", "message": "a" * 501}),
                         400, "too_long")
        self.assertEqual(self.fake.calls, 0)
        ok = self.client.post("/api/chat", json={"tutor_id": "socratic", "message": "a" * 500})
        self.assertEqual(ok.status_code, 200)

    def test_chat_refuses_a_tutor_that_failed_a_critical_check(self):
        self.assertError(self.client.post("/api/chat", json={"tutor_id": "cheerleader", "message": "hi"}),
                         403, "safety_concern")
        self.assertEqual(self.fake.calls, 0)

    def test_an_unsafe_reply_is_replaced_and_logged_without_the_text(self):
        self.fake.reply = "Cool! Which school do you go to?"
        body = self.client.post("/api/chat", json={"tutor_id": "socratic", "message": "hi"}).json()
        self.assertTrue(body["replaced"])
        self.assertNotIn("school do you go", body["reply"])
        self.assertTrue(body["notice"])
        events = [json.loads(p.read_text()) for p in (self.store_root / "live_events").glob("*.json")]
        self.assertTrue(any(e["rules"] == ["asks_personal_info"] for e in events))
        self.assertTrue(all(set(e) == {"tutor_id", "rules", "at"} for e in events))

    def test_personal_details_never_reach_the_ai(self):
        self.client.post("/api/chat", json={"tutor_id": "socratic", "message": "I live at 12 Oak Road, CB1 2AB"})
        sent = " ".join(self.fake.seen[-1][1]).lower()
        self.assertNotIn("oak road", sent)
        self.assertNotIn("cb1 2ab", sent)

    def test_expired_session(self):
        self.assertError(self.client.post("/api/chat", json={"tutor_id": "socratic", "session_id": "c_nope",
                                                             "message": "hi"}), 404, "session_expired")

    # --- real-classmate check
    def test_validation_round_trip(self):
        test = self.client.get("/api/test").json()
        self.assertEqual(len(test["questions"]), 10)
        self.assertNotIn("answer", json.dumps(test))
        score = self.client.post("/api/test/score", json={"answers": {"q1": "2/4", "q2": "6/8", "q3": None}}).json()
        self.assertEqual(score, {"score": 2, "out_of": 10, "answered": 2})
        m = self.match()
        entry = self.client.post("/api/validation", json={"match_id": m["match_id"], "tutor_id": "simple_steps",
                                                          "before": 4, "after": 7}).json()
        self.assertRegex(entry["code"], r"^HM-[A-Z0-9]{4}$")
        self.assertEqual(entry["real_gain"], 3)
        self.assertEqual(entry["difference"], round(3 - entry["predicted_gain"], 1))
        listed = self.client.get("/api/validation").json()
        self.assertIn(entry["code"], [e["code"] for e in listed["entries"]])
        self.assertGreaterEqual(listed["summary"]["count"], 1)

    def test_validation_refuses_names_as_codes(self):
        m = self.match()
        self.assertError(self.client.post("/api/validation", json={"code": "Ronit", "match_id": m["match_id"],
                                                                   "tutor_id": "socratic", "before": 1, "after": 2}),
                         400, "invalid_input")

    # --- admin
    def test_admin_routes_reject_a_wrong_password_and_are_off_without_one(self):
        import os
        from unittest import mock
        with mock.patch.dict(os.environ, {"ADMIN_PASSWORD": "right-test-password"}):
            self.assertError(self.client.delete("/api/admin/validation/HM-AAAA",
                                                headers={"X-Admin-Password": "wrong"}), 401, "unauthorized")
            self.assertError(self.client.delete("/api/admin/validation/HM-AAAA"), 401, "unauthorized")
            self.assertError(self.client.delete("/api/admin/validation/HM-AAAA",
                                                headers={"X-Admin-Password": "right-test-password"}), 404, "not_found")
        with mock.patch.object(config, "setting", lambda name, default=None, *a: "" if name == "ADMIN_PASSWORD"
                               else default):
            self.assertError(self.client.delete("/api/admin/validation/HM-AAAA",
                                                headers={"X-Admin-Password": "x"}), 503, "not_configured")

    def test_approve_and_reject_reject_a_wrong_password(self):
        import os
        from unittest import mock
        with mock.patch.dict(os.environ, {"ADMIN_PASSWORD": "right-test-password"}):
            for action in ("approve", "reject"):
                self.assertError(self.client.post(f"/api/admin/submissions/sub_001/{action}",
                                                  headers={"X-Admin-Password": "nope"}), 401, "unauthorized")

    def test_an_http_submission_is_refused_with_a_reason(self):
        body = {"product": "X", "tutor_url": "http://x.example/chat", "product_url": "https://x.example/",
                "contact_email": "a@x.example", "subject": "Fractions", "age_range": "11-14", "agreed_terms": True}
        sub = self.client.post("/api/submissions", json=body).json()
        self.assertEqual(sub["status"], "failed")
        self.assertEqual(sub["checks"][0]["name"], "secure_link")
        self.assertNotIn("contact_email", sub)

    # --- errors, limits, privacy
    def test_errors_have_the_contract_shape(self):
        self.assertError(self.client.get("/api/nothing-here"), 404, "not_found")
        self.assertError(self.client.post("/api/chat", json={"tutor_id": "socratic"}), 400, "invalid_input")
        self.assertError(self.client.post("/api/ask", content=b"x" * (config.MAX_BODY_BYTES + 1),
                                          headers={"content-type": "application/json"}), 400, "too_long")

    def test_rate_limit_answers_429_with_retry_after(self):
        for _ in range(config.RATE_LIMITS["match"][0]):
            self.client.post("/api/match", json={})
        r = self.client.post("/api/match", json={})
        self.assertError(r, 429, "rate_limited")
        self.assertTrue(r.headers["retry-after"].isdigit())

    # --- security audit fixes (SECURITY-AUDIT-2026-11-15.md)
    def test_a_faked_x_forwarded_for_cannot_dodge_the_rate_limit(self):
        limit = config.RATE_LIMITS["chat"][0]
        codes = [self.client.post("/api/chat", headers={"X-Forwarded-For": f"203.0.113.{i}"},
                                  json={"tutor_id": "cheerleader", "message": "hi"}).status_code
                 for i in range(limit + 1)]
        self.assertEqual(codes[:limit], [403] * limit)
        self.assertEqual(codes[-1], 429)

    def test_a_chunked_body_over_16_kb_is_refused_without_reading_it_all(self):
        def chunks():  # no content-length header: sent in pieces
            for _ in range(40):
                yield b"x" * 1024
        r = self.client.post("/api/match", content=chunks(), headers={"content-type": "application/json"})
        self.assertError(r, 400, "too_long")

    def test_a_small_chunked_body_still_works(self):
        def chunks():
            yield b'{"quiz_1": {"c1": "2/6"},'
            yield b' "english_confidence": 3}'
        r = self.client.post("/api/match", content=chunks(), headers={"content-type": "application/json"})
        self.assertEqual(r.status_code, 200, r.text)

    def test_security_headers_on_every_response(self):
        for r in (self.client.get("/api/health"), self.client.get("/api/runs/robot"),
                  self.client.post("/api/ask", content=b"x" * (config.MAX_BODY_BYTES + 1),
                                   headers={"content-type": "application/json"})):
            self.assertEqual(r.headers["x-content-type-options"], "nosniff")
            self.assertEqual(r.headers["x-frame-options"], "DENY")
            self.assertEqual(r.headers["referrer-policy"], "no-referrer")
            self.assertIn("frame-ancestors 'none'", r.headers["content-security-policy"])
        self.assertNotIn("content-security-policy", self.client.get("/docs").headers)  # docs need their scripts

    def test_no_route_returns_an_email_or_a_key(self):
        pages = ["/api/health", "/api/tutors", "/api/students", "/api/runs/socratic", "/api/ratings",
                 "/api/report/socratic", "/api/check", "/api/test", "/api/validation"]
        text = " ".join(self.client.get(p).text for p in pages) + json.dumps(self.match())
        self.assertIsNone(re.search(r"[\w.+-]+@[\w-]+\.[a-z]{2,}", text))
        for secret in ("api_key", "GEMINI_API_KEY", "ADMIN_PASSWORD", "DATABASE_URL", "x-goog-api-key", "contact_email"):
            self.assertNotIn(secret, text)


if __name__ == "__main__":
    unittest.main()
