# Columbia SIS MCP

Playwright-backed MCP server for parsing Columbia's Directory of Classes at `https://doc.sis.columbia.edu/`.

The server exposes tools for:

- listing subjects or departments by letter
- searching subject or department indexes
- parsing subject and department course listings into structured courses and sections
- parsing individual section detail pages
- returning the plain-text listing page when SIS provides one

## Install

```bash
pnpm install
pnpm exec playwright install chromium
```

## Run

```bash
pnpm start
```

Most MCP clients run servers over stdio. Example client config:

```json
{
  "mcpServers": {
    "columbia-sis": {
      "command": "node",
      "args": ["/Users/farhan/Documents/GitHub/columbia-courses/src/server.js"]
    }
  }
}
```

## Scraper app (uses the Playwright MCP)

`src/scrape.js` is a standalone, non-interactive Node app that connects to the
**Playwright MCP server** (`@playwright/mcp`) as an MCP client over stdio and
drives a real browser to deterministically browse SIS:

```
home  ->  sel/subj-<Letter>.html  ->  subj/<CODE>/_<TERM>.html
```

It then parses the `course-listing` table into structured JSON. There is no LLM
in the loop and no API key — navigation is hard-coded.

```bash
node src/scrape.js COMS Fall2026
node src/scrape.js MATH Spring2026 --out out/math.json
node src/scrape.js COMS Fall2026 --headed   # watch the browser
```

`pnpm scrape COMS Fall2026` works too. The Playwright MCP is launched on
demand via `pnpm dlx @playwright/mcp@latest`, so no extra install is required.

Output (`out/<SUBJECT>_<TERM>.json`):

```json
{
  "source": "https://doc.sis.columbia.edu/subj/COMS/_Fall2026.html",
  "subject": "COMS",
  "term": "Fall2026",
  "subjectTitle": "Fall 2026 Subject: Computer Science",
  "courseCount": 51,
  "sectionCount": 115,
  "courses": [
    {
      "courseNumber": "W1002",
      "title": "COMPUTING IN CONTEXT",
      "sections": [
        {
          "section": "Section 001",
          "callNumber": "13508",
          "points": "4",
          "enrollment": "101 students (200 max) as of June 18, 2026",
          "instructor": "Adam H Cannon",
          "sectionUrl": "https://doc.sis.columbia.edu/subj/COMS/W1002-20263-001/",
          "vergilUrl": "https://vergil.columbia.edu/vergil/class/20263/13508"
        }
      ]
    }
  ]
}
```

## Vergil capture (manual login)

SIS no longer shows meeting days/times/locations — those live in **Vergil**,
behind a UNI login. `src/vergil.js` runs an **interactive session**: ONE visible
Chromium window is launched once and reused for every class — it never spins up
another browser instance.

- **The script clicks through** — opens the SIS section page and follows the
  "View Class Schedule & Location in Vergil" link (in the same tab).
- **You authenticate once** — UNI + Duo, on the first class only.
- **Every class after that reuses the same logged-in window.**

```bash
node src/vergil.js                 # prompts for the first call number
node src/vergil.js --call 13508    # start on that section
node src/vergil.js https://doc.sis.columbia.edu/subj/COMS/W1002-20263-001/
node src/vergil.js --call 13508 --print-url   # resolve only, no browser
```

Flow:

1. The script clicks through to Vergil for the first class and waits.
2. You log in (UNI + Duo), then press **ENTER**. It captures the schedule/
   location (text + screenshot) to `out/vergil/<callNumber>.{json,png}`.
3. It then asks for the next call number / URL. Each one opens in the **same
   already-authenticated window** and is captured. Blank line to finish.

Your session is also stored in `.vergil-profile/` (gitignored), so a brand-new
run on a later day still reuses the saved login. Run this in your own terminal —
it pauses for you to log in.

## MCP server tools

- `list_subjects({ "letter": "C" })`
- `list_departments({ "letter": "C" })`
- `search_subjects({ "query": "computer science" })`
- `search_departments({ "query": "computer science" })`
- `get_subject_courses({ "code": "COMS", "term": "Fall2026", "limit": 10 })`
- `get_department_courses({ "code": "COMS", "term": "Fall2026", "query": "machine learning" })`
- `get_listing_by_url({ "url": "https://doc.sis.columbia.edu/subj/COMS/_Fall2026.html" })`
- `get_section_details({ "url": "https://doc.sis.columbia.edu/subj/COMS/W3134-20263-001/" })`
- `get_plain_text_listing({ "kind": "subject", "code": "COMS", "term": "Fall2026" })`

## Smoke Tests

```bash
pnpm sample:subjects
pnpm sample:courses
pnpm sample:section
```

The Directory of Classes warns that Vergil is the source for the most detailed current class schedule and location data. This MCP parses what SIS publishes and preserves Vergil links when available.
