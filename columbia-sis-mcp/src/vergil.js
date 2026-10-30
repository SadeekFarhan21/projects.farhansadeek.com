#!/usr/bin/env node
// Interactive Vergil session. ONE visible Chromium window is launched once and
// reused for everything — no new browser instances per class.
//
// Division of labor:
//   - THE SCRIPT clicks through to Vergil (opens the SIS section page, follows
//     the "View Class Schedule & Location in Vergil" link).
//   - YOU authenticate once (UNI + Duo) on the first class.
// After that, type more call numbers / URLs and each one is opened in the SAME
// already-authenticated window and captured — the script never spins up another
// Chromium.
//
// It drives the *Playwright MCP server* (@playwright/mcp) as an MCP client over
// stdio — headed, with a persistent profile so the login also survives across
// separate runs on later days.
//
// Usage:
//   node src/vergil.js                 # prompts for the first call number
//   node src/vergil.js --call 13508    # start on that section
//   node src/vergil.js https://doc.sis.columbia.edu/subj/COMS/W1002-20263-001/
//   node src/vergil.js --call 13508 --print-url   # resolve only, no browser

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { writeFile, mkdir, readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import readline from 'node:readline/promises';

const PROFILE_DIR = resolve(process.cwd(), '.vergil-profile');

function parseArgs(argv) {
  const opts = { positional: [], call: null, printUrl: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--call') opts.call = argv[++i];
    else if (a === '--print-url') opts.printUrl = true;
    else opts.positional.push(a);
  }
  return opts;
}

const log = (...a) => console.error('[vergil]', ...a);

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

// Look up a section by call number in previously scraped out/*.json.
async function resolveByCall(call) {
  let files = [];
  try {
    files = (await readdir('out')).filter((f) => f.endsWith('.json'));
  } catch {
    return null;
  }
  for (const f of files) {
    let data;
    try {
      data = JSON.parse(await readFile(join('out', f), 'utf8'));
    } catch {
      continue;
    }
    for (const course of data.courses || []) {
      for (const sec of course.sections || []) {
        if (String(sec.callNumber) === String(call)) {
          return {
            sectionUrl: sec.sectionUrl,
            vergilUrl: sec.vergilUrl,
            label: `${course.courseNumber} ${sec.section} (${sec.sectionTitle || course.title})`,
            slug: call,
          };
        }
      }
    }
  }
  return null;
}

// Turn a single user input (call number or URL) into a target.
async function resolveOne(input) {
  const s = String(input).trim();
  if (/^https?:\/\//i.test(s)) {
    const isVergil = /vergil\.columbia\.edu/i.test(s);
    return {
      sectionUrl: isVergil ? null : s,
      vergilUrl: isVergil ? s : null,
      label: s,
      slug: (s.match(/(\d{4,6})\/?$/) || [])[1] || 'page',
    };
  }
  if (/^\d{4,6}$/.test(s)) {
    const hit = await resolveByCall(s);
    if (!hit) throw new Error(`call number ${s} not found in out/*.json (scrape it first)`);
    return { ...hit, slug: s };
  }
  throw new Error(`don't understand "${s}" — give a call number or a doc.sis/Vergil URL`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.printUrl) {
    const seed = opts.call || opts.positional[0];
    console.log(JSON.stringify(await resolveOne(seed), null, 2));
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });

  log(`launching VISIBLE Chromium via Playwright MCP (profile: ${PROFILE_DIR})`);
  const transport = new StdioClientTransport({
    command: 'pnpm',
    args: ['dlx', '@playwright/mcp@latest', '--user-data-dir', PROFILE_DIR],
  });
  const client = new Client({ name: 'columbia-vergil-session', version: '0.1.0' });
  await client.connect(transport);

  const call = (name, args = {}) =>
    client.callTool({ name, arguments: args }).then(extractResult);

  // Reach a class's Vergil page IN THE CURRENT TAB (reusing this one browser).
  // `viaClick` follows the link from the SIS page; otherwise we go direct.
  async function openClass(target, viaClick) {
    if (viaClick && target.sectionUrl) {
      log(`opening SIS section page: ${target.sectionUrl}`);
      await call('browser_navigate', { url: target.sectionUrl });
      // Read the Vergil href off the page and follow it in the SAME tab, so we
      // never accumulate tabs or windows.
      const href = await call('browser_evaluate', {
        function: `(() => { const a = document.querySelector('a[href*="vergil.columbia.edu"]'); return a ? a.href : null; })`,
      });
      const dest = (typeof href === 'string' && href) || target.vergilUrl;
      if (!dest) throw new Error('no Vergil link found on the section page');
      log(`following Vergil link: ${dest}`);
      await call('browser_navigate', { url: dest });
    } else {
      const dest = target.vergilUrl || target.sectionUrl;
      log(`opening in the same window: ${dest}`);
      await call('browser_navigate', { url: dest });
    }
  }

  async function capture(target) {
    const captured = await call('browser_evaluate', {
      function: `(() => {
        const text = (document.body.innerText || '').replace(/\\n{3,}/g, '\\n\\n').trim();
        const lines = text.split('\\n').map(s => s.trim()).filter(Boolean);
        const schedule = lines.filter(l =>
          /\\b(Mo|Tu|We|Th|Fr|Sa|Su|Monday|Tuesday|Wednesday|Thursday|Friday)\\b/.test(l) ||
          /\\b\\d{1,2}:\\d{2}\\s?(am|pm|AM|PM)\\b/.test(l) ||
          /\\b(Room|Hall|Building|Bldg|Online|Remote)\\b/i.test(l)
        );
        return { url: location.href, title: document.title, schedule, text };
      })`,
    });
    const out = `out/vergil/${target.slug}.json`;
    const shotPath = `out/vergil/${target.slug}.png`;
    await mkdir(dirname(out), { recursive: true });
    try {
      await call('browser_take_screenshot', { type: 'png', filename: resolve(shotPath), fullPage: true });
    } catch (e) {
      log(`screenshot skipped: ${e.message}`);
    }
    const record = {
      label: target.label,
      sectionUrl: target.sectionUrl || null,
      capturedAt: new Date().toISOString(),
      url: typeof captured === 'object' ? captured.url : target.vergilUrl,
      title: typeof captured === 'object' ? captured.title : null,
      scheduleGuess: typeof captured === 'object' ? captured.schedule : [],
      pageText: typeof captured === 'object' ? captured.text : String(captured),
      screenshot: shotPath,
    };
    await writeFile(out, JSON.stringify(record, null, 2));
    log(`captured ${record.url} -> ${out}`);
    if (record.scheduleGuess.length) {
      log('likely schedule/location lines:');
      for (const l of record.scheduleGuess) console.error('   ', l);
    } else {
      log('no schedule lines matched heuristically — see pageText in the JSON.');
    }
  }

  try {
    // First class: figure out which, click through, and let YOU authenticate.
    let seed = opts.call || opts.positional[0];
    if (!seed) seed = (await rl.question('First call number or URL: ')).trim();
    let target = await resolveOne(seed);

    await openClass(target, true);
    await rl.question(
      '\n======================================================================\n' +
        " I've clicked through to Vergil. Authenticate in the Chromium window\n" +
        ' (UNI + Duo). I will not touch the browser meanwhile.\n' +
        ' Press ENTER here once the schedule & location are visible...\n' +
        '======================================================================\n'
    );
    await capture(target);

    // Every class after this REUSES the same authenticated window — no relaunch.
    while (true) {
      const next = (await rl.question('\nNext call number or URL (blank to finish): ')).trim();
      if (!next) break;
      try {
        target = await resolveOne(next);
      } catch (e) {
        log(e.message);
        continue;
      }
      await openClass(target, false); // already authenticated → go straight in
      await capture(target);
    }
    log('done — closing the browser.');
  } finally {
    rl.close();
    try {
      await client.callTool({ name: 'browser_close', arguments: {} });
    } catch {}
    await client.close();
  }
}

main().catch((err) => {
  console.error('[vergil] FAILED:', err.message);
  process.exit(1);
});
