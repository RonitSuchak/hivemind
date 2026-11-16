"""Real EdTech tools: linked to a demo tool type, never given scores of their own."""
import json
import unittest

from app import config, real_tools
from app.tutors import TUTOR_INFO

NUMBER_KEYS = {"scores", "safety", "usability", "learning", "predicted_gain", "avg_gain", "gain"}


def keys_in(x):
    if isinstance(x, dict):
        return set(x) | set().union(*(keys_in(v) for v in x.values()))
    if isinstance(x, list):
        return set().union(*(keys_in(v) for v in x)) if x else set()
    return set()


def ranked_row(tutor_id, rank, warning=None):
    return {"rank": rank, "tutor_id": tutor_id, "tutor_name": TUTOR_INFO[tutor_id][0], "kind": "built_in",
            "predicted_gain": 3.0, "scores": {"safety": 5}, "safety_warning": warning}


class RealToolsTests(unittest.TestCase):
    def test_the_list_is_kiens_78_tools_each_with_a_known_type(self):
        listing = real_tools.listing()
        self.assertEqual(len(listing["tools"]), 78)
        self.assertEqual(len({t["id"] for t in listing["tools"]}), 78)
        self.assertTrue(all(t["type"]["tutor_id"] in TUTOR_INFO for t in listing["tools"]))
        self.assertTrue(all(t["url"].startswith("https://") for t in listing["tools"]))
        self.assertEqual([t["most_used"] for t in listing["tools"]].count(True), 12)
        self.assertEqual(listing["tools"][0]["name"], "ChatGPT")
        self.assertIn("has not tested", listing["note"])

    def test_a_real_tool_never_gets_scores(self):
        self.assertFalse(keys_in(real_tools.listing()) & NUMBER_KEYS)
        ranked = [ranked_row("simple_steps", 1), ranked_row("socratic", 2)]
        self.assertFalse(keys_in(real_tools.for_match(ranked)) & NUMBER_KEYS)

    def test_match_orders_tools_by_their_types_rank_with_safety_concerns_last(self):
        ranked = [ranked_row("simple_steps", 1), ranked_row("socratic", 2), ranked_row("lecturer", 3),
                  ranked_row("answer_machine", 4, warning="Failed the privacy check.")]
        tools = real_tools.for_match(ranked)
        self.assertEqual(len(tools), 78)
        self.assertEqual([t["type_rank"] for t in tools], sorted(t["type_rank"] for t in tools))
        self.assertEqual(tools[0]["type"]["tutor_id"], "simple_steps")
        self.assertEqual(tools[0]["name"], "Duolingo")  # Kien's order (most used first) inside a type
        self.assertEqual({t["type"]["tutor_id"] for t in tools if t["type_safety_concern"]}, {"answer_machine"})
        self.assertTrue(all(t["type_safety_concern"] for t in tools[-16:]))
        self.assertTrue(all(t["estimated"] and t["note"] == real_tools.listing()["note"] for t in tools))

    def test_no_ranking_means_no_real_tools(self):
        self.assertEqual(real_tools.for_match([]), [])
        submission = {**ranked_row("socratic", 1), "tutor_id": "sub_001", "kind": "submission"}
        self.assertEqual(real_tools.for_match([submission]), [])

    def test_the_data_file_keeps_kiens_types_unchanged(self):
        data = json.loads(config.REAL_TOOLS_FILE.read_text())
        groups = {t["id"]: t["group"] for t in data["tools"]}
        self.assertEqual((groups["chatgpt"], groups["duolingo"], groups["khan-academy"], groups["desmos"]),
                         ("answer_machine", "simple_steps", "lecturer", "socratic"))



class EstimatesAndSubjectsTests(unittest.TestCase):
    def tool(self, tool_id):
        return next(t for t in real_tools.listing()["tools"] if t["id"] == tool_id)

    def test_every_tool_has_kiens_seven_estimates_and_their_note(self):
        listing = real_tools.listing()
        self.assertIn("Not a lab result", listing["estimates_note"])
        for t in listing["tools"]:
            self.assertEqual(tuple(t["estimates"]), real_tools.ESTIMATE_KEYS)
            self.assertTrue(all(v in (0, 1, 2) for v in t["estimates"].values()))
            self.assertEqual(t["estimates_note"], listing["estimates_note"])
        self.assertEqual(self.tool("chatgpt")["estimates"], {"beginner": 1, "stretch": 2, "light_reading": 0,
                                                             "languages": 2, "motivation": 0, "guidance": 1,
                                                             "self_paced": 2})  # Kien's numbers
        self.assertEqual(list(self.tool("perplexity")["estimates"].values()), [1, 2, 0, 1, 0, 0, 2])

    def test_subjects_follow_the_websites_rules(self):
        cases = {"chatgpt": [], "duolingo": ["Languages"], "desmos": ["Maths", "Further Maths"],
                 "khan-academy": []}
        for tool_id, subjects in cases.items():
            self.assertEqual(self.tool(tool_id)["subjects"], subjects, tool_id)
        self.assertEqual(real_tools.subjects_for("Physics problems"), ["Physics", "Combined Science"])
        self.assertEqual(real_tools.subjects_for("Science simulations"),
                         ["Physics", "Chemistry", "Biology", "Combined Science"])
        self.assertEqual(real_tools.subjects_for("Coding with blocks"), ["Computer Science"])
        self.assertEqual(real_tools.subjects_for("Writing helper"), ["English"])
        younger = [t["kind"].lower() for t in real_tools.listing()["tools"] if not t["for_advanced"]]
        self.assertTrue(younger)
        self.assertTrue(all(any(k in kind for k in ("times tables", "game", "uk schools")) for kind in younger))

    def test_fits_the_lab_lesson_like_the_lab_drawer(self):
        self.assertTrue(self.tool("chatgpt")["fits_lab_lesson"])
        self.assertFalse(self.tool("duolingo")["fits_lab_lesson"])
        a_level = [t for t in real_tools.listing()["tools"] if "a level" in t["kind"].lower()]
        self.assertTrue(a_level)
        self.assertFalse(any(t["fits_lab_lesson"] for t in a_level))

    def test_a_topic_filters_real_tools_and_keeps_the_order(self):
        ranked = [ranked_row("simple_steps", 1), ranked_row("socratic", 2), ranked_row("lecturer", 3),
                  ranked_row("answer_machine", 4)]
        everything = real_tools.for_match(ranked)
        spanish = real_tools.for_match(ranked, real_tools.clean_topic({"subject": "Languages"}))
        self.assertLess(len(spanish), len(everything))
        self.assertTrue(all(not t["subjects"] or "Languages" in t["subjects"] for t in spanish))
        self.assertIn("duolingo", [t["id"] for t in spanish])
        self.assertNotIn("desmos", [t["id"] for t in spanish])
        order = [t["id"] for t in everything]
        self.assertEqual([t["id"] for t in spanish], [i for i in order if i in {t["id"] for t in spanish}])
        a_level = real_tools.for_match(ranked, real_tools.clean_topic({"subject": "Maths", "advanced": True}))
        self.assertTrue(all(t["for_advanced"] for t in a_level))
        self.assertIn("desmos", [t["id"] for t in a_level])

    def test_an_unusable_topic_means_no_filter(self):
        for bad in (None, "Maths", {}, {"subject": ""}, {"subject": 5}, {"subject": "x" * 41}):
            self.assertIsNone(real_tools.clean_topic(bad))
        self.assertEqual(real_tools.clean_topic({"subject": " Physics ", "advanced": "yes"}),
                         {"subject": "Physics", "advanced": False})


if __name__ == "__main__":
    unittest.main()
