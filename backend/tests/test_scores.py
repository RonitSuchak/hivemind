import unittest

from app import config
from app.scores import bias, class_run, normalised_gain
from app.simulation import run_lesson
from app.students import STUDENTS
from app.tutors import TUTOR_INFO, ScriptedTutor


def run_for(tid):
    tutor = ScriptedTutor(tid)
    return class_run({"tutor_id": tid, "tutor_name": tutor.name}, [run_lesson(s, tutor) for s in STUDENTS],
                     "2026-11-15", "scripted")


RUNS = {tid: run_for(tid) for tid in TUTOR_INFO}


class ScoreTests(unittest.TestCase):
    def test_scores_are_stars_with_one_decimal(self):
        for run in RUNS.values():
            for value in run["scores"].values():
                self.assertTrue(1.0 <= value <= 5.0)
                self.assertEqual(value, round(value, 1))

    def test_class_run_shape(self):
        run = RUNS["socratic"]
        for key in ("tutor_id", "tutor_name", "kind", "tested_on", "model_version", "voice", "summary",
                    "scores", "evidence", "safety", "results"):
            self.assertIn(key, run)
        self.assertEqual(len(run["results"]), 30)
        self.assertEqual(sum(run["summary"][k] for k in ("learned", "a_little", "left_behind")), 30)
        self.assertEqual([c["type"] for c in run["safety"]["checks"]],
                         ["privacy", "inappropriate", "wellbeing", "wrong_sum", "misinformation",
                          "asks_personal_info"])

    def test_a_critical_fail_caps_safety_at_2(self):
        run = RUNS["cheerleader"]
        self.assertTrue(run["safety"]["critical_fail"])
        self.assertLessEqual(run["scores"]["safety"], config.SAFETY_CRITICAL_CAP)
        self.assertEqual(RUNS["simple_steps"]["scores"]["safety"], 5.0)

    def test_safety_formula_is_passed_over_tested(self):
        traps = [c for c in RUNS["cheerleader"]["safety"]["checks"]
                 if c["type"] not in ("misinformation", "asks_personal_info")]
        self.assertEqual(sum(c["tested"] for c in traps), 8)

    def test_learning_rewards_thinking_and_usability_rewards_readable_replies(self):
        self.assertGreater(RUNS["socratic"]["scores"]["learning"], RUNS["answer_machine"]["scores"]["learning"])
        self.assertGreater(RUNS["simple_steps"]["scores"]["usability"], RUNS["lecturer"]["scores"]["usability"])

    def test_evidence_points_to_real_transcript_lines(self):
        for run in RUNS.values():
            lessons = {r["student_id"]: r for r in run["results"]}
            for score, items in run["evidence"].items():
                self.assertLessEqual(len(items), config.EVIDENCE_MAX)
                for item in items:
                    self.assertEqual(set(item), {"student_id", "turn", "quote", "reason", "effect"})
                    self.assertIn(item["effect"], {"positive", "negative"})
                    self.assertLessEqual(len(item["quote"]), config.QUOTE_MAX)
                    lines = [m["text"] for m in lessons[item["student_id"]]["transcript"] if m["turn"] == item["turn"]]
                    self.assertTrue(any(t.startswith(item["quote"].rstrip("…")) for t in lines), (score, item))

    def test_every_score_has_evidence(self):
        for tid, run in RUNS.items():
            for score in ("safety", "usability", "learning"):
                self.assertTrue(run["evidence"][score], (tid, score))


class BiasTests(unittest.TestCase):
    def fake(self, gains_by_student):
        return [{"student_id": s.id, "before": 3, "gain": gains_by_student(s), "transcript": [], "safety_events": []}
                for s in STUDENTS]

    def test_a_group_left_far_behind_is_flagged(self):
        results = self.fake(lambda s: 0 if "new_to_english" in s.tags else 4)
        info = bias(results)
        self.assertTrue(info["flagged"])
        self.assertEqual(info["group"], "new_to_english")
        self.assertEqual(info["group_label"], "New to English")

    def test_an_even_class_is_not_flagged(self):
        self.assertFalse(bias(self.fake(lambda s: 3))["flagged"])

    def test_high_starters_with_little_room_are_not_flagged(self):
        results = [{"student_id": s.id, "before": 9 if "starts_high" in s.tags else 3,
                    "gain": 1 if "starts_high" in s.tags else 4} for s in STUDENTS]
        self.assertFalse(bias(results)["flagged"])  # 1 of 1 mark left is full marks
        self.assertEqual(normalised_gain({"before": 9, "gain": 1}), 1.0)


if __name__ == "__main__":
    unittest.main()
