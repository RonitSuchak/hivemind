"""The Store plug: one interface, JSON files on a laptop, a Postgres database online (item 18).

    store = get_store()
    store.put("submissions", "sub_001", {...}); store.get("submissions", "sub_001")

Online, Render's free disk is wiped on every restart, so DATABASE_URL (in
.env, filled in by Ronit) switches to Postgres. Never stored: live chats,
names, IP addresses.
"""

from __future__ import annotations

import json
import re
import threading
import time
from pathlib import Path

from . import config

SAFE_ID = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


def _check(kind: str, item_id: str | None = None) -> None:
    if not SAFE_ID.match(kind) or (item_id is not None and not SAFE_ID.match(item_id)):
        raise ValueError("Unsafe store key.")


class JsonStore:
    kind = "files"

    def __init__(self, root: Path = config.STORE_DIR):
        self.root = Path(root)
        self._lock = threading.Lock()

    def _path(self, kind: str, item_id: str) -> Path:
        _check(kind, item_id)
        return self.root / kind / f"{item_id}.json"

    def get(self, kind: str, item_id: str) -> dict | None:
        path = self._path(kind, item_id)
        return json.loads(path.read_text()) if path.exists() else None

    def put(self, kind: str, item_id: str, data: dict) -> None:
        path = self._path(kind, item_id)
        with self._lock:
            path.parent.mkdir(parents=True, exist_ok=True)
            tmp = path.with_suffix(".tmp")
            tmp.write_text(json.dumps(data, ensure_ascii=False))
            tmp.replace(path)

    def list(self, kind: str) -> list[dict]:
        _check(kind)
        folder = self.root / kind
        if not folder.exists():
            return []
        return [json.loads(p.read_text()) for p in sorted(folder.glob("*.json"))]

    def delete(self, kind: str, item_id: str) -> bool:
        path = self._path(kind, item_id)
        if path.exists():
            path.unlink()
            return True
        return False

    def delete_older(self, kind: str, days: float) -> int:
        """Remove the records of this kind last saved more than `days` ago. Returns how many."""
        _check(kind)
        cutoff, gone = time.time() - days * 86_400, 0
        with self._lock:
            for path in (self.root / kind).glob("*.json") if (self.root / kind).exists() else ():
                if path.stat().st_mtime < cutoff:
                    path.unlink(missing_ok=True)
                    gone += 1
        return gone


class StoreUnavailable(Exception):
    """The database can't be reached: no internet, or a network that blocks its port (5432)."""


class PostgresStore:
    """One table: records(kind, id, data jsonb, updated_at). Needs psycopg (installed in .venv).

    Connects lazily, so the server starts and the built-in results work even when the
    database is out of reach. After a failed connection it refuses at once for
    STORE_RETRY_SECONDS, so pages don't each wait for the timeout."""

    kind = "database"

    def __init__(self, url: str):
        import psycopg  # only needed online
        from psycopg.types.json import Jsonb

        self._psycopg, self._jsonb, self.url = psycopg, Jsonb, url
        self._ready, self._failed_at = False, None

    def _connect(self):
        if self._failed_at is not None and time.monotonic() - self._failed_at < config.STORE_RETRY_SECONDS:
            raise StoreUnavailable("database unreachable")
        try:
            conn = self._psycopg.connect(self.url, connect_timeout=config.STORE_CONNECT_SECONDS, autocommit=True)
        except self._psycopg.OperationalError:
            self._failed_at = time.monotonic()
            raise StoreUnavailable("database unreachable") from None
        self._failed_at = None
        if not self._ready:
            conn.execute("""CREATE TABLE IF NOT EXISTS records (
                kind text NOT NULL, id text NOT NULL, data jsonb NOT NULL,
                updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (kind, id))""")
            self._ready = True
        return conn

    def get(self, kind: str, item_id: str) -> dict | None:
        _check(kind, item_id)
        with self._connect() as conn:
            row = conn.execute("SELECT data FROM records WHERE kind = %s AND id = %s", (kind, item_id)).fetchone()
        return row[0] if row else None

    def put(self, kind: str, item_id: str, data: dict) -> None:
        _check(kind, item_id)
        with self._connect() as conn:
            conn.execute("""INSERT INTO records (kind, id, data) VALUES (%s, %s, %s)
                            ON CONFLICT (kind, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()""",
                         (kind, item_id, self._jsonb(data)))

    def list(self, kind: str) -> list[dict]:
        _check(kind)
        with self._connect() as conn:
            rows = conn.execute("SELECT data FROM records WHERE kind = %s ORDER BY id", (kind,)).fetchall()
        return [r[0] for r in rows]

    def delete(self, kind: str, item_id: str) -> bool:
        _check(kind, item_id)
        with self._connect() as conn:
            return conn.execute("DELETE FROM records WHERE kind = %s AND id = %s", (kind, item_id)).rowcount > 0

    def delete_older(self, kind: str, days: float) -> int:
        """Remove the records of this kind last saved more than `days` ago. Returns how many."""
        _check(kind)
        with self._connect() as conn:
            return conn.execute("DELETE FROM records WHERE kind = %s AND updated_at < now() - make_interval(secs => %s)",
                                (kind, days * 86_400)).rowcount


_store = None


def get_store():
    global _store
    if _store is None:
        url = (config.setting("DATABASE_URL", "") or "").strip()
        # STORE=files keeps saved data on this laptop even when DATABASE_URL is set: public-link.sh --class uses it
        # when the database is out of reach (school Wi-Fi), and `python -m app.sync` copies it across later.
        files = (config.setting("STORE", "") or "").strip().lower() == "files"
        _store = PostgresStore(url) if url and not files else JsonStore()
    return _store


def set_store(store) -> None:
    """For tests: use a temporary store."""
    global _store
    _store = store
