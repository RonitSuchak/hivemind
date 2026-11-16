"""Safe outbound requests to a maker's link.

- https only;
- every address the host resolves to must be public (no loopback, private,
  link-local such as 169.254.169.254, carrier-grade NAT, multicast or reserved);
- redirects are followed by hand (at most 3) and every hop is checked again;
- we connect to the exact address we checked (no second DNS lookup), so DNS
  rebinding can't swap a public address for a private one;
- at most 16 KB is read, within ONE 10-second deadline for the whole request: a
  watchdog cuts the connection when time runs out, so a tutor that drips its
  reply a byte at a time can't hold the server for longer.
"""

from __future__ import annotations

import http.client
import ipaddress
import json
import socket
import ssl
import threading
import time
from urllib.parse import urljoin, urlsplit

from .. import config


class LinkError(Exception):
    """check: which check failed ("secure_link", "public_address", "responds"); detail: plain words."""

    def __init__(self, check: str, detail: str):
        super().__init__(detail)
        self.check, self.detail = check, detail


def is_https(url: str) -> bool:
    try:
        parts = urlsplit(url)
    except ValueError:
        return False
    return parts.scheme == "https" and bool(parts.hostname) and not parts.username and not parts.password


def public_ip(ip: str) -> bool:
    address = ipaddress.ip_address(ip)
    if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
        address = address.ipv4_mapped
    return address.is_global and not address.is_multicast


def resolve(host: str, port: int = 443) -> list[str]:
    """Every address the host name points to. Raises LinkError if any is not public."""
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except (socket.gaierror, UnicodeError):
        raise LinkError("public_address", f"Couldn't find a server called {host}.") from None
    ips = sorted({info[4][0] for info in infos})
    for ip in ips:
        if not public_ip(ip):
            raise LinkError("public_address", f"The link points to a private address ({ip}). "
                                              "Links must point to a public server.")
    return ips


class PinnedHTTPSConnection(http.client.HTTPSConnection):
    """HTTPS to a fixed IP address, while still checking the certificate for the host name.

    The socket is stored before the TLS handshake starts, so the watchdog can cut
    a server that drips its handshake; expire() also stops a connect that hasn't begun.
    """

    def __init__(self, host: str, ip: str, port: int, timeout: float):
        super().__init__(host, port=port, timeout=timeout, context=ssl.create_default_context())
        self._ip = ip
        self._expired = False

    def connect(self):
        if self._expired:
            raise TimeoutError("deadline passed")
        sock = socket.create_connection((self._ip, self.port), self.timeout)
        self.sock = self._context.wrap_socket(sock, server_hostname=self.host, do_handshake_on_connect=False)
        if self._expired:  # the watchdog fired while we were connecting
            raise TimeoutError("deadline passed")
        self.sock.do_handshake()  # cut-able: self.sock is already set

    def expire(self) -> None:
        """Called by the watchdog: mark the deadline as passed and unblock any read."""
        self._expired = True
        sock = self.sock
        if sock is not None:
            try:
                sock.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass


def _cut(conn) -> None:
    """Called by the watchdog: shut the socket so any blocked read (or handshake) returns at once."""
    if hasattr(conn, "expire"):
        conn.expire()
        return
    sock = getattr(conn, "sock", None)
    if sock is not None:
        try:
            sock.shutdown(socket.SHUT_RDWR)
        except OSError:
            pass


def _check_deadline(started: float) -> None:
    if time.monotonic() - started >= config.MAKER_TIMEOUT_SECONDS:
        raise LinkError("responds", f"No answer within {config.MAKER_TIMEOUT_SECONDS:.0f} s.")


def post_json(url: str, payload: dict, resolver=resolve, connection=PinnedHTTPSConnection) -> dict:
    """POST JSON safely. Returns {"status", "content_type", "body" (bytes), "seconds"}."""
    started = time.monotonic()
    data = json.dumps(payload).encode()
    for _ in range(config.MAKER_MAX_REDIRECTS + 1):
        if not is_https(url):
            raise LinkError("secure_link", "The link (or a redirect) doesn't use https.")
        parts = urlsplit(url)
        port = parts.port or 443
        ips = resolver(parts.hostname, port)
        left = config.MAKER_TIMEOUT_SECONDS - (time.monotonic() - started)
        if left <= 0:
            raise LinkError("responds", f"No answer within {config.MAKER_TIMEOUT_SECONDS:.0f} s.")
        conn = connection(parts.hostname, ips[0], port, left)
        path = (parts.path or "/") + (f"?{parts.query}" if parts.query else "")
        watchdog = threading.Timer(left, _cut, args=(conn,))  # the per-read timeout alone can be dripped past
        watchdog.daemon = True
        watchdog.start()
        try:
            conn.request("POST", path, body=data, headers={"Content-Type": "application/json",
                                                           "Accept": "application/json",
                                                           "User-Agent": "TutorChecker/1.0"})
            response = conn.getresponse()
            if response.status in (301, 302, 303, 307, 308):
                location = response.getheader("Location")
                conn.close()
                if not location:
                    raise LinkError("responds", "The link redirected nowhere.")
                url = urljoin(url, location)
                continue
            _check_deadline(started)
            body = bytearray()
            while len(body) <= config.MAKER_MAX_RESPONSE_BYTES:
                chunk = response.read(min(4096, config.MAKER_MAX_RESPONSE_BYTES + 1 - len(body)))
                _check_deadline(started)
                if not chunk:
                    break
                body += chunk
            return {"status": response.status, "content_type": response.getheader("Content-Type") or "",
                    "body": bytes(body), "seconds": time.monotonic() - started}
        except LinkError:
            raise
        except (TimeoutError, socket.timeout):
            raise LinkError("responds", f"No answer within {config.MAKER_TIMEOUT_SECONDS:.0f} s.") from None
        except ssl.SSLError:
            if time.monotonic() - started >= config.MAKER_TIMEOUT_SECONDS:  # the watchdog cut it
                raise LinkError("responds", f"No answer within {config.MAKER_TIMEOUT_SECONDS:.0f} s.") from None
            raise LinkError("secure_link", "The link's https certificate isn't valid.") from None
        except (OSError, http.client.HTTPException, ValueError):
            if time.monotonic() - started >= config.MAKER_TIMEOUT_SECONDS:  # the watchdog cut it
                raise LinkError("responds", f"No answer within {config.MAKER_TIMEOUT_SECONDS:.0f} s.") from None
            raise LinkError("responds", "Couldn't connect to the link.") from None
        finally:
            watchdog.cancel()
            conn.close()
    raise LinkError("responds", f"Too many redirects (more than {config.MAKER_MAX_REDIRECTS}).")
