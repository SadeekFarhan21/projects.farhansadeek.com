---
layout: post
title: "Turning Columbia's Course Directory into an MCP Server and a Searchable Catalog"
tab_title: Columbia SIS MCP
code: https://github.com/SadeekFarhan21/projects.farhansadeek.com/tree/main/columbia-sis-mcp
date: 2026-06-18 23:45:51
tags:
  - mcp
  - web-scraping
  - playwright
  - course-catalog
description: >-
  An MCP server and a scraper for Columbia's public Directory of Classes that
  drives a browser through the Playwright MCP server with no LLM in the loop,
  turning 307 subject pages into 6,954 Fall 2026 sections and a searchable site.
---

Columbia publishes every class it offers in the Directory of Classes, a set of plain HTML pages with one page per subject and term. It's complete, but you can't search across it, sort by open seats, or ask it a question. Over three days in June 2026 I built two things on top of it. One is an MCP server that lets Claude browse and parse the directory, and the other is a scraper that pulls the whole Fall 2026 term into one dataset for a small static site. **The scraper's trick is that it drives the browser through the same Playwright MCP server an AI agent would use, but with fixed navigation and no model in the loop.** One run covered 307 subjects and produced 3,719 courses with 6,954 sections, without a single subject failing.

It's a solo project of about 1,800 lines of Node.js plus one Astro page, written for my own course planning before my first semester at Columbia.

## Why It Matters

Picking classes at Columbia means jumping between subject pages. If you want every 4000-level course that touches machine learning, or every section of anything with seats left, there's no page for that. The data is all public, though, and it's regular. Every subject page has the same `table.course-listing`, with a header row per course and a row per section, and every section carries its call number, points, instructor and an enrollment string like "101 students (200 max) as of June 18, 2026".

I wanted two ways in. For quick questions ("who teaches COMS 4705 this fall?", "find graduate courses on signal processing") I wanted Claude to look it up live, which is what an MCP server is for. For browsing, I wanted the whole term flattened into one table I could filter in a browser.

## Technical Details

### The Directory's Shape

The directory is three levels deep. An index page per letter (`sel/subj-C.html`) lists every subject starting with that letter, with links to each term it's offered in. A listing page per subject and term (`subj/COMS/_Fall2026.html`) holds the course table. A detail page per section has the full notes. Both the MCP server and the scraper follow this path. The scraper starts from the letter index, finds the link that ends in `/subj/<CODE>/_<TERM>.html`, and falls back to building that URL directly if the link isn't there.

### Two Ways to Drive a Browser

The MCP server uses the Playwright library directly. It launches one Chromium instance and exposes nine tools to the client: listing and searching subjects or departments by letter or name, parsing a subject's or department's course listing (with an optional text filter across titles, instructors, notes and call numbers), parsing a single section page, and fetching SIS's plain-text version of a listing.

The bulk scraper does something less obvious. It doesn't import Playwright at all. It starts Microsoft's Playwright MCP server (`@playwright/mcp`) as a subprocess and connects to it as an MCP client over stdio, then calls that server's tools (`browser_navigate`, `browser_evaluate`) from a plain Node loop. That server was built to let a language model use a browser, but nothing about the protocol requires a model. A script can call the same tools in a fixed order.

```js
const transport = new StdioClientTransport({
  command: 'pnpm',
  args: ['dlx', '@playwright/mcp@latest', '--isolated', '--headless'],
});
const client = new Client({ name: 'columbia-sis-all', version: '0.1.0' });
await client.connect(transport);

const call = (name, args = {}) =>
  client.callTool({ name, arguments: args }).then(extractResult);
const navigate = (url) => call('browser_navigate', { url });
const evaluate = (fn) => call('browser_evaluate', { function: fn });
```

That choice had two practical payoffs. The browser comes in through `pnpm dlx` on demand, so there's no separate browser install step. And the scraper exercises exactly the tool surface an agent sees, so when a navigation fails in the script, it would fail the same way for Claude.

### Parsing Inside the Page

The parser is a function that runs inside the browser through `browser_evaluate`, so it can only use DOM globals. It walks the course table row by row. A row with a `<th>` starts a new course. The header's HTML is split at its `<br>`, so the first half gives the course number and the second gives the title. A row with a link is a section, and its details come from a definition list of `<dt>` and `<dd>` pairs.

```js
const dl = details.querySelector('dl');
if (dl) {
  let key = null;
  for (const el of Array.from(dl.children)) {
    if (el.tagName === 'DT') key = el.textContent.replace(/:\s*$/, '').trim();
    else if (el.tagName === 'DD' && key) sec.fields[key] = el.textContent.trim();
  }
}
```

Reading every field into a generic map, then picking out "Call Number", "Points", "Enrollment" and "Instructor", means a new field on the page is kept rather than dropped. The function is stored as a string in one module and shared by the single-subject scraper and the all-subjects scraper, so both parse identically.

## Implementation

### Scraping Every Subject

The all-subjects run reads the letter indexes, keeps the subjects that offer the target term, and visits each one in order through the same MCP session. Two things made it practical to run in full.

It's **resume-safe**. Each subject writes its own `out/<CODE>_<TERM>.json`, and a subject whose file already exists is skipped unless `--force` is passed. An interrupted run picks up where it stopped.

It **retries per subject**. SIS occasionally stalls on a navigation, so each subject gets up to three attempts before it's recorded as failed. With retries in place, none of the 307 subjects failed.

### From Raw Pages to a Catalog

A small pipeline turns the per-subject files into data I could use.

1. A compile step merges the files into one catalog and tags courses against a list of research interests by keyword (machine learning, distributed algorithms, signal processing, random matrix theory, higher-dimensional geometry).
2. A level filter keeps actual courses at a minimum level. It drops research, independent study, fieldwork, thesis, practicum and seminar listings by title, while keeping "operations research", which is a field and not an activity. At the 4000 level across my 16 target subjects, that left 209 courses and 315 sections.
3. A site-data step flattens the full catalog to one row per section, parses the enrollment string into enrolled, capacity and seats left, and writes a JSON file for the site and a CSV for download.

Cross-listed courses appear under several subjects with different codes, and SIS doesn't link them. The site-data step finds them by normalizing titles (lowercase, punctuation stripped) and grouping codes that share one, so a row for one listing shows its twins.

```js
for (const c of cat.courses) {
  const code = courseCode(c);
  const key = norm(c.title);
  (titleCodes.get(key) || titleCodes.set(key, new Set()).get(key)).add(code);
}
```

### The Site

The site is a single Astro page that renders all rows statically and filters them in the browser. You can search by title, course or instructor (with `/` to focus the box), filter to sections with seats, sort any column, and switch to a separate tab for seminars, research and topics courses. Seat counts are colored as open, low (five or fewer) or full.

## Results

The final dataset has **6,787 sections of 3,566 distinct courses across 278 subjects** for Fall 2026. That's the 6,954 scraped sections minus the 167 sections of 129 offerings that have no numeric course number (such as medical-school clinical rotations), which don't fit the course-code format the site uses. 1,158 rows are cross-listed with at least one other code.

Of the 6,344 sections that showed an enrollment count, **941 were already at or over capacity on June 18 to 20**, more than two months before the semester started. That was the number that justified the "seats available" checkbox.

## What I Would Change

The public directory has no meeting days, times or rooms. Those live in Vergil, Columbia's logged-in planner, which is why the site can tell you a section is open but not whether it clashes with another one. I wrote an interactive helper that clicks through from a section to Vergil in one visible browser, waits for me to log in once, and captures each class's schedule. The next step is to fold that schedule data into the site so it can check a set of sections for conflicts. I'd also expose the compiled catalog to the MCP server, so Claude could answer "what's open on Tuesday mornings" from the local dataset instead of loading subject pages one at a time.
