"""The ratings table and heatmap: each tutor's scores and average gain per group (item 8)."""

from __future__ import annotations

from statistics import mean

from .students import STUDENTS, TAG_LABELS, TAG_RULES


def groups() -> list[dict]:
    out = [{"id": "all", "label": TAG_LABELS["all"], "size": len(STUDENTS)}]
    return out + [{"id": tag, "label": TAG_LABELS[tag], "size": sum(tag in s.tags for s in STUDENTS)}
                  for tag in TAG_RULES]


def group_gains(run: dict) -> dict:
    tags = {s.id: s.tags for s in STUDENTS}
    gains = {"all": round(mean(r["gain"] for r in run["results"]), 1)}
    for tag in TAG_RULES:
        values = [r["gain"] for r in run["results"] if tag in tags.get(r["student_id"], ())]
        gains[tag] = round(mean(values), 1) if values else None
    return gains


def ratings(rated: list[tuple[dict, dict]]) -> dict:
    rows = [{"tutor_id": t["tutor_id"], "tutor_name": t["tutor_name"], "kind": t["kind"], "try_url": t["try_url"],
             "scores": run["scores"], "critical_fail": run["safety"]["critical_fail"], "avg_gain": group_gains(run)}
            for t, run in rated]
    dates = sorted(run["tested_on"] for _, run in rated)
    tested = f" Tested {dates[-1]}." if dates else ""
    return {"groups": groups(), "rows": rows, "note": f"Simulated students, not real children.{tested}"}
