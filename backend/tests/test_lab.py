import json
import tempfile
import unittest
from pathlib import Path

from app import config
from app.lab import Budget, build_class_run, run_lab
from app.llm import QuotaError
from app.students import STUDENTS
from app.tutors import ScriptedTutor
from app.voice import ScriptedVoice

ALL = [s.id for s in STUDENTS]


class Crashing(ScriptedTutor):
    """A tutor whose AI 'runs out of quota' after a number of replies."""

    def __init__(self, tutor_id, replies_left):
        super().__init__(tutor_id)
        self.replies_left = replies_left

    def reply(self, chat, problem=None):
        self.replies_left -= 1
        if self.replies_left < 0:
            raise QuotaError("free limit used up")
        return super().reply(chat, problem)


class LabTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.out = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def lessons(self, tid):
        return sorted(p.name for p in (self.out / tid).glob("s*.json"))

    def test_a_stopped_run_resumes_without_repeating_lessons(self):
        report = run_lab(["socratic"], ALL, self.out, lambda t: Crashing(t, 40), ScriptedVoice, log=lambda *_: None)
        self.assertIsNotNone(report["stopped"])
        first = self.lessons("socratic")
        self.assertTrue(0 < len(first) < 30)
        stamps = {name: (self.out / "socratic" / name).stat().st_mtime_ns for name in first}
        self.assertFalse((self.out / "socratic.json").exists())

        report = run_lab(["socratic"], ALL, self.out, ScriptedTutor, ScriptedVoice, log=lambda *_: None)
        self.assertIsNone(report["stopped"])
        self.assertEqual(report["skipped"], len(first))
        self.assertEqual(report["done"], 30 - len(first))
        self.assertEqual(len(self.lessons("socratic")), 30)
        for name, stamp in stamps.items():  # saved lessons were not touched again
            self.assertEqual((self.out / "socratic" / name).stat().st_mtime_ns, stamp)
        run = json.loads((self.out / "socratic.json").read_text())
        self.assertEqual([r["student_id"] for r in run["results"]], ALL)
        self.assertEqual(run["tutor_mode"], "scripted")  # pre-written tutors, labelled as such

    def test_lessons_from_other_learning_numbers_are_redone(self):
        run_lab(["socratic"], ["s01"], self.out, ScriptedTutor, ScriptedVoice, log=lambda *_: None)
        path = self.out / "socratic" / "s01.json"
        data = json.loads(path.read_text())
        data["model_version"] = "old"
        path.write_text(json.dumps(data))
        report = run_lab(["socratic"], ["s01"], self.out, ScriptedTutor, ScriptedVoice, log=lambda *_: None)
        self.assertEqual(report["done"], 1)
        self.assertEqual(json.loads(path.read_text())["model_version"], config.MODEL_VERSION)

    def test_class_run_waits_for_all_30_lessons(self):
        run_lab(["socratic"], ALL[:5], self.out, ScriptedTutor, ScriptedVoice, log=lambda *_: None)
        self.assertIsNone(build_class_run(self.out, {"tutor_id": "socratic", "tutor_name": "Socratic"}))

    def test_budget_stops_before_the_limit_and_counts_per_day(self):
        budget = Budget(self.out / "budget.json", limit=20)
        self.assertTrue(budget.can_afford(11))
        budget.spend(11)
        self.assertFalse(budget.can_afford(11))
        self.assertEqual(Budget(self.out / "budget.json", limit=20).used, 11)  # remembered

        class Counting:
            calls = 0
        report = run_lab(["socratic"], ALL, self.out, ScriptedTutor, ScriptedVoice, budget, Counting(),
                         log=lambda *_: None)
        self.assertIn("budget", report["stopped"])
        self.assertEqual(report["done"], 0)


if __name__ == "__main__":
    unittest.main()
