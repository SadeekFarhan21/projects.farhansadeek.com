#!/usr/bin/env node
// Scrape EVERY subject that offers classes in a given term, not just the target
// subjects. Like src/scrape.js, but it reuses ONE Playwright-MCP browser session
// for all subjects (far faster than launching a browser per subject) and is
// resume-safe: subjects already written to out/<CODE>_<TERM>.json are skipped
// unless --force is passed.
//
// It reads the subject index (out/subject-index-A-Z.json, produced by the SIS
// crawl) to get the direct listing URL for every subject that has the term, so
// no per-letter index navigation is needed.
//
// Only the public SIS listing is parsed — section, call number, points,
// instructor, enrollment, and the Vergil *link*. Meeting days/times/locations
// live behind the Vergil login and are NOT fetched here (see src/vergil.js).
//
// Usage:
//   node src/all.js                         # Fall2026, all subjects -> out/<CODE>_Fall2026.json
//   node src/all.js Spring2026              # a different term
//   node src/all.js Fall2026 --force        # re-scrape even if a file exists
//   node src/all.js Fall2026 --headed       # watch the browser
//   node src/all.js Fall2026 --limit 5      # only the first 5 (smoke test)

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { PAGE_PARSER } from './parser.js';

const INDEX_FILE = 'out/subject-index-A-Z.json';

function parseArgs(argv) {
  const positional = [];
  let force = false;
  let headed = false;
  let limit = Infinity;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') force = true;
    else if (a === '--headed') headed = true;
    else if (a === '--limit') limit = parseInt(argv[++i], 10);
    else positional.push(a);
  }
  return { term: positional[0] || 'Fall2026', force, headed, limit };
}

const log = (...a) => console.error('[all]', ...a);

// @playwright/mcp returns tool output as markdown with the evaluate result under
// a "### Result" heading. Pull the JSON back out (same shape as src/scrape.js).
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
    return body;
  }
}

const exists = (p) => access(p).then(() => true).catch(() => false);

// Pull every (code, listing URL) pair for the term out of the subject index.
async function subjectsForTerm(term) {
  const idx = JSON.parse(await readFile(INDEX_FILE, 'utf8'));
  const byCode = new Map();
  for (const letter of idx.letters || []) {
    for (const entry of letter.entries || []) {
      for (const t of entry.terms || []) {
        if (t.term !== term) continue;
        const m = t.href.match(/\/subj\/([^/]+)\/_/);
        if (m && !byCode.has(m[1])) byCode.set(m[1], { code: m[1], name: entry.name, url: t.href });
      }
    }
  }
  return Array.from(byCode.values()).sort((a, b) => a.code.localeCompare(b.code));
}

async function main() {
  const { term, force, headed, limit } = parseArgs(process.argv.slice(2));

  let subjects = await subjectsForTerm(term);
  if (Number.isFinite(limit)) subjects = subjects.slice(0, limit);
  log(`${subjects.length} subjects offer ${term}`);

  log(`connecting to Playwright MCP (pnpm dlx @playwright/mcp@latest${headed ? '' : ' --headless'})`);
  const transport = new StdioClientTransport({
    command: 'pnpm',
    args: ['dlx', '@playwright/mcp@latest', '--isolated', ...(headed ? [] : ['--headless'])],
  });
  const client = new Client({ name: 'columbia-sis-all', version: '0.1.0' });
  await client.connect(transport);

  const call = (name, args = {}) =>
    client.callTool({ name, arguments: args }).then(extractResult);
  const navigate = (url) => call('browser_navigate', { url });
  const evaluate = (fn) => call('browser_evaluate', { function: fn });

  await mkdir('out', { recursive: true });

  const summary = { term, scrapedAt: new Date().toISOString(), subjects: [] };
  let scraped = 0, skipped = 0, failed = 0, totalCourses = 0, totalSections = 0;

  try {
    try {
      await client.callTool({ name: 'browser_install', arguments: {} });
    } catch (e) {
      log('browser_install skipped:', e.message);
    }

    for (let i = 0; i < subjects.length; i++) {
      const { code, name, url } = subjects[i];
      const out = `out/${code}_${term}.json`;
      const tag = `(${i + 1}/${subjects.length}) ${code}`;

      if (!force && (await exists(out))) {
        skipped++;
        continue;
      }

      // Up to 3 tries: SIS occasionally stalls on a navigation.
      let parsed = null, lastErr = null;
      for (let attempt = 1; attempt <= 3 && !parsed; attempt++) {
        try {
          await navigate(url);
          const r = await evaluate(PAGE_PARSER);
          if (r && r.error) throw new Error(r.error);
          parsed = r;
        } catch (e) {
          lastErr = e;
          log(`${tag} attempt ${attempt} failed: ${e.message}`);
        }
      }

      if (!parsed) {
        failed++;
        summary.subjects.push({ code, name, ok: false, error: lastErr?.message || 'unknown' });
        log(`${tag} FAILED — skipping`);
        continue;
      }

      const courses = parsed.courses || [];
      const sectionCount = courses.reduce((n, c) => n + c.sections.length, 0);
      await writeFile(
        out,
        JSON.stringify(
          {
            source: url,
            subject: code,
            term,
            subjectTitle: parsed.subjectTitle?.trim() || name || null,
            scrapedAt: new Date().toISOString(),
            courseCount: courses.length,
            sectionCount,
            courses,
          },
          null,
          2
        )
      );
      scraped++;
      totalCourses += courses.length;
      totalSections += sectionCount;
      summary.subjects.push({ code, name, ok: true, courseCount: courses.length, sectionCount });
      log(`${tag} ${courses.length} courses / ${sectionCount} sections -> ${out}`);
    }
  } finally {
    try {
      await client.callTool({ name: 'browser_close', arguments: {} });
    } catch {}
    await client.close();
  }

  summary.totals = { scraped, skipped, failed, totalCourses, totalSections };
  await writeFile(`out/_all_${term}.json`, JSON.stringify(summary, null, 2));

  log(`done: ${scraped} scraped, ${skipped} skipped, ${failed} failed`);
  log(`${totalCourses} courses / ${totalSections} sections this run`);
  if (failed) log(`re-run to retry the ${failed} failed subject(s) (resume-safe)`);
  console.log(JSON.stringify({ term, ...summary.totals }, null, 2));
}

main().catch((err) => {
  console.error('[all] FAILED:', err.message);
  process.exit(1);
});
