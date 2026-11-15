"""Safe outbound requests to a maker's link.

- https only;
- every address the host resolves to must be public (no loopback, private,
  link-local such as 169.254.169.254, carrier-grade NAT, multicast or reserved);
- redirects are followed by hand (at most 3) and every hop is checked again;
- we connect to the exact address we checked (no second DNS lookup), so DNS
  rebinding can't swap a public address for a private one;
- at most 16 KB is read, within a 10-second deadline.
"""

from __future__ import annotations

import http.client
import ipaddress
import json
import socket
import ssl
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
    """HTTPS to a fixed IP address, while still checking the certificate for the host name."""

    def __init__(self, host: str, ip: str, port: int, timeout: float):
        super().__init__(host, port=port, timeout=timeout, context=ssl.create_default_context())
        self._ip = ip

    def connect(self):
        sock = socket.create_connection((self._ip, self.port), self.timeout)
        self.sock = self._context.wrap_socket(sock, server_hostname=self.host)


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
            body = response.read(config.MAKER_MAX_RESPONSE_BYTES + 1)
            return {"status": response.status, "content_type": response.getheader("Content-Type") or "",
                    "body": body, "seconds": time.monotonic() - started}
        except LinkError:
            raise
        except (TimeoutError, socket.timeout):
            raise LinkError("responds", f"No answer within {config.MAKER_TIMEOUT_SECONDS:.0f} s.") from None
        except ssl.SSLError:
            raise LinkError("secure_link", "The link's https certificate isn't valid.") from None
        except (OSError, http.client.HTTPException):
            raise LinkError("responds", "Couldn't connect to the link.") from None
        finally:
            conn.close()
    raise LinkError("responds", f"Too many redirects (more than {config.MAKER_MAX_REDIRECTS}).")
