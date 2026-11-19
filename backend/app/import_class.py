"""Load one real class's results (Kien's file) into the classmate results behind GET /api/validation.

    cd backend && .venv/bin/python -m app.import_class              # import frontend/src/data/real-class.json
    cd backend && .venv/bin/python -m app.import_class --dry-run    # only say what would be imported
    cd backend && .venv/bin/python -m app.import_class path/to/file.json

19 Nov: 40 classmates sat the 10-question fraction test, had one lesson with a real tool from one group (say BBC
Bitesize for "lecturer"), then sat the test again. The file has codes only, never names. This reads it (never changes
it) and saves each student as a classmate result:

  - code S01 becomes HM-C1S01 (class 1), because classmate codes start with HM-;
  - real_gain is after minus before, and can be negative, so the numbers match the Proof page;
  - predicted_gain is Hivemind's prediction where the file has one, otherwise None (never a made-up number);
  - tool (the real tool), left_out (None, "missing" or "off_topic") and source ("class-2026-11-19") are kept.

It never overwrites a record (put_new), so running it twice adds nothing.
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from . import config
from .store import StoreUnavailable, get_store

DEFAULT_FILE = config.BACKEND_DIR.parent / "frontend" / "src" / "data" / "real-class.json"
CLASS_PREFIX = "HM-C1"
GROUPS = ("answer_machine", "socratic", "simple_steps", "lecturer", "cheerleader")
LEFT_OUT = (None, "missing", "off_topic")


def _score(value) -> int | None:
    if value is None:
        return None
    if not isinstance(value, int) or not 0 <= value <= 10:
        raise ValueError(f"test scores are whole numbers from 0 to 10, not {value!r}")
    return value


def entries_from(data: dict, created: str) -> list[dict]:
    """The classmate results for one class file. Raises ValueError on anything that does not look right."""
    source = f"class-{data.get('collected', 'unknown')}"
    out, seen = [], set()
    for s in data["students"]:
        if not re.fullmatch(r"[A-Z0-9]{1,5}", str(s.get("code", ""))):
            raise ValueError(f"student codes are short letters and digits, not {s.get('code')!r}")
        code = CLASS_PREFIX + s["code"]
        if code in seen:
            raise ValueError(f"{s['code']} appears twice")
        seen.add(code)
        if s.get("type") not in GROUPS:
            raise ValueError(f"{s['code']}: unknown tool group {s.get('type')!r}")
        if s.get("left_out") not in LEFT_OUT:
            raise ValueError(f"{s['code']}: unknown left_out {s.get('left_out')!r}")
        before, after = _score(s.get("before")), _score(s.get("after"))
        gain = None if before is None or after is None else after - before
        predicted = s.get("predicted")
        predicted = None if predicted is None else round(float(predicted), 1)
        out.append({"code": code, "tutor_id": s["type"], "tool": str(s.get("tool") or "")[:80],
                    "before": before, "after": after, "real_gain": gain, "predicted_gain": predicted,
                    "difference": None if gain is None or predicted is None else round(gain - predicted, 1),
                    "left_out": s.get("left_out"), "source": source, "created": created})
    return out


def import_class(store, data: dict, dry_run: bool = False) -> tuple[int, int]:
    """(added, already there). Insert only: a record already saved is never overwritten."""
    created = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    added = skipped = 0
    for entry in entries_from(data, created):
        key = entry["code"].replace("-", "_")
        new = store.get("validation", key) is None if dry_run else store.put_new("validation", key, entry)
        added, skipped = added + new, skipped + (not new)
    return added, skipped


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    dry_run = "--dry-run" in argv
    paths = [a for a in argv if not a.startswith("--")]
    path = Path(paths[0]) if paths else DEFAULT_FILE
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        added, skipped = import_class(get_store(), data, dry_run)
    except (OSError, ValueError, KeyError) as e:
        print(f"Could not import {path}: {e}")
        return 1
    except StoreUnavailable:
        print("The database is out of reach from this network. Try a phone hotspot, then run this again.")
        return 1
    verb = "Would add" if dry_run else "Added"
    print(f"{verb} {added} classmate result(s); {skipped} already saved (never overwritten).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
