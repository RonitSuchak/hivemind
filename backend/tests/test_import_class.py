"""19 Nov: one real class's results (Kien's real-class.json) loaded into the classmate results behind /api/validation."""

import json
import tempfile
import unittest
from pathlib import Path

from app import advisor, live, store
from app.import_class import DEFAULT_FILE, entries_from, import_class

SMALL = {"collected": "2026-11-19", "students": [
    {"code": "S01", "type": "lecturer", "tool": "BBC Bitesize", "before": 5, "after": 7, "predicted": None,
     "site_pick": None, "left_out": None},
    {"code": "S02", "type": "answer_machine", "tool": "Perplexity", "before": None, "after": 8, "predicted": None,
     "site_pick": None, "left_out": "missing"},
    {"code": "S03", "type": "lecturer", "tool": "Save My Exams", "before": 7, "after": 6, "predicted": 0.6,
     "site_pick": "simple_steps", "left_out": None},
    {"code": "S04", "type": "simple_steps", "tool": "Quizlet", "before": 4, "after": 8, "predicted": 3.5,
     "site_pick": "simple_steps", "left_out": None},
]}


class ImportClassTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = store.JsonStore(Path(self.tmp.name))

    def tearDown(self):
        self.tmp.cleanup()

    def test_entries_keep_the_class_data_and_never_invent_a_prediction(self):
        e = {x["code"]: x for x in entries_from(SMALL, "2026-11-19T12:00:00Z")}
        self.assertEqual(set(e), {"HM-C1S01", "HM-C1S02", "HM-C1S03", "HM-C1S04"})
        self.assertTrue(all(live.valid_code(code) for code in e))
        self.assertEqual(e["HM-C1S03"]["real_gain"], -1)  # a drop stays a drop, as on the Proof page
        self.assertEqual(e["HM-C1S03"]["difference"], -1.6)
        self.assertIsNone(e["HM-C1S01"]["predicted_gain"])
        self.assertIsNone(e["HM-C1S01"]["difference"])
        self.assertIsNone(e["HM-C1S02"]["real_gain"])
        self.assertEqual(e["HM-C1S02"]["left_out"], "missing")
        self.assertEqual(e["HM-C1S01"]["tool"], "BBC Bitesize")
        self.assertEqual(e["HM-C1S01"]["source"], "class-2026-11-19")

    def test_import_twice_adds_nothing_and_never_overwrites(self):
        self.assertEqual(import_class(self.store, SMALL, dry_run=True), (4, 0))
        self.assertEqual(self.store.list("validation"), [])  # a dry run writes nothing
        self.assertEqual(import_class(self.store, SMALL), (4, 0))
        self.store.put("validation", "HM_C1S01", {**self.store.get("validation", "HM_C1S01"), "note": "kept"})
        self.assertEqual(import_class(self.store, SMALL), (0, 4))
        self.assertEqual(self.store.get("validation", "HM_C1S01")["note"], "kept")

    def test_bad_files_are_refused(self):
        for bad in ({"code": "Ronit Suchak"}, {"type": "made_up"}, {"after": 11}, {"left_out": "bored"}):
            student = {**SMALL["students"][0], **bad}
            with self.assertRaises(ValueError):
                entries_from({"students": [student]}, "t")
        with self.assertRaises(ValueError):
            entries_from({"students": [SMALL["students"][0]] * 2}, "t")

    def test_summary_scores_only_counted_entries_with_a_prediction(self):
        s = live.validation_summary(entries_from(SMALL, "t"))
        self.assertEqual((s["count"], s["counted"], s["with_prediction"]), (4, 3, 2))
        self.assertEqual(s["avg_error"], round((1.6 + 0.5) / 2, 2))
        self.assertEqual((s["within_1"], s["within_1_share"]), (1, 0.5))
        self.assertEqual(s["by_group"], [{"tutor_id": "simple_steps", "n": 1, "avg_gain": 4.0},
                                         {"tutor_id": "lecturer", "n": 2, "avg_gain": 0.5}])

    def test_summary_of_nothing(self):
        self.assertEqual(live.validation_summary([]), {"count": 0, "counted": 0, "with_prediction": 0,
                                                       "avg_error": None, "within_1": 0, "within_1_share": None,
                                                       "by_group": []})

    def test_kiens_file_matches_his_proof_page(self):
        # The same numbers RealClass.jsx works out from the file: 40 took part, 8 left out, gains per group.
        data = json.loads(DEFAULT_FILE.read_text(encoding="utf-8"))
        s = live.validation_summary(entries_from(data, "t"))
        used = [x for x in data["students"] if not x["left_out"]]
        self.assertEqual((s["count"], s["counted"]), (len(data["students"]), len(used)))
        for g in s["by_group"]:
            gains = [x["after"] - x["before"] for x in used if x["type"] == g["tutor_id"]]
            self.assertEqual((g["n"], g["avg_gain"]), (len(gains), round(sum(gains) / len(gains), 2)))

    def test_advice_counts_only_predictions_checked(self):
        s = live.validation_summary(entries_from(SMALL, "t"))
        sure = advisor_sure(s)
        self.assertIn("1 of 2 predictions were within 1 mark", sure)


def advisor_sure(summary: dict) -> str:
    from app import catalog, matching
    profile = {"start_level": 0.3, "learn_speed": 0.5, "reading_age": 11, "english": 0.6, "persistence": 0.5}
    result = matching.match(profile, catalog.rated())
    return next(f["answer"] for f in advisor.follow_ups(result, catalog.rated(), summary) if f["id"] == "how_sure")


if __name__ == "__main__":
    unittest.main()
