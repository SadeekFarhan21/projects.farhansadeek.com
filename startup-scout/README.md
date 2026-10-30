# startup-scout

A multi-agent system that finds, researches, and writes about startups. It is built
entirely from Claude Code primitives (subagents, skills, and headless mode), so there is no
extra framework or API key to manage.

## Use it

```bash
cd startup-scout
claude
```

Then, inside Claude Code:

```
/scout seed and Series A startups building AI agents for accounting --count 8
/scout vertical AI for construction --depth deep --angles funding,hiring,analysts
/scout Ramp, Brex, Mercury --depth quick          # named mode: compare specific companies
/profile Cognition                                 # one company, end to end
```

To run it headless or on a schedule:

```bash
bin/scout "open-source AI infra that raised in the last 30 days" --count 6
bin/scout --profile "Modal"
```

## How it works

| Agent | Role | Writes |
|---|---|---|
| **orchestrator** (main session, `/scout` skill) | plans, fans out, dedupes and ranks, tracks state, writes the digest | `runs/<id>/*` |
| `scout` ×3–6 | breadth search from one angle (funding, launches, accelerators, OSS, hiring, analysts) | `runs/<id>/candidates/<angle>.json` |
| `researcher` ×N | deep, cited dossier on one company | `companies/<slug>/dossier.md` |
| `analyst` ×N | investment memo: why now, moat, competitive dynamics, risks, bull/bear, verdict | `companies/<slug>/analysis.md` |
| `writer` ×N | narrative profile built only from the dossier and the analysis | `companies/<slug>/profile.md` |
| `fact-checker` ×N | adversarially checks the profile against its sources and fixes it | `companies/<slug>/factcheck.md` |

Design choices:
- **Agents hand off through files, not chat.** Subagents return only a one-line JSON status, so
  the orchestrator's context stays small even with 20 companies.
- **Every agent runs on Opus at high effort, with real methodology.** The researcher digs into job posts,
  SEC Form D filings, docs, and the Wayback Machine, grades its sources, and triangulates key numbers. The analyst
  works through why-now, moat, and comparables and commits to a verdict. The writer self-edits for insight
  over summary. The orchestrator sends weak dossiers back for another pass.
- **Separation of duties.** The writer can't search, so it can't hallucinate new
  "facts". The fact-checker re-fetches the cited URLs and doesn't take the writer's word for anything.
- **The knowledge base compounds.** `companies/` persists across runs. Dossiers less than 30 days old are
  reused, and older ones are updated incrementally.
- **Resumable.** `runs/<id>/state.json` tracks the current phase, so you can rerun the same
  command to pick up where an interrupted run stopped.

## Customize

- Every agent sets `model:` and `effort:` in its frontmatter (default: `opus`, with effort `medium` for scouts,
  `high` for most agents, and `xhigh` for the analyst). To cut cost, switch the scouts to `sonnet`. For maximum depth, set the analyst to `effort: max`.
- Change the writing voice in `.claude/agents/writer.md`.
- Add a new agent (for example `competitor-mapper` or `founder-deep-dive`) by dropping a new `.md` file into
  `.claude/agents/` and calling it from `.claude/skills/scout/SKILL.md`.
