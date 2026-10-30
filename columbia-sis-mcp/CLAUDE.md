# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Two apps in one repo, both ES modules, both managed with **pnpm** (`pnpm@10.14.0`):

- **Root (`/`)** — `columbia-sis-mcp`: a Playwright-backed MCP server plus the scraping/compilation scripts that build the course catalog. Entry: `src/server.js`.
- **`site/`** — an Astro static site (`columbia-grad-courses`) that consumes the compiled data and deploys to https://columbia-grad-courses.vercel.app.

The root and `site/` have independent `package.json` + `pnpm-lock.yaml`. Run `pnpm install` in each separately.

## Data pipeline

Data flows scrape → compile → filter → site. To regenerate everything (or use `/refresh-data`):

```
pnpm run scrape:all      # src/all.js — scrape every subject → out/<SUBJECT>_<TERM>.json (resume-safe; pass --force to re-scrape)
node src/compile.js      # merge per-subject files → out/<TERM>_catalog.json, tagged by research interests
node src/graduate.js     # filter to 4000+ level actual courses → graduate.json
node src/site-data.js    # flatten catalog → site/src/data/courses.json + site/public/courses.csv
```

Then build the site from `site/`: `pnpm run dev` (localhost:3000), `pnpm run build`, `pnpm run preview`.

## Deploy

Pushing to `main` auto-deploys to Vercel (production). Regenerated data files (`site/src/data/courses.json`, `site/public/courses.csv`) are committed and ship on push.

## Gotchas

- **Playwright runs via MCP, not directly.** Scrapers spawn `pnpm dlx @playwright/mcp@latest` as a subprocess — no manual Playwright install needed. Set `HEADLESS=false` to watch the browser; other env vars: `COLUMBIA_SIS_BASE_URL`, `COLUMBIA_SIS_TIMEOUT_MS` (all have defaults, no `.env` required).
- **Three different `courses.json` files** — don't confuse them: `/courses.json` (all levels/subjects, master), `/graduate.json` (4000+ actual courses only), `site/src/data/courses.json` (flattened to one row per section, what the site renders).
- **SIS vs Vergil.** Public SIS (`src/sis.js`) has course/section/instructor/enrollment but NOT meeting times/locations. Those come from Vergil, behind UNI login — captured interactively via `pnpm run vergil` (session persists in `.vergil-profile/`, gitignored).
- **`out/` is gitignored** — intermediate scrape and catalog files are not committed.
- No CI, no tests, no linter currently. Code is plain hand-formatted Node.js.
