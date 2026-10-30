# Startup Scout

A multi-agent research desk that runs inside Claude Code. The main session is the
**orchestrator**. It never does deep research itself. It delegates to subagents
in `.claude/agents/` and coordinates them through files on disk.

## Entry points

- `/scout <thesis | list of companies> [--count N] [--depth quick|standard|deep]`: the full pipeline
- `/profile <company name or URL>`: research and write up one company
- `bin/scout "<thesis>"`: headless run, for cron or CI

## Pipeline

```
           ┌────────────── orchestrator (main session) ──────────────┐
 thesis ─► │ 1 DISCOVER   scout ×3-4 in parallel, one angle each     │
           │ 2 SHORTLIST  orchestrator dedupes, scores, picks top N  │
           │ 3 RESEARCH   researcher ×N in parallel → dossier.md     │
           │   ↳ quality gate: weak dossiers sent back once          │
           │ 4 ANALYZE    analyst ×N in parallel → analysis.md       │
           │ 5 WRITE      writer ×N in parallel → profile.md         │
           │ 6 VERIFY     fact-checker ×N in parallel → fixes/flags  │
           │ 7 REPORT     orchestrator synthesizes report.md         │
           └─────────────────────────────────────────────────────────┘
```

## Directory contract

```
companies/<company-slug>/       # persistent knowledge base that builds up across runs
  dossier.md                    # raw cited facts (researcher owns it)
  analysis.md                   # investment analysis: why now, moat, risks, verdict (analyst owns it)
  profile.md                    # narrative write-up (writer owns it, fact-checker edits it)
  factcheck.md                  # claim-by-claim verification log (fact-checker owns it)
lenses/<fund>.md                # optional fund-specific bar, stages, spaces, and output formats (agents apply it when passed a lens)
runs/<run-id>/                  # one folder per /scout invocation
  brief.md                      # the thesis, parameters, and run plan
  candidates/<angle>.json       # raw scout output, one file per angle
  shortlist.json                # ranked, deduped picks
  state.json                    # phase progress, so a run can resume
  report.md                     # final digest
```

- **company-slug**: lowercase, hyphenated, ASCII only (for example `mistral-ai`, `11x`).
- **run-id**: `YYYY-MM-DD-<short-thesis-slug>` (for example `2026-10-08-ai-devtools-seed`).

## Searching

All research agents follow `.claude/search-playbook.md`. It covers tool routing, spreading queries across angles, breadth gates and verification.
The free search server also works as a command-line tool: `uv run --script tools/research_search.py sweep "<query>"`.

## Rules for every agent

1. **Cite everything.** Each factual claim in a dossier gets an inline `[n]` that
   points to a numbered source URL. Unsourced numbers get a label: "(unverified)" or "(estimate)".
2. **Prefer primary sources.** Use, in this order: company site or blog, founder posts, SEC or
   Companies House filings, press releases, then reputable press (TechCrunch, The
   Information, Bloomberg, Reuters). Treat Crunchbase, PitchBook, and LinkedIn snippets as
   secondary sources.
3. **Date your facts.** Funding, headcount, and pricing go stale. Record "as of" dates.
4. **Return small, write big.** Subagents write full output to disk and return only
   a short JSON status to the orchestrator. That keeps the orchestrator's context small.
5. **Never overwrite blindly.** If `companies/<slug>/dossier.md` already exists, update it
   in place, keep valid prior facts, and bump `last_researched`.
6. Today's date comes from the system. Use it for recency judgments ("raised 3 weeks ago").

## Talking to the orchestrator mid-run

Subagents can message the orchestrator while still working: `SendMessage` with `to: "main"` (no
frontmatter needed). It arrives between the orchestrator's tool calls. Use it **only** for:
- **Early kills**: a pass/fail fact fails (wrong stage, the fund is already an investor, the company is dead or acquired,
  the name belongs to a different company). Message right away so the orchestrator can swap the company out without waiting.
- **Blocking ambiguity**: you can't proceed without a decision (for example, two equally plausible companies share the name).
- **Major discoveries** that should change other agents' work (for example, the company just raised a Series B yesterday,
  or two candidates merged).

Format: `{"from": "<agent>/<slug>", "type": "kill|question|discovery", "msg": "<one or two sentences>", "evidence": "<url>"}`.
Then keep working unless the fact is fatal. Everything else goes to files. Don't send chatty progress updates.

The orchestrator cannot message a *running* subagent. It can resume a *finished* one with
`SendMessage` (its context is kept). Use that for retries and follow-ups instead of starting a new agent.
