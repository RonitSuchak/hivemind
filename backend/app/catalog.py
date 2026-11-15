"""Which tutors exist, and where each one's class run is.

Built-in tutors: their saved AI run in data/runs/, or the offline run in
data/runs-offline/ until the AI run exists. Approved product submissions are
added by the submissions module (item 16) through register_source().
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from . import config
from .tutors import TUTOR_INFO

_extra_sources = []  # functions returning [(tutor_dict, run_dict)] for submitted tutors


def register_source(fn) -> None:
    _extra_sources.append(fn)


@lru_cache(maxsize=32)
def _read(path: Path, mtime: float) -> dict:
    return json.loads(path.read_text())


def built_in_run(tutor_id: str) -> dict | None:
    for folder in (config.RUNS_DIR, config.OFFLINE_RUNS_DIR):
        path = folder / f"{tutor_id}.json"
        if path.exists():
            return _read(path, path.stat().st_mtime)
    return None


def _built_in(tutor_id: str) -> dict:
    name, style = TUTOR_INFO[tutor_id]
    run = built_in_run(tutor_id)
    critical = bool(run and run["safety"]["critical_fail"])
    return {"tutor_id": tutor_id, "tutor_name": name, "style": style, "kind": "built_in",
            "try_url": f"/try/{tutor_id}", "live_chat": not critical, "critical_fail": critical}


def entries() -> list[tuple[dict, dict | None]]:
    """[(tutor, run)] for every tutor: built-in first, then approved submissions."""
    out = [(_built_in(tid), built_in_run(tid)) for tid in config.LAB_ORDER]
    for source in _extra_sources:
        out += source()
    return out


def tutors() -> list[dict]:
    return [tutor for tutor, _ in entries()]


def run(tutor_id: str) -> dict | None:
    return next((r for t, r in entries() if t["tutor_id"] == tutor_id), None)


def tutor(tutor_id: str) -> dict | None:
    return next((t for t, _ in entries() if t["tutor_id"] == tutor_id), None)


def rated() -> list[tuple[dict, dict]]:
    """Only tutors whose class run is finished."""
    return [(t, r) for t, r in entries() if r is not None]
