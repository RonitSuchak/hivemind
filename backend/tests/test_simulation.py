import os
import tempfile
import unittest
from pathlib import Path
from statistics import mean
from unittest import mock

from app import config
from app.llm import GeminiClient
from app.simulation import SAFETY_TURN, run_lesson
from app.students import SAFETY_MOMENTS, STUDENTS, get_student
from app.tutors import TUTOR_INFO, ScriptedTutor

CONTRACT_KEYS = {"student_id", "tutor_id", "before", "after", "gain", "outcome", "gave_up",
                 "problems_solved", "flags", "safety_events", "progress", "transcript"}

RUNS = {tid: [run_lesson(s, ScriptedTutor(tid)) for s in STUDENTS] for tid in TUTOR_INFO}


def knowledge_gain(result):
    return result["progress"][-1] - result["progress"][0]


class SimulationTests(unittest.TestCase):
    def test_every_lesson_has_the_backend_guide_shape(self):
        for results in RUNS.values():
            for r in results:
                self.assertEqual(set(r), CONTRACT_KEYS)
                self.assertIn(r["outcome"], {"learned", "a_little", "left_behind"})
                self.assertGreaterEqual(r["gain"], 0)
                tutor_turns = sum(1 for m in r["transcript"] if m["from"] == "tutor")
                self.assertEqual(len(r["progress"]), tutor_turns + 1)

    def test_questions_teach_more_than_giving_answers(self):
        self.assertGreater(mean(map(knowledge_gain, RUNS["socratic"])),
                           mean(map(knowledge_gain, RUNS["answer_machine"])))

    def test_simple_steps_beats_the_lecturer(self):
        self.assertGreater(mean(map(knowledge_gain, RUNS["simple_steps"])),
                           mean(map(knowledge_gain, RUNS["lecturer"])))

    def test_low_readers_give_up_more_with_the_lecturer(self):
        low = [s.id for s in STUDENTS if "younger_reader" in s.tags]
        def gave_up(tid):
            return sum(r["gave_up"] for r in RUNS[tid] if r["student_id"] in low)
        self.assertGreater(gave_up("lecturer"), gave_up("simple_steps"))

    def test_answer_machine_is_flagged(self):
        self.assertTrue(all("gave_answer" in r["flags"] for r in RUNS["answer_machine"]))

    def test_safety_moment_comes_right_after_tutor_turn_3(self):
        for tid in TUTOR_INFO:
            for student_id, kind in SAFETY_MOMENTS.items():
                result = run_lesson(get_student(student_id), ScriptedTutor(tid))
                transcript = result["transcript"]
                spot = next(i for i, m in enumerate(transcript) if m.get("safety_moment"))
                self.assertEqual(transcript[spot]["safety_moment"], kind)
                self.assertEqual(transcript[spot - 1]["from"], "tutor")
                self.assertEqual(transcript[spot - 1]["turn"], transcript[spot]["turn"])
                # at turn 3, or earlier only if the student was about to give up or finish
                if transcript[spot]["turn"] != SAFETY_TURN:
                    self.assertLess(transcript[spot]["turn"], SAFETY_TURN)
                    self.assertTrue(result["gave_up"] or result["problems_solved"] == 3, (tid, student_id))

    def test_every_tutor_faces_every_safety_moment_and_answers_it(self):
        for tid, results in RUNS.items():
            for r in results:
                kind = SAFETY_MOMENTS.get(r["student_id"])
                if not kind:
                    continue
                transcript = r["transcript"]
                spots = [i for i, m in enumerate(transcript) if m.get("safety_moment")]
                self.assertEqual(len(spots), 1, (tid, r["student_id"]))
                self.assertEqual(transcript[spots[0]]["safety_moment"], kind)
                self.assertEqual(transcript[spots[0] + 1]["from"], "tutor", (tid, r["student_id"]))

    def test_a_student_who_stays_wrong_does_not_move_on(self):
        class Praise(ScriptedTutor):  # teaches nothing, but doesn't frustrate either
            def reply(self, chat, problem=None):
                return "Great effort, keep going!"
        result = run_lesson(get_student("s10"), Praise("simple_steps"))
        attempts = [m for m in result["transcript"] if m.get("attempt")]
        self.assertEqual(len(attempts), 5)
        self.assertTrue(all(m["attempt"] != "right" for m in attempts))
        self.assertEqual(result["problems_solved"], 0)
        self.assertFalse(any("next" in m["text"].lower() for m in attempts))
        self.assertIn("stuck", result["flags"])

    def test_a_right_attempt_moves_on_to_the_next_problem(self):
        result = run_lesson(get_student("s06"), ScriptedTutor("socratic"))  # Fatima starts high
        first = next(m for m in result["transcript"] if m.get("attempt"))
        self.assertEqual(first["attempt"], "right")
        self.assertIn("2/9 + 4/9", first["text"])
        self.assertGreaterEqual(result["problems_solved"], 1)

    def test_every_line_has_a_turn_and_turns_count_up(self):
        for results in RUNS.values():
            for r in results:
                turns = [m["turn"] for m in r["transcript"]]
                self.assertEqual(turns[0], 0)
                self.assertEqual(turns, sorted(turns))
                tutor_turns = [m["turn"] for m in r["transcript"] if m["from"] == "tutor"]
                self.assertEqual(tutor_turns, list(range(1, len(tutor_turns) + 1)))

    def test_good_tutors_reach_the_tuned_target_for_well_matched_students(self):
        from statistics import median
        for tid in ("socratic", "simple_steps"):
            matched = [r["gain"] for r, s in zip(RUNS[tid], STUDENTS)
                       if s.start_level <= 0.5 and "too_hard_to_read" not in r["flags"]]
            self.assertGreaterEqual(median(matched), 3, tid)
        self.assertLessEqual(mean(r["gain"] for r in RUNS["answer_machine"]), 1)

    def test_students_without_a_safety_moment_never_get_one(self):
        for r in RUNS["simple_steps"]:
            if r["student_id"] not in SAFETY_MOMENTS:
                self.assertFalse(any("safety_moment" in m for m in r["transcript"]))


class GeminiClientTests(unittest.TestCase):
    def test_missing_key_gives_a_helpful_message(self):
        missing = Path(tempfile.gettempdir()) / "no-such-hivemind.env"
        with mock.patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(config.MissingKeyError, ".env"):
                config.gemini_key(missing)

    def test_key_goes_in_a_header_not_the_web_address(self):
        client = GeminiClient(api_key="test-key-not-real", model="gemini-test", min_seconds=0)
        request = client.build_request("Be a tutor.", [{"from": "student", "text": "Hi"}])
        self.assertNotIn("test-key-not-real", request.full_url)
        self.assertEqual(request.get_header("X-goog-api-key"), "test-key-not-real")

    def test_timeouts_are_retried_then_reported_clearly(self):
        client = GeminiClient(api_key="x", model="gemini-test", min_seconds=0, timeout=1)
        with mock.patch("urllib.request.urlopen", side_effect=TimeoutError) as urlopen:
            with self.assertRaisesRegex(Exception, "did not answer"):
                client.chat("s", [{"from": "student", "text": "a"}])
        self.assertEqual(urlopen.call_count, 4)

    def test_a_network_blip_is_retried_then_reported_clearly(self):
        import urllib.error
        client = GeminiClient(api_key="x", model="gemini-test", min_seconds=0)
        blip = urllib.error.URLError("nodename nor servname provided")
        with mock.patch("urllib.request.urlopen", side_effect=blip) as urlopen, mock.patch("time.sleep"):
            with self.assertRaisesRegex(Exception, "Could not reach Gemini"):
                client.chat("s", [{"from": "student", "text": "a"}])
        self.assertEqual(urlopen.call_count, 4)

    def test_student_and_tutor_become_user_and_model(self):
        client = GeminiClient(api_key="x", model="gemini-test", min_seconds=0)
        request = client.build_request("s", [{"from": "student", "text": "a"}, {"from": "tutor", "text": "b"}])
        self.assertIn(b'"role": "user"', request.data)
        self.assertIn(b'"role": "model"', request.data)


if __name__ == "__main__":
    unittest.main()
