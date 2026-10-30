// Fetch a Kattis user's submission history as normalized JSON.
//
// Usage:
//   KATTIS_USERNAME=your-kattis-username KATTIS_COOKIE='KattisSiteCookie=...' \
//     node scripts/fetch-kattis.mjs --full --merge
//
// KATTIS_COOKIE is only needed when the account's submission history is not
// visible to anonymous visitors. Copy the cookie value from the browser's
// KattisSiteCookie cookie; do not commit it.

import fs from "node:fs";
import path from "node:path";

// Load local credentials when run directly with Node (Next.js does this
// automatically, plain Node does not).
for (const file of [".env.local", ".env"]) {
  const envPath = path.join(import.meta.dirname, "..", file);
  if (!fs.existsSync(envPath)) continue;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2];
  }
}

const username = process.env.KATTIS_USERNAME ?? process.argv[2];
const full = process.argv.includes("--full");
const merge = process.argv.includes("--merge");
const KATTIS_TIME_ZONE = "America/Los_Angeles";

if (!username) {
  console.error("Usage: KATTIS_USERNAME=... node scripts/fetch-kattis.mjs [--full] [--merge]");
  process.exit(1);
}

const cookieValue = process.env.KATTIS_COOKIE;
const cookie = cookieValue
  ? cookieValue.startsWith("KattisSiteCookie=")
    ? cookieValue
    : `KattisSiteCookie=${cookieValue}`
  : null;

function decode(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&(?:amp|#38);/gi, "&")
    .replace(/&(?:quot|#34);/gi, '"')
    .replace(/&(?:apos|#39|#x27);/gi, "'")
    .replace(/&(?:lt|#60);/gi, "<")
    .replace(/&(?:gt|#62);/gi, ">")
    .replace(/&nbsp;/gi, " ");
}

function text(value) {
  return decode(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function localDateTimeToEpoch(value, timeZone) {
  const naiveEpoch = Date.parse(`${value}Z`);
  if (!Number.isFinite(naiveEpoch)) return NaN;
  let epoch = naiveEpoch;
  for (let i = 0; i < 2; i += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(epoch));
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    const displayedEpoch = Date.UTC(
      Number(values.year), Number(values.month) - 1, Number(values.day),
      Number(values.hour) % 24, Number(values.minute), Number(values.second)
    );
    epoch = naiveEpoch - (displayedEpoch - epoch);
  }
  return epoch / 1000;
}

function parsePage(html, responseDate) {
  const rows = [];
  const cell = (row, type) => row.match(
    new RegExp(`<td[^>]*data-type=["']${type}["'][^>]*>([\\s\\S]*?)</td>`, "i")
  )?.[1] ?? "";
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: KATTIS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(responseDate);

  for (const match of html.matchAll(/<tr[^>]*data-submission-id="\d+"[^>]*>[\s\S]*?<\/tr>/gi)) {
    const row = match[0];
    const problemCell = cell(row, "problem");
    const problemLinks = [...problemCell.matchAll(
      /<a[^>]*href=["'][^"']*\/problems\/[^"'#?]*["'][^>]*>([\s\S]*?)<\/a>/gi
    )];
    const problem = problemLinks.length
      ? text(problemLinks.at(-1)[1])
      : text(problemCell);
    const time = text(cell(row, "time"));
    const verdict = text(cell(row, "status")) || "UNKNOWN";
    const timeOnly = /^\d{2}:\d{2}:\d{2}$/.test(time);
    const timestamp = timeOnly ? `${dateKey} ${time}` : time;
    const epoch = localDateTimeToEpoch(timestamp.replace(" ", "T"), KATTIS_TIME_ZONE);
    const runtime = text(cell(row, "cpu")).match(/[\d.]+/)?.[0];
    const id = row.match(/data-submission-id="(\d+)"/i)?.[1];

    if (!id || !problem || !time || !Number.isFinite(epoch)) continue;
    rows.push({
      platform: "Kattis",
      id,
      epoch,
      problem,
      verdict,
      ac: verdict.toLowerCase().startsWith("accepted"),
      language: text(cell(row, "lang")) || null,
      runtimeMs: runtime ? Math.round(Number(runtime) * 1000) : null,
      memoryBytes: null,
    });
  }
  return rows;
}

async function fetchPage(page) {
  const url = new URL(`https://open.kattis.com/users/${encodeURIComponent(username)}`);
  url.searchParams.set("tab", "submissions");
  if (page > 1) url.searchParams.set("page", String(page));
  const response = await fetch(url, {
    headers: {
      "User-Agent": "submission-activity/1.0 (Kattis submission export)",
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });
  if (!response.ok) throw new Error(`Kattis HTTP ${response.status} for page ${page}`);
  return { html: await response.text(), date: new Date(response.headers.get("date") ?? Date.now()) };
}

const all = [];
const seen = new Set();
for (let page = 1; page <= (full ? 100 : 1); page += 1) {
  const parsed = parsePage(...Object.values(await fetchPage(page)));
  const before = all.length;
  for (const row of parsed) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      all.push(row);
    }
  }
  if (!full || parsed.length === 0 || all.length === before) break;
  await new Promise((resolve) => setTimeout(resolve, 300));
}

if (all.length === 0) {
  throw new Error(
    "Kattis returned no submission rows. Check that KATTIS_COOKIE is set and that the session has not expired."
  );
}

all.sort((a, b) => a.epoch - b.epoch);

if (merge) {
  const dataPath = path.join(import.meta.dirname, "..", "data", "submissions.json");
  const existing = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const merged = [...existing];
  const indexes = new Map();
  for (let index = 0; index < merged.length; index += 1) {
    const row = merged[index];
    if (row.platform !== "Kattis") continue;
    indexes.set(`epoch:${row.epoch}`, index);
    if (row.id) indexes.set(`id:${row.id}`, index);
  }

  for (const row of all) {
    const index = indexes.get(`id:${row.id}`) ?? indexes.get(`epoch:${row.epoch}`);
    if (index === undefined) {
      indexes.set(`id:${row.id}`, merged.length);
      indexes.set(`epoch:${row.epoch}`, merged.length);
      merged.push(row);
    } else {
      merged[index] = row;
    }
  }

  merged.sort((a, b) => a.epoch - b.epoch);
  fs.writeFileSync(dataPath, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`Merged ${all.length} Kattis submissions into ${path.relative(process.cwd(), dataPath)}`);
} else {
  console.log(JSON.stringify(all, null, 2));
}
