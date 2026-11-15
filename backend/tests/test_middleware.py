import unittest

from app.middleware import client_ip


class ClientIpTests(unittest.TestCase):
    def test_on_a_laptop_the_header_is_ignored(self):
        self.assertEqual(client_ip({"x-forwarded-for": "1.2.3.4"}, "127.0.0.1", hops=0), "127.0.0.1")

    def test_behind_one_proxy_only_the_last_entry_counts(self):
        headers = {"x-forwarded-for": "6.6.6.6, 5.5.5.5, 81.2.69.160"}  # visitor faked the first two
        self.assertEqual(client_ip(headers, "10.0.0.1", hops=1), "81.2.69.160")

    def test_missing_or_short_header_falls_back_to_the_connection(self):
        self.assertEqual(client_ip({}, "10.0.0.1", hops=1), "10.0.0.1")
        self.assertEqual(client_ip({"x-forwarded-for": "81.2.69.160"}, "10.0.0.1", hops=2), "10.0.0.1")


if __name__ == "__main__":
    unittest.main()
