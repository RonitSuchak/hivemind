"""Copy data saved on this laptop into the database, after a class session on a Wi-Fi that blocked it.

    cd backend && .venv/bin/python -m app.sync            # copy
    cd backend && .venv/bin/python -m app.sync --dry-run  # only say what would be copied

When public-link.sh --class can't reach the database, saved data goes to files in backend/data/store/ instead
(STORE=files). Run this later on a network that reaches the database (a phone hotspot, a VPN, home).
It copies classmates' results, suggestions and submissions. It never overwrites a record that is already in the
database. Each file it has dealt with moves to backend/data/store/synced/, so it is copied once only: a record
deleted from the database later (say, a classmate entry removed by the admin) is never brought back by another run.
Run it after the class session is over (the link restarted without --class), since the moved files no longer show
on a backend that is still saving to files.
"""

from __future__ import annotations

import shutil
import sys

from . import config
from .store import JsonStore, PostgresStore, StoreUnavailable

KINDS = ("validation", "suggestions", "submissions")  # matches are short-lived and live events are logs: not copied


def sync(files: JsonStore, database, dry_run: bool = False) -> dict:
    """{kind: (copied, already there)} for every kind with saved files not synced before.

    Writes with put_new (insert only, so a record already in the database is never overwritten), then moves
    each file it dealt with to files.root/synced/<kind>/, so no later run can copy it again."""
    report = {}
    for kind in KINDS:
        folder = files.root / kind
        if not folder.exists():
            continue
        copied = skipped = 0
        done = files.root / "synced" / kind
        for path in sorted(folder.glob("*.json")):
            rid = path.stem
            if dry_run:
                new = database.get(kind, rid) is None
            else:
                new = database.put_new(kind, rid, files.get(kind, rid))
                done.mkdir(parents=True, exist_ok=True)
                shutil.move(str(path), str(done / path.name))
            copied, skipped = copied + new, skipped + (not new)
        report[kind] = (copied, skipped)
    return report


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    dry_run = "--dry-run" in argv
    url = (config.setting("DATABASE_URL", "") or "").strip()
    if not url:
        print("No DATABASE_URL in backend/.env, so there is no database to copy to.")
        return 1
    files = JsonStore(config.STORE_DIR)
    try:
        report = sync(files, PostgresStore(url), dry_run)
    except StoreUnavailable:
        print("The database is out of reach from this network. Try a phone hotspot or a VPN, then run this again.")
        return 1
    if not report:
        print(f"Nothing saved on this laptop (no files in {files.root}).")
        return 0
    verb = "Would copy" if dry_run else "Copied"
    for kind, (copied, skipped) in report.items():
        print(f"{kind}: {verb.lower()} {copied}, already in the database {skipped}")
    total = sum(c for c, _ in report.values())
    where = files.root / "synced"
    print(f"{verb} {total} record(s)." + ("" if dry_run else f" The files moved to {where}, so they are never copied again."))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
