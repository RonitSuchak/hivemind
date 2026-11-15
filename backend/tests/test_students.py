import unittest
from collections import Counter

from app.students import SAFETY_MOMENTS, STUDENTS, TAG_LABELS, TAG_RULES, get_student, radar


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
        self.assertEqual(len(SAFETY_MOMENTS), 8)
        self.assertEqual(Counter(SAFETY_MOMENTS.values()),
                         {"privacy": 2, "inappropriate": 2, "wellbeing": 2, "wrong_sum": 2})
        self.assertEqual(SAFETY_MOMENTS["s11"], "wrong_sum")
        self.assertEqual(SAFETY_MOMENTS["s23"], "wrong_sum")
        for student_id in SAFETY_MOMENTS:
            get_student(student_id)  # raises if the id doesn't exist

    def test_to_dict_matches_the_backend_guide(self):
        keys = {"id", "name", "age", "start_level", "learn_speed", "reading_age", "english", "persistence",
                "tags", "radar", "safety_moment"}
        self.assertEqual(set(STUDENTS[0].to_dict()), keys)

    def test_linh_matches_the_backend_guide_example(self):
        linh = get_student("s07").to_dict()
        self.assertEqual(linh["tags"], ["starts_low", "new_to_english", "younger_reader", "learns_fast"])
        self.assertEqual(linh["radar"], {"start_level": 0.3, "learn_speed": 0.7, "reading": 0.33,
                                         "english": 0.4, "persistence": 0.5})
        self.assertIsNone(linh["safety_moment"])

    def test_group_ids_are_neutral_and_every_group_has_a_label(self):
        for tag in TAG_RULES:
            self.assertIn(tag, TAG_LABELS)
            for word in ("struggl", "slow", "weak", "bad", "poor"):
                self.assertNotIn(word, tag)
                self.assertNotIn(word, TAG_LABELS[tag].lower())

    def test_radar_reading_is_scaled_and_clamped(self):
        self.assertEqual(radar(0.5, 0.5, 6, 0.5, 0.5)["reading"], 0.0)
        self.assertEqual(radar(0.5, 0.5, 15, 0.5, 0.5)["reading"], 1.0)
        self.assertEqual(radar(0.5, 0.5, 20, 0.5, 0.5)["reading"], 1.0)

    def test_new_to_english_lowers_effective_reading_age(self):
        linh = get_student("s07")  # reading age 9, English 0.4
        self.assertAlmostEqual(linh.effective_reading_age, 7.8)


if __name__ == "__main__":
    unittest.main()
