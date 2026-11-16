import io
import json
import os
import socket
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from app import catalog, config, store
try:
    from app.demo_maker import reply_to
except ImportError:  # plain python3 without the .venv
    reply_to = None
from app.submissions import queue, safebrowsing
from app.submissions.links import LinkError, post_json, public_ip, resolve
from app.submissions.maker_client import WebTutor, ask_tutor

FORM = {"product": "PieChart Pal", "tutor_url": "https://pal.example/chat", "product_url": "https://pal.example/",
        "contact_email": "team@pal.example", "subject": "Fractions", "age_range": "11-14", "agreed_terms": True}


def demo_post(code=None):
    """Routes maker requests to the demo maker tutor in-process (no network)."""
    def post(url, payload):
        body = {"reply": reply_to(payload["messages"])}
        if code:
            body["hivemind_code"] = code
        return {"status": 200, "content_type": "application/json", "body": json.dumps(body).encode(), "seconds": 0.2}
    return post


def public_resolver(host, port=443):
    return ["93.184.216.34"]


class FakeResponse:
    def __init__(self, status, body=b"", location=None):
        self.status, self._body, self._location = status, body, location

    def getheader(self, name, default=None):
        return {"Location": self._location, "Content-Type": "application/json"}.get(name, default)

    def read(self, n=-1):
        return self._body[:n] if n >= 0 else self._body


def fake_connection(responses):
    class Conn:
        def __init__(self, host, ip, port, timeout):
            self.host = host

        def request(self, *a, **k):
            pass

        def getresponse(self):
            result = responses[self.host]
            if isinstance(result, Exception):
                raise result
            return result

        def close(self):
            pass
    return Conn


class LinkTests(unittest.TestCase):
    def test_public_and_private_addresses(self):
        for ip in ("127.0.0.1", "10.0.0.5", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0",
                   "::1", "fc00::1", "fe80::1", "::ffff:10.0.0.1", "224.0.0.1"):
            self.assertFalse(public_ip(ip), ip)
        self.assertTrue(public_ip("8.8.8.8"))

    def test_a_host_that_resolves_to_a_private_address_is_rejected(self):
        with mock.patch("socket.getaddrinfo", return_value=[(socket.AF_INET, 1, 6, "", ("10.0.0.5", 443))]):
            with self.assertRaises(LinkError) as caught:
                resolve("sneaky.example")
        self.assertEqual(caught.exception.check, "public_address")
        self.assertIn("10.0.0.5", caught.exception.detail)

    def test_a_redirect_to_a_private_address_is_rejected(self):
        def resolver(host, port=443):  # pal.example is public; internal.example is a private address
            if host == "pal.example":
                return ["93.184.216.34"]
            raise LinkError("public_address", "The link points to a private address (10.0.0.1).")
        conn = fake_connection({"pal.example": FakeResponse(302, location="https://internal.example/admin")})
        with self.assertRaises(LinkError) as caught:
            post_json("https://pal.example/chat", {"messages": []}, resolver=resolver, connection=conn)
        self.assertEqual(caught.exception.check, "public_address")

    def test_a_redirect_to_http_is_rejected(self):
        conn = fake_connection({"pal.example": FakeResponse(301, location="http://pal.example/chat")})
        with self.assertRaises(LinkError) as caught:
            post_json("https://pal.example/chat", {}, resolver=public_resolver, connection=conn)
        self.assertEqual(caught.exception.check, "secure_link")

    def test_a_slow_maker_is_rejected(self):
        conn = fake_connection({"pal.example": socket.timeout()})
        with self.assertRaises(LinkError) as caught:
            post_json("https://pal.example/chat", {}, resolver=public_resolver, connection=conn)
        self.assertIn("No answer within 10 s", caught.exception.detail)

    def test_a_reply_dripped_a_byte_at_a_time_is_cut_at_the_deadline(self):
        import time

        class Drip(FakeResponse):
            def read(self, n=-1):
                time.sleep(0.2)
                return b"x"
        conn = fake_connection({"pal.example": Drip(200)})
        started = time.monotonic()
        with mock.patch.object(config, "MAKER_TIMEOUT_SECONDS", 0.5):
            with self.assertRaises(LinkError) as caught:
                post_json("https://pal.example/chat", {}, resolver=public_resolver, connection=conn)
        self.assertLess(time.monotonic() - started, 1.5)
        self.assertIn("No answer within", caught.exception.detail)

    def test_the_watchdog_cuts_a_real_socket_that_never_answers(self):
        import http.client
        import time
        left, right = socket.socketpair()

        class Silent:
            def __init__(self, host, ip, port, timeout):
                self.sock = left  # a real socket that never receives anything

            def request(self, *a, **k):
                pass

            def getresponse(self):
                if not self.sock.recv(1):  # blocks until the watchdog shuts the socket
                    raise http.client.RemoteDisconnected("closed")

            def close(self):
                pass
        started = time.monotonic()
        try:
            with mock.patch.object(config, "MAKER_TIMEOUT_SECONDS", 0.5):
                with self.assertRaises(LinkError) as caught:
                    post_json("https://pal.example/chat", {}, resolver=public_resolver, connection=Silent)
        finally:
            left.close()
            right.close()
        self.assertLess(time.monotonic() - started, 2)
        self.assertIn("No answer within", caught.exception.detail)

    def test_a_server_that_drips_its_tls_handshake_is_cut_at_the_deadline(self):
        """A real local server sends a TLS record header promising 16 KB, then 1 byte every 0.2 s."""
        import threading
        import time
        from app.submissions.links import PinnedHTTPSConnection
        server = socket.socket()
        server.bind(("127.0.0.1", 0))
        server.listen(1)
        port, stop = server.getsockname()[1], threading.Event()

        def drip():
            conn, _ = server.accept()
            try:
                conn.sendall(b"\x16\x03\x03\x3f\xff")  # handshake record, length 16383
                while not stop.is_set():
                    conn.sendall(b"\x00")
                    time.sleep(0.2)
            except OSError:
                pass
            finally:
                conn.close()
        threading.Thread(target=drip, daemon=True).start()
        started = time.monotonic()
        try:
            with mock.patch.object(config, "MAKER_TIMEOUT_SECONDS", 1.0):
                with self.assertRaises(LinkError) as caught:
                    post_json(f"https://pal.example:{port}/chat", {}, resolver=lambda h, p=443: ["127.0.0.1"],
                              connection=PinnedHTTPSConnection)
        finally:
            stop.set()
            server.close()
        # Python's TLS handshake already uses one deadline for the whole handshake; the watchdog is a second guard.
        self.assertLess(time.monotonic() - started, 3)
        self.assertIn("No answer within", caught.exception.detail)

    def test_an_expired_connection_never_starts(self):
        from app.submissions.links import PinnedHTTPSConnection
        conn = PinnedHTTPSConnection("pal.example", "127.0.0.1", 9, 1.0)
        conn.expire()
        with self.assertRaises(TimeoutError):
            conn.connect()

    def test_oversized_and_html_replies_are_rejected(self):
        def post_with(body):
            return lambda url, payload: {"status": 200, "content_type": "application/json", "body": body,
                                         "seconds": 0.1}
        too_big = json.dumps({"reply": "x" * 20000}).encode()
        too_long = json.dumps({"reply": "x" * 4001}).encode()
        html = json.dumps({"reply": "<script>alert(1)</script>"}).encode()
        for body, words in ((too_big, "too big"), (too_long, "4,000"), (html, "plain text"),
                            (b"not json", "JSON")):
            with self.assertRaises(LinkError) as caught:
                ask_tutor("https://pal.example/chat", [], post=post_with(body))
            self.assertIn(words, caught.exception.detail)


class SafeBrowsingTests(unittest.TestCase):
    def test_googles_test_page_is_flagged(self):
        test_url = "https://testsafebrowsing.appspot.com/s/malware.html"
        seen = {}

        def opener(request, timeout):
            seen["header"] = request.get_header("X-goog-api-key")
            seen["url"] = request.full_url
            return io.BytesIO(json.dumps({"matches": [{"threat": {"url": test_url}}]}).encode())
        with mock.patch.dict(os.environ, {"SAFE_BROWSING_API_KEY": "test-key-not-real"}):
            self.assertEqual(safebrowsing.dangerous([test_url, "https://pal.example/"], opener), [test_url])
        self.assertEqual(seen["header"], "test-key-not-real")
        self.assertNotIn("test-key-not-real", seen["url"])  # key never in the web address

    def test_one_network_blip_is_retried(self):
        import urllib.error
        calls = {"n": 0}

        def flaky(request, timeout):
            calls["n"] += 1
            if calls["n"] == 1:
                raise urllib.error.URLError("blip")
            return io.BytesIO(b"{}")
        with mock.patch.dict(os.environ, {"SAFE_BROWSING_API_KEY": "test-key-not-real"}):
            self.assertEqual(safebrowsing.dangerous(["https://pal.example/"], flaky), [])
        self.assertEqual(calls["n"], 2)

    def test_no_key_fails_closed(self):
        with mock.patch.object(config, "setting", lambda name, default=None, *a: ""):
            with self.assertRaises(safebrowsing.NotConfigured):
                safebrowsing.dangerous(["https://pal.example/"])


@unittest.skipIf(reply_to is None, "FastAPI not installed (use backend/.venv)")
class FlowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        store.set_store(store.JsonStore(Path(self.tmp.name)))
        self.tools = {"lookup": lambda urls: [], "ask": lambda url, msgs: ask_tutor(url, msgs, post=demo_post()),
                      "resolver": public_resolver}

    def tearDown(self):
        store.set_store(None)
        self.tmp.cleanup()

    def test_http_link_fails_at_the_first_check(self):
        sub = queue.submit(dict(FORM, tutor_url="http://pal.example/chat"), **self.tools)
        self.assertEqual(sub["status"], "failed")
        self.assertEqual([(c["name"], c["passed"]) for c in sub["checks"]], [("secure_link", False)])

    def test_dangerous_link_and_private_address_fail_with_reasons(self):
        bad = dict(self.tools, lookup=lambda urls: urls[:1])
        sub = queue.submit(FORM, **bad)
        self.assertEqual(sub["checks"][-1]["name"], "reputation")
        private = dict(self.tools, resolver=lambda host, port=443: (_ for _ in ()).throw(
            LinkError("public_address", "The link points to a private address (10.0.0.5).")))
        sub = queue.submit(FORM, **private)
        self.assertEqual((sub["checks"][-1]["name"], sub["checks"][-1]["passed"]), ("public_address", False))

    def test_form_validation(self):
        for bad in (dict(FORM, agreed_terms=False), dict(FORM, contact_email="nope"), dict(FORM, product="")):
            with self.assertRaises(queue.SubmissionError):
                queue.submit(bad, **self.tools)

    def test_contact_email_is_never_public(self):
        sub = queue.submit(FORM, **self.tools)
        self.assertNotIn("contact_email", queue.public(sub))
        self.assertNotIn("team@pal.example", json.dumps(queue.public(sub)))

    def test_end_to_end_with_the_demo_maker_tutor(self):
        sub = queue.submit(FORM, **self.tools)
        self.assertEqual(sub["status"], "needs_ownership")
        self.assertEqual([c["passed"] for c in sub["checks"]], [True, True, True, True, None])
        code = sub["ownership_code"]

        self.assertEqual(queue.verify(sub["id"], ask=lambda u, m: ask_tutor(u, m, post=demo_post()))["status"],
                         "needs_ownership")  # code not added yet
        sub = queue.verify(sub["id"], ask=lambda u, m: ask_tutor(u, m, post=demo_post(code)))
        self.assertEqual(sub["status"], "queued")

        with self.assertRaises(queue.SubmissionError):
            queue.review("sub_999", True, None)
        sub = queue.review(sub["id"], True, "Stays on fractions.", start=False)
        self.assertEqual(sub["run"]["state"], "waiting")
        queue.class_run_for(sub["id"], make_tutor=lambda s: WebTutor(s["id"], s["product"], s["tutor_url"],
                                                                         post=demo_post(code)))
        sub = queue.get(sub["id"])
        self.assertEqual((sub["run"]["state"], sub["run"]["lessons_done"]), ("done", 30))
        self.assertEqual(sub["try_url"], FORM["product_url"])

        listed = {t["tutor_id"]: t for t in catalog.tutors()}
        self.assertEqual(listed[sub["id"]]["kind"], "submitted")
        self.assertFalse(listed[sub["id"]]["live_chat"])
        run = catalog.run(sub["id"])
        self.assertEqual(len(run["results"]), 30)
        self.assertFalse(run["safety"]["critical_fail"])  # the demo maker answers every trap safely

    def test_a_restarted_run_skips_lessons_already_taught(self):
        sub = queue.submit(FORM, **self.tools)
        queue.verify(sub["id"], ask=lambda u, m: ask_tutor(u, m, post=demo_post(sub["ownership_code"])))
        queue.review(sub["id"], True, None, start=False)
        calls = {"n": 0}

        def flaky(url, payload):
            calls["n"] += 1
            if calls["n"] > 20:
                raise LinkError("responds", "No answer within 10 s.")
            return demo_post()(url, payload)
        queue.class_run_for(sub["id"], make_tutor=lambda s: WebTutor(s["id"], s["product"], s["tutor_url"], post=flaky))
        first = queue.get(sub["id"])["run"]
        self.assertEqual(first["state"], "error")
        done_before = first["lessons_done"]
        first_lessons = {p.name for p in (Path(self.tmp.name) / "sublessons").glob("*.json")}
        queue.class_run_for(sub["id"], make_tutor=lambda s: WebTutor(s["id"], s["product"], s["tutor_url"],
                                                                         post=demo_post()))
        self.assertEqual(queue.get(sub["id"])["run"]["state"], "done")
        self.assertGreaterEqual(len(first_lessons), done_before)

    def test_only_queued_submissions_can_be_reviewed(self):
        sub = queue.submit(dict(FORM, tutor_url="http://x.example"), **self.tools)
        with self.assertRaises(queue.SubmissionError) as caught:
            queue.review(sub["id"], True, None)
        self.assertEqual(caught.exception.code, "wrong_status")


if __name__ == "__main__":
    unittest.main()
