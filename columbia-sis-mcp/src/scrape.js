#!/usr/bin/env node
// Deterministic Columbia Directory of Classes scraper.
//
// This is a plain, non-interactive Node script. It does NOT use the `playwright`
// library directly. Instead it connects to the *Playwright MCP server*
// (@playwright/mcp) as an MCP client over stdio and drives a real browser
// through that server's tools (browser_navigate, browser_evaluate, ...).
//
// Navigation is fully deterministic (no LLM in the loop): it browses
//   home  ->  sel/subj-<Letter>.html  ->  subj/<CODE>/_<TERM>.html
// then parses the course-listing table into structured JSON.
//
// Usage:
//   node src/scrape.js [SUBJECT] [TERM] [--out file.json] [--headed]
//   node src/scrape.js COMS Fall2026
//   node src/scrape.js MATH Spring2026 --out out/math.json

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { PAGE_PARSER } from './parser.js';

const BASE = 'https://doc.sis.columbia.edu';

function parseArgs(argv) {
  const positional = [];
  let out = null;
  let headed = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') out = argv[++i];
    else if (a === '--headed') headed = true;
    else positional.push(a);
  }
  const subject = (positional[0] || 'COMS').toUpperCase();
  const term = positional[1] || 'Fall2026';
  return { subject, term, out: out || `out/${subject}_${term}.json`, headed };
}

const log = (...a) => console.error('[scrape]', ...a);

// --- MCP plumbing -----------------------------------------------------------

// @playwright/mcp returns tool output as markdown text with the evaluate result
// embedded under a "### Result" heading. Pull the JSON back out of it.
function extractResult(callResult) {
  const text = (callResult?.content || [])
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n');
  if (callResult?.isError) throw new Error(`tool error:\n${text}`);
  const m = text.match(/### Result\s*([\s\S]*?)\n###\s/);
  let body = (m ? m[1] : text).trim();
  body = body.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(body);
  } catch {
    return body; // non-JSON result (e.g. undefined) — return raw text
  }
}

async function main() {
  const { subject, term, out, headed } = parseArgs(process.argv.slice(2));
  const letter = subject[0].toUpperCase();

  log(`connecting to Playwright MCP (pnpm dlx @playwright/mcp@latest${headed ? '' : ' --headless'})`);
  const transport = new StdioClientTransport({
    command: 'pnpm',
    // --isolated: ephemeral in-memory profile, so concurrent scrapes (and a
    // separate authenticated Vergil browser) don't fight over one profile lock.
    args: ['dlx', '@playwright/mcp@latest', '--isolated', ...(headed ? [] : ['--headless'])],
  });
  const client = new Client({ name: 'columbia-sis-scraper', version: '0.1.0' });
  await client.connect(transport);

  const call = (name, args = {}) =>
    client.callTool({ name, arguments: args }).then(extractResult);
  const navigate = (url) => call('browser_navigate', { url });
  const evaluate = (fn) => call('browser_evaluate', { function: fn.toString() });

  try {
    // Make sure a browser is available (no-op if already installed).
    try {
      await client.callTool({ name: 'browser_install', arguments: {} });
    } catch (e) {
      log('browser_install skipped:', e.message);
    }

    // 1. Land on the directory home page.
    log('browsing home page');
    await navigate(`${BASE}/`);

    // 2. Go to the subject index for this letter and locate the subject+term link.
    log(`browsing subject index for letter "${letter}"`);
    await navigate(`${BASE}/sel/subj-${letter}.html`);
    const listingUrl = await evaluate(
      `(() => {
        const want = "/subj/${subject}/_${term}.html";
        const a = Array.from(document.querySelectorAll('a'))
          .find(a => (a.getAttribute('href') || '').endsWith(want));
        return a ? new URL(a.getAttribute('href'), location.href).href : null;
      })`
    );
    const target = listingUrl || `${BASE}/subj/${subject}/_${term}.html`;
    if (!listingUrl) {
      log(`no link found for ${subject} ${term} on the index; using direct URL`);
    }

    // 3. Open the course listing and parse the table into structured data.
    log(`browsing course listing: ${target}`);
    await navigate(target);
    const parsed = await evaluate(PAGE_PARSER);

    if (parsed && parsed.error) {
      throw new Error(
        `Could not parse listing for ${subject} ${term}: ${parsed.error}. ` +
          `The subject/term combination may not exist.`
      );
    }

    const courses = (parsed && parsed.courses) || [];
    const sectionCount = courses.reduce((n, c) => n + c.sections.length, 0);

    const result = {
      source: target,
      subject,
      term,
      subjectTitle: parsed?.subjectTitle?.trim() || null,
      scrapedAt: new Date().toISOString(),
      courseCount: courses.length,
      sectionCount,
      courses,
    };

    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, JSON.stringify(result, null, 2));
    log(`wrote ${courses.length} courses / ${sectionCount} sections -> ${out}`);
    // Pure-JSON summary on stdout (file path + counts) for downstream piping.
    console.log(
      JSON.stringify(
        { out, subject, term, courseCount: courses.length, sectionCount },
        null,
        2
      )
    );
  } finally {
    try {
      await client.callTool({ name: 'browser_close', arguments: {} });
    } catch {}
    await client.close();
  }
}

main().catch((err) => {
  console.error('[scrape] FAILED:', err.message);
  process.exit(1);
});
