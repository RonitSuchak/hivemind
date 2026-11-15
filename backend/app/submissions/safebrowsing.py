"""Google Safe Browsing Lookup API v4 (free, non-commercial use only; key in .env).

No key = the check fails ("not set up"), so a missing key never lets a link through.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request

from .. import config

THREAT_TYPES = ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"]


class NotConfigured(Exception):
    pass


def build_request(urls: list[str], key: str) -> urllib.request.Request:
    body = {
        "client": {"clientId": "tutor-link-checker", "clientVersion": config.API_VERSION},
        "threatInfo": {"threatTypes": THREAT_TYPES, "platformTypes": ["ANY_PLATFORM"],
                       "threatEntryTypes": ["URL"], "threatEntries": [{"url": u} for u in urls]},
    }
    # The key goes in a header, never in the web address, so it can't end up in logs.
    return urllib.request.Request(config.SAFE_BROWSING_URL, data=json.dumps(body).encode(), method="POST",
                                  headers={"Content-Type": "application/json", "x-goog-api-key": key})


def dangerous(urls: list[str], opener=urllib.request.urlopen) -> list[str]:
    """The URLs Google lists as dangerous ([] = all fine). Raises NotConfigured or RuntimeError."""
    key = (config.setting("SAFE_BROWSING_API_KEY", "") or "").strip()
    if not key:
        raise NotConfigured("The link checker isn't set up yet.")
    for attempt in range(2):  # one retry: a single network blip shouldn't reject a maker
        try:
            with opener(build_request(urls, key), timeout=10) as response:
                data = json.load(response)
            break
        except urllib.error.HTTPError as error:  # Google said no (bad key, API off): retrying won't help
            raise RuntimeError("Google's link checker refused the request.") from error
        except (urllib.error.URLError, TimeoutError, ValueError) as error:
            if attempt == 1:
                raise RuntimeError("Couldn't reach Google's link checker.") from error
    return sorted({m["threat"]["url"] for m in data.get("matches", [])})
