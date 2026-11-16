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


if __name__ == "__main__":
    unittest.main()
