"""Convert columbia_full_dump.json into a structured CSV.

Each job's `raw_data` is a free-text scrape of a Columbia research opportunity
page. It follows a consistent layout:

    COLUMBIA UNIVERSITY IN THE CITY OF NEW YORK
    Undergraduate Research Opportunities
    ABOUT
    COLUMBIA RESEARCH
    MY PROFILE
    SEARCH OPPORTUNITIES
    POST OPPORTUNITIES
    <Job Title>
     <Location>
     <Department>
     Eligibility: ...
     ...
     [Show More]
     Full Time | Part Time
     ADD TO FAVORITES
     VIEW FAVORITES
    <Body>
    It is the responsibility of the host supervisor ...   <-- end of body
    <footer / similar opportunities>

This script parses each blob into columns and writes the result alongside the JSON.
"""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path

SRC = Path("/Users/farhan/Documents/GitHub/automater/claude_automate/columbia_full_dump.json")
DST = SRC.with_suffix(".csv")

HEADER_MARKER = "POST OPPORTUNITIES"
BODY_START_MARKER = "VIEW FAVORITES"
BODY_END_MARKER = "It is the responsibility of the host supervisor"
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")

# Capture either:
#   1. A "Hours per week:" labeled section (take the next non-empty line), or
#   2. Free-text mentions like "10 hours per week", "5-10 hrs/week", "20 hours/week during summer".
HOURS_LABEL_RE = re.compile(
    r"Hours\s*(?:per\s*week|/\s*week)\s*:\s*\n+\s*([^\n]+)",
    re.IGNORECASE,
)
HOURS_INLINE_RE = re.compile(
    r"([^.\n]*?\b\d+(?:\s*[-–to]+\s*\d+)?\s*(?:hours?|hrs?)\s*(?:per\s*week|/\s*week|a\s*week|weekly)[^.\n]*)",
    re.IGNORECASE,
)

COMMITMENT_VALUES = {"Full Time", "Part Time", "Full-Time", "Part-Time"}


def split_lines(raw: str) -> list[str]:
    return [ln.strip() for ln in raw.splitlines()]


def parse_header(lines: list[str]) -> dict:
    """Extract title, location, department, eligibility, commitment from the
    section between POST OPPORTUNITIES and VIEW FAVORITES."""
    try:
        start = lines.index(HEADER_MARKER) + 1
    except ValueError:
        return {}
    try:
        end = lines.index(BODY_START_MARKER, start)
    except ValueError:
        end = len(lines)

    header = [ln for ln in lines[start:end] if ln and ln not in {"Show More", "ADD TO FAVORITES"}]
    if not header:
        return {}

    out: dict = {"title": header[0]}
    eligibility: list[str] = []
    disciplines: list[str] = []
    terms: list[str] = []
    commitment = ""
    location = ""
    department = ""

    # Lines 1..N before the commitment line carry location/department/eligibility/etc.
    for line in header[1:]:
        if line in COMMITMENT_VALUES:
            commitment = line
            continue
        if line.startswith("Eligibility:"):
            eligibility.append(line.split(":", 1)[1].strip())
        elif line.startswith("Discipline:"):
            disciplines.append(line.split(":", 1)[1].strip())
        elif line.startswith("Term:"):
            terms.append(line.split(":", 1)[1].strip())
        elif not location:
            location = line
        elif not department:
            department = line
        # anything else is ignored as noise

    out["location"] = location
    out["department"] = department
    out["eligibility"] = "; ".join(eligibility)
    out["disciplines"] = "; ".join(disciplines)
    out["terms"] = "; ".join(terms)
    out["commitment"] = commitment
    return out


def parse_body(raw: str) -> str:
    """Everything between VIEW FAVORITES and the supervisor-responsibility footer."""
    start_idx = raw.find(BODY_START_MARKER)
    if start_idx == -1:
        return ""
    body_start = start_idx + len(BODY_START_MARKER)
    end_idx = raw.find(BODY_END_MARKER, body_start)
    body = raw[body_start:end_idx] if end_idx != -1 else raw[body_start:]
    # collapse leading/trailing whitespace and runs of blank lines
    body = re.sub(r"\n{3,}", "\n\n", body).strip()
    return body


def extract_emails(text: str) -> str:
    emails = sorted({m.group(0) for m in EMAIL_RE.finditer(text)})
    return "; ".join(emails)


def extract_hours_per_week(text: str) -> str:
    """Pull out hours/week info. Prefer the labeled "Hours per week:" section,
    fall back to inline mentions like "10 hours per week"."""
    snippets: list[str] = []
    seen: set[str] = set()

    def add(s: str) -> None:
        s = " ".join(s.split()).strip(" .,;")
        key = s.lower()
        if s and key not in seen:
            seen.add(key)
            snippets.append(s)

    for m in HOURS_LABEL_RE.finditer(text):
        add(m.group(1))
    for m in HOURS_INLINE_RE.finditer(text):
        add(m.group(1))

    return " | ".join(snippets)


def parse_job(job: dict) -> dict:
    raw = job.get("raw_data", "") or ""
    lines = split_lines(raw)
    header = parse_header(lines)
    body = parse_body(raw)
    return {
        "url": job.get("url", ""),
        "title": header.get("title", ""),
        "location": header.get("location", ""),
        "department": header.get("department", ""),
        "eligibility": header.get("eligibility", ""),
        "disciplines": header.get("disciplines", ""),
        "terms": header.get("terms", ""),
        "commitment": header.get("commitment", ""),
        "hours_per_week": extract_hours_per_week(body),
        "contact_emails": extract_emails(body),
        "description": body,
        "search_page": job.get("search_page", ""),
        "index_on_page": job.get("index_on_page", ""),
    }


def main() -> None:
    data = json.loads(SRC.read_text())
    rows = [parse_job(j) for j in data.get("jobs", [])]

    fieldnames = [
        "url",
        "title",
        "location",
        "department",
        "eligibility",
        "disciplines",
        "terms",
        "commitment",
        "hours_per_week",
        "contact_emails",
        "description",
        "search_page",
        "index_on_page",
    ]

    with DST.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to {DST}")


if __name__ == "__main__":
    main()
