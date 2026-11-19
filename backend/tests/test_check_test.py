"""Check accuracy test (19 Nov): 40 made-up students with known answers, and the didn't-try flag."""

import unittest

from app import check, config
from app.check import QUIZ_1, QUIZ_2, READING_QS, check_quality, shuffled


def careful_body(seconds=400):
    """Every question answered, right or wrong, the way a reader would (answers in different places)."""
    return {"quiz_1": {q.id: q.answer for q in QUIZ_1}, "quiz_2": {q.id: q.answer for q in QUIZ_2},
            "reading": {q.id: q.answer for q in READING_QS}, "english_confidence": 4, "seconds_taken": seconds}


class CheckQualityTests(unittest.TestCase):
    def test_a_careful_check_is_reliable(self):
        self.assertEqual(check_quality(careful_body()), {"reliable": True, "reasons": []})
        self.assertTrue(check_quality({**careful_body(), "seconds_taken": None})["reliable"])  # no time sent

    def test_too_fast(self):
        result = check_quality(careful_body(seconds=config.CHECK_TOO_FAST_SECONDS - 1))
        self.assertEqual([r["code"] for r in result["reasons"]], ["too_fast"])
        self.assertFalse(result["reliable"])

    def test_same_button_every_time(self):
        body = {key: {q.id: shuffled(q)[0] for q in qs}
                for key, qs in (("quiz_1", QUIZ_1), ("quiz_2", QUIZ_2), ("reading", READING_QS))}
        self.assertIn("same_button", [r["code"] for r in check_quality(body)["reasons"]])

    def test_quit_after_quiz_1(self):
        body = {"quiz_1": careful_body()["quiz_1"], "seconds_taken": 300}
        self.assertEqual([r["code"] for r in check_quality(body)["reasons"]], ["skipped_most"])

    def test_the_flag_never_changes_the_profile(self):
        body = careful_body(seconds=10)
        self.assertEqual(check.profile_from(body), check.profile_from(careful_body()))


class CheckAccuracyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from app import check_test
        check_test.run.cache_clear()
        cls.result = check_test.run()
        cls.check_test = check_test

    def test_forty_students_in_the_stated_mix(self):
        rows = self.result["students"]
        self.assertEqual(len(rows), 40)
        self.assertEqual(sum(self.result["mix"].values()), 40)
        kinds = {r["behaviour"] for r in rows}
        self.assertEqual(kinds, {"careful", "rushing", "random", "same_button", "quit_halfway"})
        self.assertTrue(self.result["simulated"])
        self.assertIn("not evidence about real children", self.result["note"])

    def test_the_same_seed_gives_the_same_result(self):
        self.check_test.run.cache_clear()
        again = self.check_test.run()
        self.assertEqual(again["students"], self.result["students"])

    def test_true_traits_stay_inside_the_class_range(self):
        from app.matching import CLASS_RANGE
        for row in self.result["students"]:
            for key, (lo, hi) in CLASS_RANGE.items():
                self.assertTrue(lo - 1e-9 <= row["true"][key] <= hi + 1e-9, (row["id"], key))

    def test_reading_and_english_beat_assuming_average(self):
        careful, baseline = self.result["summary"]["careful"], self.result["summary"]["no_check_careful"]
        for key in ("reading", "english"):
            self.assertLess(careful["trait_error"][key], baseline["trait_error"][key], key)

    def test_the_19_nov_fix_holds_on_fresh_students(self):
        # Learning speed and staying power used to be far worse than assuming average (0.20 and 0.31 against 0.11).
        # After the fix they are about level with it, on sets never used to choose the fix.
        fresh = self.result["summary"]["fresh_sets_careful"]
        self.assertEqual(len(fresh), 3)
        for seed, summary in fresh.items():
            for key in ("learn_speed", "persistence"):
                self.assertLess(summary["trait_error"][key], 0.15, (seed, key))

    def test_the_flag_catches_clicking_through_and_spares_careful_students(self):
        flag = self.result["summary"]["flag"]
        self.assertEqual(flag["caught"], flag["of"])
        self.assertEqual(flag["careful_flagged"], 0)

    def test_findings_are_worked_out_from_the_numbers(self):
        self.assertEqual(len(self.result["findings"]), 5)
        self.assertIn(str(self.result["summary"]["careful"]["avg_gain_gap"]), self.result["findings"][2])

    def test_nothing_goes_into_the_classmate_results(self):
        from app import store
        saved = store._store
        try:
            import tempfile
            from pathlib import Path
            with tempfile.TemporaryDirectory() as tmp:
                store.set_store(store.JsonStore(Path(tmp)))
                self.check_test.run.cache_clear()
                self.check_test.run()
                self.assertEqual(store.get_store().list("validation"), [])
        finally:
            store.set_store(saved)


if __name__ == "__main__":
    unittest.main()
