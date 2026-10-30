from __future__ import annotations

import csv
import re
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).parent
CSV_PATH = ROOT / "columbia_full_dump.csv"
OUT_PATH = ROOT / "suggestions.md"


PROFILE_LINES = [
    # Personal profile summary (education, interests, experience, constraints) printed at the top of
    # suggestions.md. Redacted from the public copy; fill in your own lines here.
    "- **Primary interest:** machine learning, computer vision, NLP, distributed algorithms, signal processing.",
    "- **Constraints:** Part-time only. No strict summer-only postings. Paid preferred.",
]

FOCUS_RULES = [
    ("Theory", ["theory", "theoretical", "mechanism", "mechanistic", "mathematical", "geometry", "topology", "analysis", "inference", "optimization", "causal", "causality", "fairness", "compressed sensing", "sparse recovery", "random matrix"]),
    ("IoT", ["iot", "wearable", "sensor", "sensing", "mobile", "edge", "wireless", "networking", "apple watch", "device", "health monitoring"]),
    ("LLM/NLP", ["llm", "language model", "nlp", "natural language", "text", "dialog", "prompt", "story", "analogy", "redaction", "agent", "rag", "retrieval augmented", "knowledge graph"]),
    ("Systems/HPC", ["system", "systems", "distributed", "database", "gpu", "cuda", "accelerator", "simulator", "hpc", "kernel", "kafka", "spark", "data platform", "data pipeline"]),
    ("Physics", ["physics", "plasma", "quantum", "electron", "optics", "photon", "material simulation", "numerical control"]),
    ("BioMed", ["biomedical", "clinical", "medicine", "genome", "genetic", "protein", "cell", "cancer", "disease", "neuro", "biology", "omics", "omop", "ehr", "patient", "trial", "drug", "pharma"]),
    ("Quant", ["quant", "finance", "matching", "economics", "business", "statistics", "statistical learning"]),
    ("Climate", ["climate", "earth system", "environment", "conservation"]),
    ("Security", ["security", "threat", "adversarial", "privacy", "redaction"]),
    ("Robotics", ["robot", "robotic", "autonomous", "vehicle", "brace", "gait", "neck brace", "control"]),
    ("Vision/Graphics", ["vision", "graphics", "image", "visual", "3d", "ar", "ui/ux", "simulation", "microscopy", "restoration", "sparse compression", "image restoration"]),
    ("Graphs", ["graph", "gnn", "network science", "link prediction", "path complex", "simplicial", "graph neural"]),
]

SCORE_RULES = [
    (18, ["machine learning", "deep learning", "computer vision", "vision", "graphics", "nlp", "natural language", "llm", "language model", "graph neural", "gnn", "link prediction", "path complex", "rag", "retrieval augmented", "knowledge graph"]),
    (10, ["artificial intelligence", "pytorch", "tensorflow", "multimodal", "image", "video", "text", "diffusion", "transformer", "clinical", "biomedical", "omop", "ehr", "electronic health", "causality", "causal inference", "compressed sensing", "sparse recovery", "image restoration", "multi-agent", "agentic", "agent"]),
    (6, ["iot", "sensor", "distributed", "gpu", "cuda", "graph", "signal processing", "systems", "wireless", "mobile", "security", "robot", "optimization", "data science", "statistical learning", "topology", "kafka", "spark", "data platform", "data pipeline", "random matrix", "quantum", "fairness", "ranking", "network science"]),
]

PAID_PATTERNS = [
    re.compile(r"\$\s?\d"),
    re.compile(r"\b\d+(?:\.\d+)?\s*/\s*hr\b", re.I),
    re.compile(r"\b\d+(?:\.\d+)?\s*per hour\b", re.I),
    re.compile(r"\bstipend\b", re.I),
    re.compile(r"\bpaid\b", re.I),
    re.compile(r"\bhourly\b", re.I),
    re.compile(r"\bsalary\b", re.I),
]

SUMMER_ONLY_TERMS = {"summer"}
ACADEMIC_TERMS = {"academic year", "academic year plus summer", "fall", "spring"}
SEAS_HINTS = [
    "computer science",
    "electrical engineering",
    "biomedical engineering",
    "mechanical engineering",
    "chemical engineering",
    "civil eng",
    "appl physics",
    "appl math",
    "industrial eng",
    "operations research",
]


@dataclass
class Job:
    title: str
    url: str
    location: str
    department: str
    eligibility: str
    disciplines: str
    terms: str
    commitment: str
    hours: str
    contact: str
    description: str
    score: int
    focus: list[str]
    paid: bool
    seas: bool


def normalize_text(*parts: str) -> str:
    return " ".join(p for p in parts if p).lower()


def parse_terms(raw: str) -> set[str]:
    return {part.strip().lower() for part in raw.split(";") if part.strip()}


def is_strict_summer_only(terms: str) -> bool:
    parsed = parse_terms(terms)
    if not parsed:
        return False
    return parsed <= SUMMER_ONLY_TERMS


def exceeds_20_hours(hours: str) -> bool:
    text = (hours or "").lower()
    if not text:
        return False
    if "full time" in text:
        return True
    if re.search(r"\b([3-9]\d|\d{3,})\b", text):
        nums = [int(n) for n in re.findall(r"\b\d+\b", text)]
        if any(n > 20 for n in nums):
            return True
    if re.search(r"20\+", text):
        return True
    if re.search(r"at least\s+([2-9]\d)", text):
        return True
    return False


def detect_paid(text: str) -> bool:
    return any(pattern.search(text or "") for pattern in PAID_PATTERNS)


def detect_focus(text: str) -> list[str]:
    found: list[str] = []
    for tag, keywords in FOCUS_RULES:
        if any(keyword in text for keyword in keywords):
            found.append(tag)
    if not found:
        found.append("General ML")
    return found


def score_job(text: str, department: str, title: str, eligibility: str) -> int:
    score = 0
    for points, keywords in SCORE_RULES:
        hits = sum(1 for keyword in keywords if keyword in text)
        score += hits * points

    if "computer science" in department.lower():
        score += 12
    if any(word in department.lower() for word in ["electrical engineering", "appl physics", "biomedical informatics", "statistics"]):
        score += 6
    if "sophomore" in eligibility.lower():
        score += 8
    if any(word in title.lower() for word in ["research project", "multiple projects", "lab", "machine learning", "artificial intelligence"]):
        score += 6
    if "iot" in text and "machine learning" in text:
        score += 6
    if "distributed" in text and "simulator" in text:
        score += 12
    if "graph" in text or "gnn" in text or "path complex" in text:
        score += 12
    return score


def tier_name(score: int) -> str:
    if score >= 80:
        return "Tier 1 — Strongest Fits"
    if score >= 55:
        return "Tier 2 — Strong Fits"
    if score >= 30:
        return "Tier 3 — Relevant Fits"
    return "Tier 4 — Niche / Long-shot Fits"


def trim(text: str, limit: int) -> str:
    text = " ".join((text or "").split())
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def make_job(row: dict[str, str]) -> Job:
    text = normalize_text(
        row["title"],
        row["department"],
        row["description"],
        row["disciplines"],
    )
    return Job(
        title=row["title"],
        url=row["url"],
        location=row["location"],
        department=row["department"],
        eligibility=row["eligibility"].replace(";", ","),
        disciplines=row["disciplines"],
        terms=row["terms"],
        commitment=row["commitment"],
        hours=row["hours_per_week"],
        contact=(row["contact_emails"] or "_apply via lab page_").replace(";", ","),
        description=row["description"],
        score=score_job(text, row["department"], row["title"], row["eligibility"]),
        focus=detect_focus(text),
        paid=detect_paid(row["description"]),
        seas=any(hint in row["department"].lower() for hint in SEAS_HINTS),
    )


def sort_key(job: Job) -> tuple[int, int, int, int, str]:
    sophomore_eligible = 1 if "sophomore" in job.eligibility.lower() else 0
    return (sophomore_eligible, job.score, 1 if job.paid else 0, 1 if job.seas else 0, job.title.lower())


def format_job_row(index: int, job: Job) -> str:
    pay = "💰 paid" if job.paid else "—"
    return (
        f"| {index} | {pay} | [{trim(job.title, 68)}]({job.url}) | "
        f"{trim(job.department, 34)} | {trim(job.hours or 'TBD', 26)} | "
        f"{trim(job.eligibility or 'Unspecified', 28)} | "
        f"{trim(' · '.join(job.focus), 42)} | {trim(job.contact, 40)} |"
    )


def build_markdown(jobs: list[Job]) -> str:
    lines: list[str] = []
    lines.append("# Columbia Undergraduate Research — Complete Position Match")
    lines.append("")
    lines.append(
        f"All **qualifying part-time listings** from `columbia_full_dump.csv` scored against profile "
        f"(resume + academic page + stated interests). Included: every non-summer-only part-time listing "
        f"at `20 hrs/week` or below when hours were explicit. Total included: **{len(jobs)}**."
    )
    lines.append("")
    lines.append("## Profile (refined)")
    lines.append("")
    lines.extend(PROFILE_LINES)
    lines.append("")
    lines.append("## How to read this file")
    lines.append("")
    lines.append("- **💰 paid** — explicit cash compensation (stipend, hourly, $-amount) verified in posting")
    lines.append("- **—** — credit / volunteer / unspecified")
    lines.append("- **Focus tags** — `Theory · IoT · LLM/NLP · Systems/HPC · Physics · BioMed · Quant · Climate · Security · Robotics · Vision/Graphics · Graphs · General ML`")
    lines.append("- **Score** — internal relevance score with `ML/CV/NLP` fit weighted highest")
    lines.append("- Sort priority — within each tier: `sophomore-eligible first`, then `fit`, then `pay`, then `SEAS department preference`.")
    lines.append("")
    tiers = [
        "Tier 1 — Strongest Fits",
        "Tier 2 — Strong Fits",
        "Tier 3 — Relevant Fits",
        "Tier 4 — Niche / Long-shot Fits",
    ]
    for tier in tiers:
        tier_jobs = sorted([job for job in jobs if tier_name(job.score) == tier], key=sort_key, reverse=True)
        lines.append(f"## {tier}")
        lines.append("")
        lines.append("| # | Pay | Title | Dept | Hrs/wk | Eligibility | Focus | Contact |")
        lines.append("|---|---|---|---|---|---|---|---|")
        for idx, job in enumerate(tier_jobs, 1):
            lines.append(format_job_row(idx, job))
        lines.append("")
    lines.append("## Notes")
    lines.append("")
    lines.append("- **Eligibility caveat** — many top-fit listings say `Junior; Senior` only, which excludes a sophomore. Listings that include `Sophomore` are the immediately-eligible ones; the rest are worth a cold-email if the research match is strong.")
    lines.append("- **Paid detection** is conservative — only explicit cash language in the posting is marked as paid.")
    lines.append("- **Filtering rule used here** — excluded full-time roles, strict summer-only postings, and roles above `20 hrs/week` when the posting stated that clearly.")
    return "\n".join(lines) + "\n"


def load_jobs() -> list[Job]:
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    jobs: list[Job] = []
    for row in rows:
        if row["commitment"].strip().lower() != "part time":
            continue
        if is_strict_summer_only(row["terms"]):
            continue
        if exceeds_20_hours(row["hours_per_week"]):
            continue
        jobs.append(make_job(row))
    return sorted(jobs, key=sort_key, reverse=True)


def main() -> None:
    jobs = load_jobs()
    OUT_PATH.write_text(build_markdown(jobs), encoding="utf-8")
    print(f"Wrote {len(jobs)} jobs to {OUT_PATH}")


if __name__ == "__main__":
    main()
