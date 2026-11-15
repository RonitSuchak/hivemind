import re
import unittest
from fractions import Fraction

from app.assessment import QUESTIONS, expected_score, sit_test
from app.brain import SKILLS, Brain, Move
from app.students import STUDENTS, get_student


def value(text):
    top, bottom = text.split("/")
    return Fraction(int(top), int(bottom))


def correct_value(question):
    """Work out the right answer from the question text, so a typo can't slip in."""
    text = question.text
    if match := re.fullmatch(r"(\d+/\d+) \+ (\d+/\d+) = \?", text):
        return value(match[1]) + value(match[2])
    if match := re.fullmatch(r"Which fraction is the same as (\d+/\d+)\?", text):
        return value(match[1])
    if match := re.fullmatch(r"Simplify (\d+/\d+)\.", text):
        return value(match[1])
    raise AssertionError(f"Unknown question format: {text}")


class TestTests(unittest.TestCase):
    def test_ten_questions_each_with_four_different_options(self):
        self.assertEqual(len(QUESTIONS), 10)
        for q in QUESTIONS:
            self.assertEqual(len(set(q.options)), 4, q.id)
            self.assertIn(q.answer, q.options, q.id)
            self.assertIn(q.skill, SKILLS, q.id)

    def test_every_answer_is_mathematically_right_and_the_only_right_option(self):
        for q in QUESTIONS:
            right = correct_value(q)
            self.assertEqual(value(q.answer), right, q.id)
            right_options = [o for o in q.options if value(o) == right]
            self.assertEqual(right_options, [q.answer], q.id)

    def test_simplify_answers_are_in_lowest_terms(self):
        for q in QUESTIONS:
            if q.text.startswith("Simplify"):
                self.assertEqual(str(value(q.answer)), q.answer, q.id)

    def test_same_seed_gives_same_result(self):
        brain = Brain(get_student("s07"))
        self.assertEqual(sit_test(brain, "s07-x-before"), sit_test(brain, "s07-x-before"))

    def test_before_score_is_the_same_whichever_tutor_comes_next(self):
        linh = get_student("s07")
        self.assertEqual(sit_test(Brain(linh)), sit_test(Brain(linh)))

    def test_gain_is_never_negative_for_any_student_or_teaching_style(self):
        for student in STUDENTS:
            for move in Move:
                for reading_age in (7, 15):
                    brain = Brain(student)
                    before = sit_test(brain).score
                    for skill in SKILLS * 2:
                        brain.hear(move, skill, reading_age)
                    self.assertGreaterEqual(sit_test(brain).score, before, (student.id, move, reading_age))

    def test_confident_students_score_higher_than_struggling_ones(self):
        confident = expected_score(Brain(get_student("s06")))
        struggling = expected_score(Brain(get_student("s10")))
        self.assertGreater(confident, struggling)

    def test_a_good_lesson_raises_the_expected_score_more_than_answers(self):
        linh = get_student("s07")
        start = expected_score(Brain(linh))

        hints = Brain(linh)
        answers = Brain(linh)
        for skill in ("equivalent", "add_same", "add_different") * 2:
            hints.hear(Move.HINT, skill)
            answers.hear(Move.GAVE_ANSWER, skill)

        self.assertGreater(expected_score(hints), expected_score(answers))
        self.assertGreater(expected_score(answers), start)


if __name__ == "__main__":
    unittest.main()
