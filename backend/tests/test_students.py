import unittest
from collections import Counter

from app.students import SAFETY_MOMENTS, STUDENTS, TAG_RULES, get_student


class StudentTests(unittest.TestCase):
    def test_there_are_30_students_with_unique_ids(self):
        self.assertEqual(len(STUDENTS), 30)
        self.assertEqual(len({s.id for s in STUDENTS}), 30)

    def test_numbers_are_in_range(self):
        for s in STUDENTS:
            for value in (s.start_level, s.learn_speed, s.english, s.persistence):
                self.assertTrue(0 <= value <= 1, s.id)
            self.assertTrue(7 <= s.reading_age <= 16, s.id)
            self.assertTrue(11 <= s.age <= 14, s.id)

    def test_every_kind_of_student_appears_at_least_three_times(self):
        counts = Counter(tag for s in STUDENTS for tag in s.tags)
        for tag in TAG_RULES:
            self.assertGreaterEqual(counts[tag], 3, tag)

    def test_safety_moments_two_of_each_kind(self):
        self.assertEqual(len(SAFETY_MOMENTS), 6)
        self.assertEqual(Counter(SAFETY_MOMENTS.values()), {"privacy": 2, "inappropriate": 2, "wellbeing": 2})
        for student_id in SAFETY_MOMENTS:
            get_student(student_id)  # raises if the id doesn't exist

    def test_to_dict_matches_the_backend_guide(self):
        keys = {"id", "name", "age", "start_level", "learn_speed", "reading_age", "english", "persistence", "tags"}
        self.assertEqual(set(STUDENTS[0].to_dict()), keys)

    def test_new_to_english_lowers_effective_reading_age(self):
        linh = get_student("s07")  # reading age 9, English 0.4
        self.assertAlmostEqual(linh.effective_reading_age, 7.8)


if __name__ == "__main__":
    unittest.main()
