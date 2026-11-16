"""Real-tools pilot: relay mode (a person pastes the tool's replies) and GET /api/pilot.

No AI and no person: a pre-written tutor stands in for the pasted replies.
"""

import json
import tempfile
import unittest
from pathlib import Path

from app import config, pilot
from app.relay import RelayStopped, ReplyError, TerminalAsk, clean_reply, relay_lesson, status_lines
from app.tutors import ScriptedTutor
from app.voice import ScriptedVoice, Voice

try:
    from fastapi.testclient import TestClient
except ImportError:
    TestClient = None


class Person:
    """Pastes what a pre-written tutor would say; can stop after some replies."""

    def __init__(self, tutor_id="simple_steps", stop_after=None, wrap=lambda t: t):
        self.tutor, self.stop_after, self.wrap, self.asked = ScriptedTutor(tutor_id), stop_after, wrap, 0

    def __call__(self, chat):
        if self.stop_after is not None and self.asked >= self.stop_after:
            raise RelayStopped()
        self.asked += 1
        return self.wrap(self.tutor.reply(chat))


class ChangingVoice(Voice):
    """Like an AI voice: the same situation gets different words each time it's asked."""

    def __init__(self):
        self.inner, self.n = ScriptedVoice(), 0

    def say_line(self, situation):
        text, _ = self.inner.say_line(situation)
        if situation.kind == "attempt":
            self.n += 1
            text += f" (line {self.n} of a new voice)"
        return text, "ai"

    def say(self, situation):
        return self.say_line(situation)[0]


class CleanReplyTests(unittest.TestCase):
    def test_latex_and_markdown_become_plain_text(self):
        text = clean_reply("## Step 1\n**Add** \\(\\frac{1}{3} + \\dfrac{1}{6}\\) = $\\frac{1}{2}$ \\times 1 <b>ok</b>")
        self.assertEqual(text, "Step 1\nAdd 1/3 + 1/6 = 1/2 × 1 ok")

    def test_empty_and_huge_replies_are_refused(self):
        with self.assertRaises(ReplyError):
            clean_reply("  \n ")
        with self.assertRaises(ReplyError):
            clean_reply("a" * (config.RELAY_MAX_REPLY_CHARS + 1))


class RelayTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_a_relayed_lesson_goes_through_the_normal_pipeline(self):
        result = relay_lesson("chatgpt_study", "s10", Person(), ScriptedVoice(), "scripted", self.root)
        saved = json.loads(pilot.lesson_path("chatgpt_study", "s10", self.root).read_text())
        self.assertEqual(saved["tutor_mode"], "relay")
        self.assertEqual(saved["method"], "hand-relayed")
        self.assertEqual(saved["tutor_id"], "chatgpt_study")
        self.assertEqual(result["before"], saved["before"])
        tutor_lines = [m for m in saved["transcript"] if m["from"] == "tutor"]
        self.assertTrue(tutor_lines and all("move" in m and "reading_age" in m for m in tutor_lines))
        self.assertEqual(len(saved["relay_raw"]), len(tutor_lines))
        self.assertFalse(pilot.partial_path("chatgpt_study", "s10", self.root).exists())

    def test_pasted_latex_is_cleaned_before_the_labeller_and_safety_judge(self):
        latex = Person(wrap=lambda t: t + " For example **\\(\\frac{1}{3} + \\frac{1}{3} = \\frac{2}{3}\\)**.")
        result = relay_lesson("gemini", "s10", latex, ScriptedVoice(), "scripted", self.root)
        pairs = list(zip(result["relay_raw"], [m["text"] for m in result["transcript"] if m["from"] == "tutor"]))
        with_latex = [(raw, text) for raw, text in pairs if "\\frac{1}{3}" in raw]
        self.assertTrue(with_latex)
        self.assertTrue(all("1/3 + 1/3 = 2/3" in text and "\\" not in text for _, text in with_latex))
        self.assertEqual([e for e in result["safety_events"] if e["type"] == "misinformation"], [])

    def test_a_stopped_lesson_resumes_exactly_where_it_was(self):
        whole = relay_lesson("copilot", "s24", Person(), ScriptedVoice(), "scripted", self.root / "a")
        self.assertIsNone(relay_lesson("copilot", "s24", Person(stop_after=2), ScriptedVoice(), "scripted",
                                       self.root / "b"))
        partial = json.loads(pilot.partial_path("copilot", "s24", self.root / "b").read_text())
        self.assertEqual(len(partial["replies"]), 2)
        second = Person()
        resumed = relay_lesson("copilot", "s24", second, ScriptedVoice(), "scripted", self.root / "b")
        self.assertEqual(resumed["transcript"], whole["transcript"])
        self.assertEqual(resumed["gain"], whole["gain"])
        tutor_turns = sum(m["from"] == "tutor" for m in whole["transcript"])
        self.assertEqual(second.asked, tutor_turns - 2)  # the person is never asked twice for a reply

    def test_a_resume_replays_the_saved_ai_student_lines(self):
        root = self.root / "c"
        relay_lesson("copilot", "s24", Person(stop_after=3), ChangingVoice(), "ai", root)
        saved = json.loads(pilot.partial_path("copilot", "s24", root).read_text())["voice_lines"]
        resumed = relay_lesson("copilot", "s24", Person(), ChangingVoice(), "ai", root)
        student = [m["text"] for m in resumed["transcript"] if m["from"] == "student"]
        self.assertEqual(student[:len(saved)], [text for text, _ in saved])  # not new words from a new voice

    def test_a_resume_must_keep_the_same_voice(self):
        relay_lesson("copilot", "s09", Person(stop_after=1), ScriptedVoice(), "scripted", self.root)
        with self.assertRaises(ValueError):
            relay_lesson("copilot", "s09", Person(), ChangingVoice(), "ai", self.root)

    def test_the_terminal_reads_a_pasted_reply_up_to_the_end_marker(self):
        typed = iter(["First line", "", "Second line", config.RELAY_END_MARKER])
        shown = []
        ask = TerminalAsk(copy=False, read=lambda _: next(typed), write=shown.append)
        chat = [{"from": "student", "text": "Can you help me with 2/3 = ?/6?"}]
        self.assertEqual(ask(chat), "First line\n\nSecond line")
        self.assertIn("Can you help me with 2/3 = ?/6?", "\n".join(shown))
        quit_ask = TerminalAsk(copy=False, read=lambda _: "QUIT", write=shown.append)
        with self.assertRaises(RelayStopped):
            quit_ask(chat)

    def test_status_shows_done_started_and_missing(self):
        relay_lesson("perplexity", "s10", Person(), ScriptedVoice(), "scripted", self.root)
        relay_lesson("perplexity", "s24", Person(stop_after=1), ScriptedVoice(), "scripted", self.root)
        line = next(x for x in status_lines(self.root) if "perplexity" in x)
        self.assertIn("s10 done", line)
        self.assertIn("s24 started", line)
        self.assertIn("s09 -", line)


class PilotListingTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_the_three_students_are_very_different(self):
        from app.students import get_student
        tags = set()
        for sid in pilot.PILOT_STUDENTS:
            tags |= set(get_student(sid).tags)
        self.assertTrue({"starts_low", "younger_reader", "new_to_english", "learns_fast", "starts_high"} <= tags)
        self.assertIn("s09", pilot.PILOT_STUDENTS)  # the fake-note Safety trap

    def test_scores_only_once_all_three_lessons_exist(self):
        relay_lesson("chatgpt", "s10", Person("answer_machine"), ScriptedVoice(), "scripted", self.root)
        tool = pilot.tool_result("chatgpt", self.root)
        self.assertEqual((tool["status"], tool["lessons_done"], tool["scores"]), ("in_progress", 1, None))
        self.assertEqual(len(tool["students"]), 1)
        for sid in ("s24", "s09"):
            relay_lesson("chatgpt", sid, Person("answer_machine"), ScriptedVoice(), "scripted", self.root)
        tool = pilot.tool_result("chatgpt", self.root)
        self.assertEqual(tool["status"], "done")
        self.assertEqual(set(tool["scores"]), {"safety", "usability", "learning"})
        self.assertEqual((tool["kind"], tool["method"], tool["sample"]), ("real_pilot", "hand-relayed", 3))
        self.assertEqual(tool["real_tool"]["id"], "chatgpt")
        self.assertTrue(tool["note"] and tool["tested_on"])
        hana = next(s for s in tool["students"] if s["student_id"] == "s09")
        self.assertTrue(any(e["type"] == "inappropriate" for e in hana["safety_events"]))
        self.assertIn("evidence", tool)

    def test_every_tool_is_listed_even_before_any_lesson(self):
        data = pilot.listing(self.root)
        self.assertEqual([t["tool_id"] for t in data["tools"]], list(pilot.PILOT_TOOLS))
        self.assertTrue(all(t["status"] == "not_started" and t["scores"] is None for t in data["tools"]))
        self.assertEqual([s["id"] for s in data["students"]], list(pilot.PILOT_STUDENTS))
        linked = {t["tool_id"]: (t["real_tool"] or {}).get("id") for t in data["tools"]}
        self.assertEqual(linked, {"chatgpt": "chatgpt", "chatgpt_study": "chatgpt", "gemini": "gemini",
                                  "gemini_guided": "gemini", "copilot": "copilot", "perplexity": "perplexity"})


@unittest.skipIf(TestClient is None, "FastAPI not installed (use backend/.venv)")
class PilotApiTests(unittest.TestCase):
    def setUp(self):
        from app import api
        self.tmp = tempfile.TemporaryDirectory()
        self.saved = config.PILOT_DIR
        config.PILOT_DIR = Path(self.tmp.name)
        self.client = TestClient(api.app)

    def tearDown(self):
        config.PILOT_DIR = self.saved
        self.tmp.cleanup()

    def test_pilot_endpoint_and_it_never_reaches_ratings_or_the_match(self):
        for sid in pilot.PILOT_STUDENTS:
            relay_lesson("gemini_guided", sid, Person("socratic"), ScriptedVoice(), "scripted")
        data = self.client.get("/api/pilot").json()
        tool = next(t for t in data["tools"] if t["tool_id"] == "gemini_guided")
        self.assertEqual(tool["status"], "done")
        ratings = json.dumps(self.client.get("/api/ratings").json())
        tutors = json.dumps(self.client.get("/api/tutors").json())
        self.assertNotIn("gemini_guided", ratings + tutors)


if __name__ == "__main__":
    unittest.main()
