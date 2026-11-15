import unittest
from dataclasses import replace

from app.brain import MAX_MASTERY, MIN_MASTERY, Brain, Move
from app.students import get_student

LINH = get_student("s07")


def teach(profile, move, turns=6, skill="add_different", reading_age=None):
    brain = Brain(profile)
    for _ in range(turns):
        brain.hear(move, skill, reading_age)
    return brain


class BrainTests(unittest.TestCase):
    def test_hints_teach_more_than_giving_the_answer(self):
        hints = teach(LINH, Move.HINT)
        answers = teach(LINH, Move.GAVE_ANSWER)
        self.assertGreater(hints.knowledge, answers.knowledge)

    def test_questions_teach_at_least_as_much_as_hints(self):
        self.assertGreaterEqual(teach(LINH, Move.QUESTION).knowledge, teach(LINH, Move.HINT).knowledge)

    def test_fast_learners_learn_more_from_the_same_lesson(self):
        fast = teach(replace(LINH, learn_speed=0.9), Move.HINT)
        slow = teach(replace(LINH, learn_speed=0.2), Move.HINT)
        self.assertGreater(fast.knowledge, slow.knowledge)

    def test_messages_too_hard_to_read_teach_less(self):
        easy = teach(LINH, Move.HINT, reading_age=7)
        hard = teach(replace(LINH, persistence=1.0), Move.HINT, reading_age=15)
        self.assertGreater(easy.knowledge, hard.knowledge)

    def test_impatient_student_gives_up_after_hard_messages(self):
        impatient = replace(LINH, persistence=0.2)  # patience = 2
        brain = teach(impatient, Move.HINT, turns=2, reading_age=15)
        self.assertTrue(brain.gave_up)
        before = brain.knowledge
        self.assertEqual(brain.hear(Move.HINT, "add_different", reading_age=7), 0.0)
        self.assertEqual(brain.knowledge, before)

    def test_patient_student_keeps_going(self):
        patient = replace(LINH, persistence=1.0)  # patience = 5
        self.assertFalse(teach(patient, Move.HINT, turns=4, reading_age=15).gave_up)

    def test_a_readable_message_resets_frustration(self):
        brain = Brain(replace(LINH, persistence=0.2))
        brain.hear(Move.HINT, "add_same", reading_age=15)
        brain.hear(Move.HINT, "add_same", reading_age=7)
        brain.hear(Move.HINT, "add_same", reading_age=15)
        self.assertFalse(brain.gave_up)

    def test_mastery_stays_in_bounds(self):
        brain = teach(LINH, Move.QUESTION, turns=100)
        for value in brain.mastery.values():
            self.assertTrue(MIN_MASTERY <= value <= MAX_MASTERY)

    def test_history_has_one_entry_per_message_plus_the_start(self):
        self.assertEqual(len(teach(LINH, Move.HINT, turns=6).history), 7)

    def test_encouragement_teaches_nothing_but_is_not_frustrating(self):
        brain = teach(replace(LINH, persistence=0.0), Move.ENCOURAGEMENT, turns=3)
        self.assertEqual(brain.knowledge, Brain(LINH).knowledge)
        self.assertFalse(brain.gave_up)


if __name__ == "__main__":
    unittest.main()
