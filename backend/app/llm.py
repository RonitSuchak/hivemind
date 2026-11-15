"""A small client for Google's Gemini model, using only Python's standard library.

No package to install. The key goes in a request header, never in the web
address, so it can't end up in logs. Calls are spaced out and retried, to
stay inside the free plan's limits.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request

from . import config

API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
# Pinned on purpose, so results don't shift mid-week. Chosen 15 Nov after testing:
# 3.5-flash-lite replied in about 1.5 s; 3.8-flash took over 60 s; 2.5-flash is closed to new users.
DEFAULT_MODEL = "gemini-3.5-flash-lite"
RETRY_CODES = {429, 500, 503}  # too many requests, or a temporary server problem


class LLMError(RuntimeError):
    pass


class GeminiClient:
    def __init__(self, api_key: str | None = None, model: str | None = None,
                 min_seconds: float | None = None, timeout: float = 30):
        self.api_key = api_key or config.gemini_key()
        self.model = model or config.setting("GEMINI_MODEL", DEFAULT_MODEL)
        self.min_seconds = float(min_seconds if min_seconds is not None else config.setting("GEMINI_MIN_SECONDS", "4"))
        self.timeout = timeout
        self._last_call = 0.0

    def build_request(self, system: str, chat: list[dict], max_tokens: int = 1024) -> urllib.request.Request:
        """chat items look like {"from": "student" or "tutor", "text": "..."}."""
        contents = [
            {"role": "user" if m["from"] == "student" else "model", "parts": [{"text": m["text"]}]}
            for m in chat
        ]
        generation = {"maxOutputTokens": max_tokens, "temperature": 0.7}
        body = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": contents,
            "generationConfig": generation,
        }
        return urllib.request.Request(
            API_URL.format(model=self.model),
            data=json.dumps(body).encode(),
            headers={"Content-Type": "application/json", "x-goog-api-key": self.api_key},
            method="POST",
        )

    def _wait_turn(self) -> None:
        gap = time.monotonic() - self._last_call
        if gap < self.min_seconds:
            time.sleep(self.min_seconds - gap)
        self._last_call = time.monotonic()

    def chat(self, system: str, chat: list[dict]) -> str:
        request = self.build_request(system, chat)
        for attempt in range(4):
            self._wait_turn()
            try:
                with urllib.request.urlopen(request, timeout=self.timeout) as response:
                    data = json.load(response)
                break
            except urllib.error.HTTPError as error:
                if error.code in RETRY_CODES and attempt < 3:
                    time.sleep(5 * 2**attempt)  # 5, 10, 20 seconds
                    continue
                detail = error.read().decode(errors="replace")[:300]
                raise LLMError(f"Gemini returned HTTP {error.code}: {detail}") from None
            except TimeoutError:
                if attempt < 3:
                    continue
                raise LLMError(f"Gemini did not answer within {self.timeout:.0f} s, 4 times in a row.") from None
            except urllib.error.URLError as error:
                raise LLMError(f"Could not reach Gemini: {error.reason}") from None

        try:
            parts = data["candidates"][0]["content"]["parts"]
            text = "".join(p.get("text", "") for p in parts).strip()
        except (KeyError, IndexError):
            reason = (data.get("candidates") or [{}])[0].get("finishReason", "unknown")
            raise LLMError(f"Gemini gave no reply (reason: {reason}).") from None
        if not text:
            raise LLMError("Gemini gave an empty reply.")
        return text
