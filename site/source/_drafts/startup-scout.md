---
layout: post
title: "Startup Scout, a Research Desk Built from Claude Code Subagents"
tab_title: Startup Scout
code: https://github.com/SadeekFarhan21/projects.farhansadeek.com/tree/main/startup-scout
date: 2026-10-13 18:28:12
tags:
  - multi-agent
  - llm-agents
  - fact-checking
  - startup-research
description: >-
  Startup Scout is a multi-agent startup research pipeline built only from Claude
  Code subagents, skills and a key-less search server, where a separate
  fact-checker still changed 20 of 146 claims in the writer's output.
---

Startup Scout takes a thesis like "seed-stage AI agents for accounting", finds startups that fit it, researches each one, writes an investment analysis and a profile, and then fact-checks the profile against its sources. I built it in October 2026 entirely from Claude Code's own parts. Each role is a subagent defined in a Markdown file, the pipeline is a skill, and search runs through a small MCP server I wrote over free public APIs, so there is no agent framework and no paid search key. The design rule I care about most is separation of duties. **The writer isn't allowed to search, and the fact-checker doesn't trust the writer.** Across three one-page company write-ups, the fact-checker checked 146 claims and corrected or softened 20 of them, about one in seven, even though the writer was working only from a cited dossier.

It's a solo project, a few days of work. The system itself is about 800 lines of Markdown (agent definitions, two skills, a search playbook and the project's rules) plus a 200-line Python search server.

## Why It Matters

Researching a startup properly is slow. You find the company, confirm it's the one you think it is, dig up the funding history, the founders, the customers and the competition, and then write it down without overstating any of it. A single LLM session can do a rough version, but two things go wrong. Its context fills up with search results long before it has looked at ten companies, and the same model that gathered the facts is the one writing them up, so nothing stands between a misread source and a confident sentence.

Startup Scout splits the job the way a research desk would. Scouts find candidates, researchers build cited dossiers, analysts argue the investment case, writers turn that into prose, and fact-checkers go back to the sources. An orchestrator plans, ranks and enforces quality, but never searches.

## Technical Details

### The Pipeline

The `/scout` skill runs seven phases, and the main Claude Code session acts as the orchestrator.

| Phase | Who | Output |
|---|---|---|
| Discover | 3 to 6 `scout` agents in parallel, one search angle each (funding, launches, accelerators, analysts, open source, hiring) | `runs/<id>/candidates/<angle>.json` |
| Shortlist | orchestrator | deduped, scored `shortlist.json` |
| Research | one `researcher` per company | `companies/<slug>/dossier.md` |
| Analyze | one `analyst` per company | `analysis.md` |
| Write | one `writer` per company | `profile.md` |
| Verify | one `fact-checker` per profile | `factcheck.md`, fixes in place |
| Report | orchestrator | `runs/<id>/report.md` |

Each agent is a Markdown file with frontmatter that sets its tools, model and reasoning effort. All of them run on Opus. Scouts use medium effort, most agents high, and the analyst `xhigh`, because breadth search needs speed and the investment argument needs depth.

### Agents Talk Through Files

The biggest design choice is that agents hand off through files on disk instead of through chat. A researcher writes a full dossier, sometimes 300 or more lines with numbered sources, and returns only a one-line JSON status to the orchestrator.

```json
{"slug": "<slug>", "path": "companies/<slug>/dossier.md", "source_count": <n>,
 "confidence": "medium", "headline": "<the single most surprising finding>"}
```

That keeps the orchestrator's context small even when it's coordinating 20 companies. It also turns the run into something you can inspect and resume. `runs/<id>/state.json` records the current phase, so re-running an interrupted command picks up where it stopped. And `companies/` persists across runs, so a dossier under 30 days old gets reused instead of being researched again.

### Separation of Duties

Each role has only the tools its job needs. The writer's tool list is `Read, Write, Edit, Glob`, with no search and no fetch. Its instructions say the dossier and analysis are its only sources. It can still misread or round them, but it can't go out and find a new "fact" that nobody cited.

The fact-checker has the opposite brief. It assumes the profile contains at least one error, pulls out every checkable claim (numbers, dates, names, investors, customers, and especially superlatives like "first" or "largest"), and checks each one at three levels. Does the profile match the dossier? Does the cited URL actually say this? Is it still true today? Every claim ends up `verified`, `corrected`, `softened`, `removed` or `unverifiable`, and the fixes are applied to the profile in place with minimal edits.

### A Search Server with No Keys

Every research agent can call a FastMCP server I wrote, `research_search.py`, which wraps official public APIs only. It searches SEC EDGAR full text for Form D filings, which are the closest thing to ground truth for a US private raise. It also covers Hacker News through Algolia, GitHub repos and search, Google News RSS and Wikipedia. Its `sweep` tool runs all of those at once in a thread pool and returns one sectioned digest, so an agent's first look at a company is one call instead of five.

```python
jobs = {
    "News": (news, (query,), {"days": days, "limit": 8}),
    "Hacker News": (hacker_news, (query,), {"days": max(days, 730), "limit": 5}),
    "GitHub": (github_search, (f'"{query}" in:name,description',), {"limit": 5}),
    "Wikipedia": (wikipedia, (query,), {"limit": 1}),
}
if company:
    q = query if query.startswith('"') else f'"{query}"'
    jobs["SEC Form D"] = (sec_filings, (q,), {"days": 1825, "limit": 5})
```

A shared search playbook tells every agent to sweep first, spread queries across identity, money, people, product and traction, and verify every funding claim against `sec_filings`.

## Implementation

### The Orchestrator Holds the Bar

The orchestrator's skill is mostly judgment written down. At shortlist time it dedupes candidates by domain and normalized name, scores each from 0 to 10 with fit to the thesis weighted most, adds two points when two or more scouts found the same company independently, and swaps in a company from an under-represented approach if the top picks all do the same thing.

After each wave of research it runs a quality gate. A dossier goes back to its researcher, once, with the gaps named, if any of these hold.

- It is marked `confidence: low`, or has fewer than 8 sources (15 at deep depth).
- Fewer than 30% of its sources are primary (company site, founder posts, filings).
- Funding or founders are missing entirely.
- It looks like a different company with the same name.

A company that fails twice is dropped and noted in the report. Phases also pipeline. As soon as one company's dossier passes, its analyst can start while other researchers are still running.

### Early Kills

Subagents can message the orchestrator mid-run, but only for three reasons. A **kill** means a pass-or-fail fact failed (wrong stage, already acquired, wrong company). A **question** means the agent is blocked on a decision. A **discovery** changes other agents' work, like a round announced yesterday. A kill arrives as one JSON line with an evidence URL, so the orchestrator can swap in the next company without waiting for a dossier it's going to throw away.

### Running Headless

`bin/scout` wraps the same skill in `claude -p`, so a run can go on a cron schedule. Permissions come from the project's settings file, which allows web search and fetch and restricts writes to `companies/` and `runs/`.

## Results

The fact-checker ran on three one-page write-ups of real startups. Here is how its verdicts broke down.

| Write-up | Claims checked | Verified | Corrected | Softened | Unverifiable |
|---|---|---|---|---|---|
| A | 50 | 46 | 1 | 2 | 1 |
| B | 56 | 45 | 4 | 5 | 2 |
| C | 40 | 32 | 4 | 4 | 0 |
| Total | 146 | 123 | 9 | 11 | 3 |

**Twenty of 146 claims needed a correction or a softer wording, and none had to be removed outright.** The errors were rarely invented facts. They were drift. A customer relationship was described more strongly than the source supported. An acquisition price that was only reported was stated as fact. A 2025 market forecast was written as if it had already happened, and the fix was to change "revenue exceeded" to "on track for". In one case a factory pilot was attributed to the wrong vendor, and the fact-checker noted that the same misreading was still sitting upstream in the analysis.

**The fact-checker also caught reasoning problems, not just wrong numbers.** It flagged an inference about where a funding gap came from, which had been written as fact, and labeled it as an inference. It also caught a demo that predated the product version the write-up implied had been tested.

That pattern is the argument for the design. Keeping the writer away from search did what it was meant to do, since none of the problems were made-up sources. But a careful writer working from a good dossier still drifted on about one claim in seven, and only an agent whose whole job was to distrust it caught that.

## What I Would Change

The fact-checker fixes the profile but not the files upstream of it, so a misreading it catches can survive in the analysis and the dossier. Next time I'd have its log feed back automatically, with corrections pushed to the dossier and the analyst re-run on the changed facts. I'd also make the fact-check logs machine-readable. Right now the counts in the table above live in a Markdown header line in each log, and pulling them into the report, or across runs, means parsing prose.
