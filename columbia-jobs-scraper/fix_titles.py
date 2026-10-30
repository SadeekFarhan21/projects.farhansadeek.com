#!/usr/bin/env python3
"""Recover real job titles from raw_data in the dump.

The scraper's title heuristic sometimes grabs sidebar headings ("Similar
Opportunities", "Sign up for alerts!"). The body text always starts with
the Columbia banner followed by the real title, e.g.:

    COLUMBIA UNIVERSITY IN THE CITY OF NEW YORK Undergraduate Research
    Opportunities ABOUT COLUMBIA RESEARCH MY PROFILE SEARCH OPPORTUNITIES
    POST OPPORTUNITIES <REAL TITLE> <City>, New York, United States ...

This script rewrites the `title` field in-place when the current value
matches a known bad heading or when a confident extraction is possible.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

BAD_TITLES = {
    "similar opportunities",
    "sign up for alerts!",
    "sign up for alerts",
}

TITLE_RE = re.compile(
    r"POST OPPORTUNITIES\s+(.+?)\s+(?:Morningside|Manhattanville|Medical Center|"
    r"Lamont|Nevis|Other Columbia Location|New York|Online|Remote),",
    re.IGNORECASE,
)


def recover_title(raw: str) -> str | None:
    if not raw:
        return None
    match = TITLE_RE.search(raw)
    if match:
        return match.group(1).strip()
    return None


def main(path: Path) -> int:
    data = json.loads(path.read_text(encoding="utf-8"))
    jobs = data.get("jobs", [])
    fixed = 0
    for job in jobs:
        current = (job.get("title") or "").strip()
        recovered = recover_title(job.get("raw_data", ""))
        if recovered and (current.lower() in BAD_TITLES or not current):
            job["title"] = recovered
            fixed += 1
    data["job_count"] = len(jobs)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"Fixed {fixed}/{len(jobs)} titles in {path}")
    return 0


if __name__ == "__main__":
    default = Path(__file__).parent / "columbia_full_dump.json"
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else default
    raise SystemExit(main(target))
