"""Three small guards for the API, found by the security audit (SECURITY-AUDIT-2026-11-15.md).

1. client_ip(): who a request comes from, for rate limits. Only trusts the
   X-Forwarded-For entries our own proxies add (config.PROXY_HOPS), never the
   ones a visitor writes, so faking the header can't dodge a limit.
2. BodyLimit: reads a request body in pieces and stops at 16 KB, so nobody can
   make the server hold a huge body in memory.
3. SecurityHeaders: tells browsers not to guess content types, not to put the
   API in a frame, and not to send referrers.

Written as plain ASGI middleware (the layer between the web server and the app),
so the body is checked as it streams in.
"""

from __future__ import annotations

import json

from . import config


def client_ip(headers, peer: str | None, hops: int | None = None) -> str:
    """The visitor's address. headers: a mapping with .get(); peer: the connection's address."""
    hops = config.PROXY_HOPS if hops is None else hops
    if hops <= 0:
        return peer or "unknown"
    forwarded = [part.strip() for part in (headers.get("x-forwarded-for") or "").split(",") if part.strip()]
    if len(forwarded) < hops:
        return peer or "unknown"
    return forwarded[-hops]  # the entry our nearest trusted proxy added


async def _send_json(send, status: int, body: dict) -> None:
    data = json.dumps(body).encode()
    headers = [(b"content-type", b"application/json"), (b"content-length", str(len(data)).encode())]
    headers += [(k.lower().encode(), v.encode()) for k, v in config.SECURITY_HEADERS.items()]
    await send({"type": "http.response.start", "status": status, "headers": headers})
    await send({"type": "http.response.body", "body": data})


class BodyLimit:
    def __init__(self, app, limit: int | None = None):
        self.app, self.limit = app, limit or config.MAX_BODY_BYTES

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] not in ("POST", "PUT", "PATCH", "DELETE"):
            return await self.app(scope, receive, send)
        too_big = {"error": {"code": "too_long", "message": "The request is too big."}}
        declared = dict(scope["headers"]).get(b"content-length", b"")
        if declared.isdigit() and int(declared) > self.limit:
            return await _send_json(send, 400, too_big)
        body = bytearray()
        while True:  # read in pieces; stop as soon as it passes the limit
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            body += message.get("body", b"")
            if len(body) > self.limit:
                return await _send_json(send, 400, too_big)
            if not message.get("more_body"):
                break
        replayed = False

        async def replay():
            nonlocal replayed
            if not replayed:
                replayed = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        await self.app(scope, replay, send)


class SecurityHeaders:
    def __init__(self, app, headers: dict | None = None, skip_csp: tuple = config.DOCS_PATHS):
        self.app, self.headers, self.skip_csp = app, headers or config.SECURITY_HEADERS, skip_csp

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        extra = [(k.lower().encode(), v.encode()) for k, v in self.headers.items()
                 if not (k == "Content-Security-Policy" and scope["path"] in self.skip_csp)]

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                names = {name.lower() for name, _ in message.get("headers", [])}
                message["headers"] = list(message.get("headers", [])) + [h for h in extra if h[0] not in names]
            await send(message)

        await self.app(scope, receive, send_with_headers)
