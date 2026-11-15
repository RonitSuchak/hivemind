import unittest

from app.brain import Move
from app.labeller import gives_answer, label, reading_age
from app.lesson_plan import PROBLEMS

EQUIV, ADD_SAME, ADD_DIFF = PROBLEMS


class LabellerTests(unittest.TestCase):
    def test_long_words_and_sentences_have_a_higher_reading_age(self):
        simple = reading_age("Look at the bottom numbers. Are they the same?")
        hard = reading_age("Consequently, each numerator must be scaled proportionally by the "
                           "multiplicative factor applied to its corresponding denominator.")
        self.assertLess(simple, 9)
        self.assertGreater(hard, 15)

    def test_no_words_means_no_reading_age(self):
        self.assertIsNone(reading_age("1/4 + 1/8"))

    def test_stating_the_answer_is_giving_it_away(self):
        self.assertTrue(gives_answer("The answer is 3/8.", ADD_DIFF))

    def test_an_equal_fraction_also_gives_it_away(self):
        self.assertTrue(gives_answer("It comes to 2/3.", ADD_SAME))  # 6/9 = 2/3

    def test_fractions_from_the_problem_itself_do_not_count(self):
        self.assertFalse(gives_answer("Think about what 2/3 means.", EQUIV))  # 2/3 equals 4/6 but is in the problem

    def test_moves(self):
        cases = [
            ("The answer is 3/8.", ADD_DIFF, Move.GAVE_ANSWER),
            ("What do you notice about the bottom numbers?", ADD_DIFF, Move.QUESTION),
            ("Try making the bottom numbers the same first.", ADD_DIFF, Move.HINT),
            ("A denominator is the bottom number of a fraction.", ADD_DIFF, Move.EXPLANATION),
            ("Well done, you're doing brilliantly!", ADD_DIFF, Move.ENCOURAGEMENT),
            ("I like football and pizza.", ADD_DIFF, Move.OFF_TOPIC),
        ]
        for text, problem, move in cases:
            self.assertEqual(label(text, problem).move, move, text)

    def test_only_teaching_moves_teach_a_skill(self):
        self.assertEqual(label("Try the bottom numbers first.", ADD_DIFF).skill, "add_different")
        self.assertIsNone(label("Well done!", ADD_DIFF).skill)


if __name__ == "__main__":
    unittest.main()
