"""Class session (18 Nov): raised limits, saving to laptop files when the database is blocked, and copying them later."""

import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from app import config, store
from app.limits import RateLimiter
from app.sync import sync


class ClassSessionTests(unittest.TestCase):
    def test_limits_are_raised_only_in_a_class_session(self):
        with mock.patch.dict(os.environ, {"CLASS_SESSION": ""}):
            self.assertEqual(config.rate_limits(), config.RATE_LIMITS)
        with mock.patch.dict(os.environ, {"CLASS_SESSION": "1"}):
            limits = config.rate_limits()
            for bucket, value in config.CLASS_RATE_LIMITS.items():
                self.assertEqual(limits[bucket], value)
                self.assertGreater(value[0], config.RATE_LIMITS[bucket][0])
            self.assertEqual(limits["submissions"], config.RATE_LIMITS["submissions"])  # the rest stay as they are
            self.assertEqual(limits["live_lab"], config.RATE_LIMITS["live_lab"])
            # ten classmates behind one school address can each save twice
            limiter = RateLimiter(limits)
            self.assertTrue(all(limiter.check("validation", "school-wifi") == 0 for _ in range(20)))

    def test_store_files_keeps_data_on_the_laptop_even_with_a_database_set(self):
        saved = store._store
        try:
            with mock.patch.dict(os.environ, {"DATABASE_URL": "postgresql://example.invalid/db", "STORE": "files"}):
                store._store = None
                self.assertIsInstance(store.get_store(), store.JsonStore)
        finally:
            store._store = saved


class SyncTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.files, self.database = store.JsonStore(root / "laptop"), store.JsonStore(root / "database")

    def tearDown(self):
        self.tmp.cleanup()

    def test_copies_what_is_missing_and_never_overwrites(self):
        self.files.put("validation", "HM_AAAA", {"real_gain": 2})
        self.files.put("validation", "HM_BBBB", {"real_gain": 1})
        self.files.put("suggestions", "s_1", {"text": "more topics"})
        self.files.put("matches", "m_1", {"profile": {}})  # not copied: short-lived
        self.database.put("validation", "HM_BBBB", {"real_gain": 5})  # already there, from another day

        self.assertEqual(sync(self.files, self.database, dry_run=True), {"validation": (1, 1), "suggestions": (1, 0)})
        self.assertIsNone(self.database.get("validation", "HM_AAAA"))  # a dry run writes nothing

        self.assertEqual(sync(self.files, self.database), {"validation": (1, 1), "suggestions": (1, 0)})
        self.assertEqual(self.database.get("validation", "HM_AAAA"), {"real_gain": 2})
        self.assertEqual(self.database.get("validation", "HM_BBBB"), {"real_gain": 5})  # kept, not overwritten
        self.assertIsNone(self.database.get("matches", "m_1"))
        self.assertTrue((self.files.root / "synced" / "validation" / "HM_AAAA.json").exists())  # moved, not lost

    def test_a_record_deleted_from_the_database_is_not_brought_back(self):
        # Security review (18 Nov): an admin removes a classmate entry; running sync again must not restore it.
        self.files.put("validation", "HM_CCCC", {"real_gain": 3})
        self.assertEqual(sync(self.files, self.database), {"validation": (1, 0)})
        self.database.delete("validation", "HM_CCCC")
        self.assertEqual(sync(self.files, self.database), {"validation": (0, 0)})
        self.assertIsNone(self.database.get("validation", "HM_CCCC"))

    def test_put_new_never_overwrites(self):
        self.assertTrue(self.database.put_new("validation", "HM_DDDD", {"real_gain": 1}))
        self.assertFalse(self.database.put_new("validation", "HM_DDDD", {"real_gain": 9}))
        self.assertEqual(self.database.get("validation", "HM_DDDD"), {"real_gain": 1})


if __name__ == "__main__":
    unittest.main()
