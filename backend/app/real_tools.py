"""Real EdTech tools (Kien's list), each linked to the demo tool type it most resembles.

Hivemind has NOT tested these products. A type's Safety, Usability and Learning
numbers never apply to them, so they carry no numbers at all: only their type,
and in a match, where that type ranked for the person.
"""

from __future__ import annotations

import json
from functools import lru_cache

from . import config
from .tutors import TUTOR_INFO


@lru_cache(maxsize=1)
def _data() -> dict:
    data = json.loads(config.REAL_TOOLS_FILE.read_text(encoding="utf-8"))
    for tool in data["tools"]:
        if tool["group"] not in TUTOR_INFO:
            raise ValueError(f"real tool {tool['id']!r} has unknown type {tool['group']!r}")
    return data


def _type(tutor_id: str) -> dict:
    return {"tutor_id": tutor_id, "tutor_name": TUTOR_INFO[tutor_id][0]}


def _public(tool: dict) -> dict:
    keep = ("id", "name", "url", "kind", "blurb", "most_used")
    return {**{k: tool[k] for k in keep}, "type": _type(tool["group"])}


def listing() -> dict:
    """GET /api/real-tools: every tool in Kien's order (the 12 most used first)."""
    data = _data()
    return {
        "note": data["note"],
        "types": [{**_type(t["tutor_id"]), "how": t["how"]} for t in data["types"]],
        "tools": [_public(t) for t in data["tools"]],
    }


def for_match(ranked: list[dict]) -> list[dict]:
    """Real tools ordered by how their demo tool type ranked for this person.

    `ranked` already puts types with a safety concern last. Tools whose type isn't
    ranked (no class run yet, or not enough matches) are left out: we never guess.
    """
    places = {r["tutor_id"]: r for r in ranked if r.get("kind") == "built_in"}
    data = _data()
    out = []
    for order, tool in enumerate(data["tools"]):
        place = places.get(tool["group"])
        if place is None:
            continue
        out.append((place["rank"], order, {**_public(tool), "type_rank": place["rank"],
                                           "type_safety_concern": place["safety_warning"] is not None,
                                           "estimated": True, "note": data["note"]}))
    return [item for *_, item in sorted(out, key=lambda x: (x[0], x[1]))]


__all__ = ["listing", "for_match"]
