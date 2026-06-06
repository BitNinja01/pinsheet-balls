"""Ball data loading — reads ball_data.csv and pivots to wide format."""
from __future__ import annotations

import csv
import logging
from pathlib import Path

log = logging.getLogger("pinsheet")

DATA_FILE = Path(__file__).resolve().parent.parent / "ball_data.csv"


def load_ball_data() -> dict | None:
    """Read ball_data.csv and return structured dict with pivoted rows.

    Returns None if the CSV file is missing or unreadable.
    """
    if not DATA_FILE.exists():
        log.warning("balls: ball_data.csv not found at %s", DATA_FILE)
        return None

    try:
        raw = list(csv.DictReader(DATA_FILE.open(newline="")))
    except Exception:
        log.exception("balls: failed to read ball_data.csv")
        return None

    if not raw:
        log.warning("balls: ball_data.csv is empty")
        return None

    metrics = sorted(set(r["metric"] for r in raw if r.get("metric")))

    groups: dict[tuple[str, str], dict[str, float]] = {}
    for row in raw:
        b = (row.get("ball") or "").strip()
        speed = (row.get("speed") or "").strip()
        club = (row.get("club") or "").strip()
        m = (row.get("metric") or "").strip()
        v = (row.get("value") or "").strip()
        if not b or not speed or not club or not m:
            continue
        try:
            val = float(v)
        except (ValueError, TypeError):
            log.warning("balls: skipping row with non-numeric value %r", v)
            continue
        c = f"{speed}_{club}"
        groups.setdefault((b, c), {})[m] = val

    pivoted = [
        {"ball": b, "condition": c, **vals}
        for (b, c), vals in sorted(groups.items())
    ]

    return {
        "balls": sorted({r["ball"] for r in pivoted}),
        "conditions": sorted({r["condition"] for r in pivoted}),
        "metrics": sorted(metrics),
        "rows": pivoted,
    }
