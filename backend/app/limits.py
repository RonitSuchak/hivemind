"""Per-device rate limits, kept in memory only (IP addresses are never logged or stored)."""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from . import config


class RateLimiter:
    def __init__(self, limits: dict | None = None):
        self.limits = limits or config.RATE_LIMITS
        self._hits: dict[tuple[str, str], deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, bucket: str, key: str) -> int:
        """0 if allowed (and counted), else the seconds to wait."""
        count, window = self.limits[bucket]
        now = time.monotonic()
        with self._lock:
            hits = self._hits[(bucket, key)]
            while hits and now - hits[0] > window:
                hits.popleft()
            if len(hits) >= count:
                return max(1, int(window - (now - hits[0])) + 1)
            hits.append(now)
            if len(self._hits) > 50_000:  # memory guard
                self._hits.clear()
            return 0

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = RateLimiter()
