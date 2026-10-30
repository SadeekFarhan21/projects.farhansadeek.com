// Fetches submissions from all platforms and merges them into data/submissions.json.
// Run locally with `pnpm refresh` (reads cookies from .env.local) or via CI.
// The site serves from the stored JSON, so this script is the only thing that
// talks to the platform APIs.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "submissions.json");

// Next.js auto-loads .env.local; plain node does not
for (const file of [".env.local", ".env"]) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

// Platform handles come from the environment so anyone can run this for
// their own accounts. A platform with no handle is skipped.
const HANDLES = {
  codeforces: process.env.CODEFORCES_HANDLE?.trim() || null,
  atcoder: process.env.ATCODER_HANDLE?.trim() || null,
  leetcode: process.env.LEETCODE_HANDLE?.trim() || null,
  codechef: process.env.CODECHEF_HANDLE?.trim() || null,
};

function skipWithoutHandle(platform, envName) {
  console.log(`${envName} not set — skipping ${platform}`);
  return [];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function localDateTimeToEpoch(value, timeZone) {
  const naiveEpoch = Date.parse(`${value}Z`);
  if (!Number.isFinite(naiveEpoch)) return NaN;

  // Judge pages show wall-clock time in their local timezone, not UTC.
  // Calculate the offset at the submitted time so daylight saving is handled.
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

// --full: ignore the incremental early-stop and paginate entire histories
// (slower pacing to stay under rate limits). Use for one-time backfills.
const FULL = process.argv.includes("--full");

// --only=codeforces,atcoder (or PLATFORMS env): refresh a subset of judges.
// Used by the per-platform GitHub workflows; defaults to every platform.
const PLATFORM_KEYS = ["codeforces", "atcoder", "leetcode", "codechef", "cses", "kattis", "uva"];
const onlyArg = process.argv.find((arg) => arg.startsWith("--only="))?.slice("--only=".length);
const ONLY = (onlyArg ?? process.env.PLATFORMS ?? "")
  .split(",")
  .map((key) => key.trim().toLowerCase())
  .filter(Boolean);
for (const key of ONLY) {
  if (!PLATFORM_KEYS.includes(key)) {
    console.error(`Unknown platform "${key}". Expected one of: ${PLATFORM_KEYS.join(", ")}`);
    process.exit(1);
  }
}
const wanted = (key) => ONLY.length === 0 || ONLY.includes(key);

// ---------- fetchers (return {platform, epoch, problem, verdict, ac, language, runtimeMs, memoryBytes}) ----------

async function fetchCodeforces() {
  if (!HANDLES.codeforces) return skipWithoutHandle("Codeforces", "CODEFORCES_HANDLE");
  const res = await fetch(
    `https://codeforces.com/api/user.status?handle=${HANDLES.codeforces}&from=1&count=${FULL ? 10000 : 1000}`
  );
  const data = await res.json();
  if (data.status !== "OK") throw new Error(data.comment ?? "CF error");
  return data.result.map((s) => ({
    platform: "Codeforces",
    epoch: s.creationTimeSeconds,
    problem: `${s.problem.contestId}${s.problem.index} - ${s.problem.name}`,
    verdict: s.verdict ?? "UNKNOWN",
    ac: s.verdict === "OK",
    language: s.programmingLanguage,
    runtimeMs: s.timeConsumedMillis,
    memoryBytes: s.memoryConsumedBytes,
  }));
}

async function fetchAtCoder(knownEpochs) {
  if (!HANDLES.atcoder) return skipWithoutHandle("AtCoder", "ATCODER_HANDLE");
  const latest = [...knownEpochs]
    .filter((key) => key.startsWith("AtCoder:"))
    .map((key) => Number(key.slice("AtCoder:".length)))
    .filter(Number.isFinite)
    .reduce((max, epoch) => Math.max(max, epoch), 0);
  const fromSecond = FULL ? 0 : Math.max(0, latest - 86400);
  const res = await fetch(
    `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${HANDLES.atcoder}&from_second=${fromSecond}`,
    { headers: { "User-Agent": "Mozilla/5.0" } }
  );
  const data = await res.json();
  return data.map((s) => ({
    platform: "AtCoder",
    epoch: s.epoch_second,
    problem: s.problem_id,
    ...(s.contest_id ? { url: `https://atcoder.jp/contests/${s.contest_id}/tasks/${s.problem_id}` } : {}),
    verdict: s.result,
    ac: s.result === "AC",
    language: s.language,
    runtimeMs: s.execution_time ?? null,
    memoryBytes: s.memory ?? null,
  }));
}

// LeetCode's public "recent submissions" feed is capped at the latest 20 rows,
// which the hourly refresh comfortably covers. alfa-leetcode-api wraps that feed
// (all verdicts, not just accepted); LeetCode's own GraphQL is the fallback.
// An optional LEETCODE_SESSION unlocks the full paginated history.
const LEETCODE_PUBLIC_FEED_URL =
  process.env.LEETCODE_API_URL ??
  `https://alfa-leetcode-api.onrender.com/${HANDLES.leetcode}/submission?limit=10000`;
const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";
const LEETCODE_HEADERS = {
  "Content-Type": "application/json",
  Referer: "https://leetcode.com/",
  Origin: "https://leetcode.com",
  "User-Agent": "Mozilla/5.0",
};

function normalizeLeetCodeRow(s) {
  const rawEpoch = s.timestamp ?? s.timeStamp ?? s.createdAt;
  const epoch = typeof rawEpoch === "number" ? rawEpoch : Number(rawEpoch) || Date.parse(rawEpoch) / 1000;
  const title = s.title ?? s.problem ?? s.titleSlug;
  if (!Number.isFinite(epoch) || !title) return [];
  const verdict = String(s.statusDisplay ?? s.status_display ?? s.status ?? "ACCEPTED").toUpperCase();
  const runtimeMatch = String(s.runtime ?? "").match(/[\d.]+/);
  const memoryMatch = String(s.memory ?? "").match(/([\d.]+)\s*(KB|MB|GB)/i);
  const memoryUnit = memoryMatch?.[2]?.toUpperCase();
  return [{
    ...(s.id != null ? { id: String(s.id) } : {}),
    platform: "LeetCode",
    epoch: Math.floor(epoch),
    problem: String(title),
    ...(s.titleSlug ? { url: `https://leetcode.com/problems/${s.titleSlug}/` } : {}),
    verdict,
    ac: verdict === "ACCEPTED",
    language: s.lang ?? s.language ?? null,
    runtimeMs: runtimeMatch ? Number(runtimeMatch[0]) : null,
    memoryBytes: memoryMatch
      ? Math.round(Number(memoryMatch[1]) * (memoryUnit === "GB" ? 1024 ** 3 : memoryUnit === "KB" ? 1024 : 1024 ** 2))
      : null,
  }];
}

async function leetcodeGraphql(query, variables, extraHeaders = {}) {
  const res = await fetch(LEETCODE_GRAPHQL_URL, {
    method: "POST",
    headers: { ...LEETCODE_HEADERS, ...extraHeaders },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`LeetCode GraphQL HTTP ${res.status}`);
  const payload = await res.json();
  if (payload.errors?.length) throw new Error(payload.errors[0].message ?? "LeetCode GraphQL error");
  return payload.data ?? {};
}

// Full history through the logged-in submissionList endpoint. LeetCode answers
// an expired cookie with `submissions: null` rather than an error, so treat that
// as a failure instead of silently returning nothing.
async function fetchLeetCodeSession(session, knownEpochs) {
  const query = `query submissionList($limit: Int!, $offset: Int!) { submissionList(limit: $limit, offset: $offset) { hasNext submissions { id title titleSlug timestamp statusDisplay lang runtime memory } } }`;
  const all = [];
  for (let page = 0; page < 200; page++) {
    if (page > 0) await sleep(FULL ? 3000 : 1200);
    const data = await leetcodeGraphql(query, { limit: 20, offset: page * 20 }, { Cookie: `LEETCODE_SESSION=${session}` });
    const rows = data.submissionList?.submissions;
    if (!Array.isArray(rows)) throw new Error("LEETCODE_SESSION is expired or invalid");
    all.push(...rows);
    const sawKnown = rows.some((s) => knownEpochs.has(`LeetCode:${s.timestamp}`));
    if ((sawKnown && !FULL) || !data.submissionList?.hasNext) break;
  }
  return all;
}

// Latest 20 submissions with verdicts, via alfa-leetcode-api. The free Render
// instance cold-starts, so allow a generous timeout.
async function fetchLeetCodePublicFeed() {
  const res = await fetch(LEETCODE_PUBLIC_FEED_URL, {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`LeetCode public feed HTTP ${res.status}`);
  const payload = await res.json();
  const rows = payload.submission ?? payload.submissions ?? payload.recentSubmissionList;
  if (!Array.isArray(rows)) throw new Error(`LeetCode public feed: ${payload.message ?? payload.errors ?? "unexpected response"}`);
  return rows;
}

// Same 20-row feed straight from LeetCode, used when the wrapper is down.
async function fetchLeetCodePublicGraphql() {
  const query = `query recentSubmissionList($username: String!, $limit: Int!) { recentSubmissionList(username: $username, limit: $limit) { id title titleSlug timestamp statusDisplay lang } }`;
  const data = await leetcodeGraphql(query, { username: HANDLES.leetcode, limit: 20 });
  const rows = data.recentSubmissionList;
  if (!Array.isArray(rows)) throw new Error("LeetCode recentSubmissionList unavailable");
  return rows;
}

async function fetchLeetCode(knownEpochs) {
  const session = process.env.LEETCODE_SESSION;
  if (!session && !HANDLES.leetcode) return skipWithoutHandle("LeetCode", "LEETCODE_HANDLE");
  if (session) {
    try {
      return (await fetchLeetCodeSession(session, knownEpochs)).flatMap(normalizeLeetCodeRow);
    } catch (error) {
      console.warn(`LeetCode: session fetch failed (${error.message}) — falling back to public feed`);
    }
  }

  let rows;
  try {
    rows = await fetchLeetCodePublicFeed();
  } catch (error) {
    console.warn(`LeetCode: public feed failed (${error.message}) — trying leetcode.com directly`);
    rows = await fetchLeetCodePublicGraphql();
  }
  return rows.flatMap(normalizeLeetCodeRow);
}

async function fetchCodeChef(knownEpochs) {
  if (!HANDLES.codechef) return skipWithoutHandle("CodeChef", "CODECHEF_HANDLE");
  const ownApi = process.env.CODECHEF_API_URL;

  function parseEpoch(value) {
    // CodeChef's recent-submissions endpoint renders its timestamp titles in
    // India Standard Time, regardless of the viewer's local timezone.
    const timeZone = "Asia/Kolkata";
    const relative = value.trim().toLowerCase();
    if (relative === "just now") return Math.floor(Date.now() / 1000);
    const relativeMatch = relative.match(/^(\d+)\s+(min(?:ute)?|h(?:ou)?r|day|week)s?\s+ago$/);
    if (relativeMatch) {
      const unit = relativeMatch[2].startsWith("min") ? "minute" : relativeMatch[2].startsWith("h") ? "hour" : relativeMatch[2];
      const amounts = { minute: 60, hour: 3600, day: 86400, week: 604800 };
      return Math.floor(Date.now() / 1000 - Number(relativeMatch[1]) * amounts[unit]);
    }

    const absolute = value.match(
      /^(\d{1,2}):(\d{2})\s*([AP]M)\s+(\d{2})\/(\d{2})\/(\d{2})$/i
    );
    if (!absolute) return NaN;
    let hour = Number(absolute[1]) % 12;
    if (absolute[3].toUpperCase() === "PM") hour += 12;
    const localAsUtc = Date.UTC(
      2000 + Number(absolute[6]),
      Number(absolute[5]) - 1,
      Number(absolute[4]),
      hour,
      Number(absolute[2])
    );
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    }).formatToParts(new Date(localAsUtc));
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, Number(value)]));
    const displayedAsUtc = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute);
    return (localAsUtc + localAsUtc - displayedAsUtc) / 1000;
  }

  const parse = (html) => {
    const rows = [];
    const cellText = (value) => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    for (const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const row = match[1];
      const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((entry) => cellText(entry[1]));
      const titles = [...row.matchAll(/<td\b[^>]*\btitle\s*=\s*(['"])(.*?)\1/gi)]
        .map((entry) => entry[2].trim());
      const resultTitle = row.match(/<span\b[^>]*\btitle\s*=\s*(['"])(.*?)\1/i)?.[2];
      const score = cells[2]?.match(/\(\s*\d+\s*\)/)?.[0];
      const result = resultTitle ?? (score ? "ACCEPTED" : "UNKNOWN");
      const epoch = parseEpoch(titles[0] ?? cells[0] ?? "");
      const problem = titles[1] || cells[1] || row.match(/\/problems\/([^'"?#]+)/i)?.[1];
      const solutionId = row.match(/\/viewsolution\/(\d+)/i)?.[1];
      if (!problem || !Number.isFinite(epoch)) continue;
      rows.push({
        ...(solutionId ? { id: `codechef:${solutionId}` } : {}),
        platform: "CodeChef",
        epoch,
        problem,
        verdict: result.toUpperCase(),
        ac: result.toLowerCase().startsWith("accepted"),
        language: titles[3] ?? cells[3] ?? null,
        runtimeMs: null,
        memoryBytes: null,
      });
    }
    return rows;
  };
  try {
    const first = await (
      await fetch(
        `https://www.codechef.com/recent/user?user_handle=${HANDLES.codechef}&page=0&_=${Date.now()}`
      )
    ).json();
    const maxPage = Math.min(Number(first.max_page) || 1, 100);
    let rows = parse(first.content ?? "");
    for (let p = 1; p < maxPage; p++) {
      await sleep(400);
      const data = await (
        await fetch(
          `https://www.codechef.com/recent/user?user_handle=${HANDLES.codechef}&page=${p}`,
          { headers: { "User-Agent": "Mozilla/5.0" } }
        )
      ).json();
      const batch = parse(data.content ?? "");
      rows = rows.concat(batch);
      if (!FULL && batch.some((r) => submissionKeys(r).some((key) => knownEpochs.has(key)))) break;
    }
    if (rows.length > 0) return rows;
    console.warn("Direct CodeChef feed returned no rows — using owned API fallback");
  } catch (error) {
    console.warn(`Direct CodeChef feed unavailable (${error.message}) — using owned API fallback`);
  }

  if (!ownApi) return [];
  try {
    const response = await fetch(`${ownApi}?handle=${encodeURIComponent(HANDLES.codechef)}`, { cache: "no-store" });
    if (!response.ok) return [];
    const payload = await response.json();
    return (payload.submissions ?? []).map((submission) => ({ ...submission, platform: "CodeChef" }));
  } catch {
    console.warn("Owned CodeChef API fallback unavailable");
    return [];
  }
}

async function fetchCSES() {
  const scheduledCsesWindow = new Date().getUTCHours() === 6;
  const explicitlyRequested = ONLY.includes("cses");
  if (process.env.REFRESH_CSES !== "true" && !scheduledCsesWindow && !explicitlyRequested) {
    console.log("CSES refresh skipped — scheduled separately to protect quota");
    return [];
  }
  const session = process.env.CSES_SESSION;
  if (!session) {
    console.warn("CSES_SESSION not set — skipping CSES");
    return [];
  }
  const headers = { "User-Agent": "Mozilla/5.0", Cookie: `PHPSESSID=${session}` };
  const grid = await (await fetch("https://cses.fi/problemset/", { headers })).text();
  if (!grid.includes('href="/logout"')) {
    console.warn("CSES session expired — skipping CSES");
    return [];
  }
  // Parse each <li> on its own: unattempted tasks have no score icon, and a
  // regex spanning list items would pair them with the next task's icon and
  // silently skip that (attempted) task.
  const taskIds = grid
    .split('<li class="task">')
    .slice(1)
    .filter((item) => /task-score icon (full|zero)/.test(item.split("</li>")[0]))
    .map((item) => item.match(/<a href="\/problemset\/task\/(\d+)">([^<]*)<\/a>/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]);

  const subs = [];
  for (const [id, name] of taskIds) {
    await sleep(200);
    const page = await (
      await fetch(`https://cses.fi/problemset/task/${id}`, { headers })
    ).text();
    const section = page.split("Your submissions")[1] ?? "";
    for (const ts of section.matchAll(
      /href="\/problemset\/result\/\d+\/">(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) <span class="task-score icon (full|zero)"/g
    )) {
      subs.push({
        platform: "CSES",
        problemId: id,
        epoch: localDateTimeToEpoch(`${ts[1]}T${ts[2]}`, "Europe/Helsinki"),
        problem: name,
        verdict: ts[3] === "full" ? "ACCEPTED" : "REJECTED",
        ac: ts[3] === "full",
        language: "C++",
        runtimeMs: null,
        memoryBytes: null,
      });
    }
  }
  return subs;
}

async function fetchKattis() {
  const username = process.env.KATTIS_USERNAME;
  if (!username) {
    console.log("Kattis username not set — skipping Kattis");
    return [];
  }
  const url = `https://open.kattis.com/users/${encodeURIComponent(username)}?tab=submissions`;
  const kattisCookie = process.env.KATTIS_COOKIE
    ? process.env.KATTIS_COOKIE.startsWith("KattisSiteCookie=")
      ? process.env.KATTIS_COOKIE
      : `KattisSiteCookie=${process.env.KATTIS_COOKIE}`
    : null;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "submission-activity/1.0 (local dashboard)",
      ...(kattisCookie ? { Cookie: kattisCookie } : {}),
    },
  });
  if (!response.ok) throw new Error(`Kattis HTTP ${response.status}`);
  const html = await response.text();
  // Kattis omits the date for submissions made on the current day. Its HTTP
  // date is the reliable date anchor for those time-only values.
  const responseDate = new Date(response.headers.get("date") ?? Date.now());
  const kattisTimeZone = "America/Los_Angeles";
  const responseDateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: kattisTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(responseDate);
  const rows = [];
  const cell = (row, type) => row.match(new RegExp(`<td[^>]*data-type="${type}"[^>]*>([\\s\\S]*?)</td>`, "i"))?.[1] ?? "";
  const text = (value) => value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  for (const rowMatch of html.matchAll(/<tr[^>]*data-submission-id="\d+"[^>]*>[\s\S]*?<\/tr>/gi)) {
    const row = rowMatch[0];
    const problemMatches = [...cell(row, "problem").matchAll(/<a[^>]*href="[^"]*\/problems\/[^"#?]*"[^>]*>([\s\S]*?)<\/a>/gi)];
    const problem = problemMatches.length ? text(problemMatches.at(-1)[1]) : text(cell(row, "problem"));
    const slug = cell(row, "problem").match(/href="[^"]*\/problems\/([^"#?/]+)/i)?.[1];
    const time = text(cell(row, "time"));
    const verdict = text(cell(row, "status")) || "UNKNOWN";
      const timeOnly = /^\d{2}:\d{2}:\d{2}$/.test(time);
      const timestamp = timeOnly
        ? `${responseDateKey} ${time}`
        : time;
      const epoch = localDateTimeToEpoch(timestamp.replace(" ", "T"), kattisTimeZone);
    if (!problem || !time) continue;
    if (!Number.isFinite(epoch)) continue;
    const runtimeMatch = text(cell(row, "cpu")).match(/[\d.]+/);
    rows.push({
      platform: "Kattis",
      id: row.match(/data-submission-id="(\d+)"/i)?.[1] ?? null,
      epoch,
      problem,
      ...(slug ? { url: `https://open.kattis.com/problems/${slug}` } : {}),
      verdict,
      ac: verdict.toLowerCase().startsWith("accepted"),
      language: text(cell(row, "lang")) || null,
      runtimeMs: runtimeMatch ? Math.round(Number(runtimeMatch[0]) * 1000) : null,
      memoryBytes: null,
    });
  }
  return rows;
}

async function fetchUva() {
  let userId = process.env.UVA_USER_ID;
  const username = process.env.UVA_USERNAME;
  if (!userId && username) {
    const response = await fetch(`https://uhunt.onlinejudge.org/api/uname2uid/${encodeURIComponent(username)}`);
    userId = (await response.text()).trim();
  }
  if (!userId || !/^\d+$/.test(userId)) {
    console.log("UVA_USERNAME/UVA_USER_ID not set — skipping UVa");
    return [];
  }
  const [problemResponse, submissionResponse] = await Promise.all([
    fetch("https://uhunt.onlinejudge.org/api/p"),
    fetch(`https://uhunt.onlinejudge.org/api/subs-user/${userId}`),
  ]);
  const problems = await problemResponse.json();
  const payload = await submissionResponse.json();
  const problemById = new Map(
    (Array.isArray(problems) ? problems : Object.values(problems))
      .filter((problem) => Array.isArray(problem) && problem.length >= 3)
      .map((problem) => [Number(problem[0]), problem])
  );
  const verdicts = {
    10: "Submission Error", 15: "Can't be Judged", 20: "In Queue", 30: "Compile Error",
    35: "Restricted Function", 40: "Runtime Error", 45: "Output Limit Exceeded",
    50: "Time Limit Exceeded", 60: "Memory Limit Exceeded", 70: "Wrong Answer",
    80: "Presentation Error", 90: "Accepted",
  };
  const languages = { 1: "C", 2: "Java", 3: "C++", 4: "Pascal", 5: "C++11" };
  return (payload.subs ?? []).flatMap((submission) => {
    const problem = problemById.get(Number(submission[1])) ?? problems[submission[1]];
    const epoch = Number(submission[4]);
    if (!problem || !Number.isFinite(epoch)) return [];
    const verdict = verdicts[submission[2]] ?? `Verdict ${submission[2]}`;
    return [{
      platform: "UVA",
      id: String(submission[0]),
      epoch,
      problem: `${problem[1]} - ${problem[2]}`,
      verdict,
      ac: submission[2] === 90,
      language: languages[submission[5]] ?? null,
      runtimeMs: Number.isFinite(Number(submission[3])) ? Number(submission[3]) * 1000 : null,
      memoryBytes: null,
    }];
  });
}

// ---------- merge ----------

function loadExisting() {
  if (!fs.existsSync(DATA_PATH)) return [];
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf8")).map((row) =>
    row.platform === "UVa Online Judge" ? { ...row, platform: "UVA" } : row
  );
}

function submissionKeys(s) {
  const keys = [`${s.platform}:${s.epoch}`];
  if (s.id) keys.push(`${s.platform}:${s.id}`);
  if (s.platform === "CodeChef" && !s.id) {
    keys.push(`${s.platform}:anonymous:${s.problem}:${s.verdict}:${s.language ?? ""}`);
  }
  return keys;
}

const existing = loadExisting();
const knownEpochs = new Set(existing.flatMap(submissionKeys));
console.log(`existing rows: ${existing.length}`);

const fetchers = [
  { key: "codeforces", name: "Codeforces", run: () => fetchCodeforces() },
  { key: "atcoder", name: "AtCoder", run: () => fetchAtCoder(knownEpochs) },
  { key: "leetcode", name: "LeetCode", run: () => fetchLeetCode(knownEpochs) },
  { key: "codechef", name: "CodeChef", run: () => fetchCodeChef(knownEpochs) },
  { key: "cses", name: "CSES", run: () => fetchCSES() },
  { key: "kattis", name: "Kattis", run: () => fetchKattis() },
  { key: "uva", name: "UVA", run: () => fetchUva() },
].filter((fetcher) => wanted(fetcher.key));

if (ONLY.length > 0) console.log(`platforms: ${fetchers.map((f) => f.name).join(", ")}`);

const results = await Promise.allSettled(fetchers.map((fetcher) => fetcher.run()));

const names = fetchers.map((fetcher) => fetcher.name);
let fresh = [];
results.forEach((r, i) => {
  if (r.status === "fulfilled") {
    console.log(`${names[i]}: fetched ${r.value.length}`);
    fresh = fresh.concat(r.value);
  } else {
    console.warn(`${names[i]}: FAILED — ${r.reason}`);
  }
});

// merge: keep every existing row; add fetched rows we haven't seen
const merged = [...existing];
const seen = new Set(knownEpochs);
let added = 0;
for (const s of fresh) {
  const keys = submissionKeys(s);
  if (keys.some((key) => seen.has(key))) {
    const existingIndex = merged.findIndex((row) => submissionKeys(row).some((key) => keys.includes(key)));
    if (existingIndex >= 0 && s.id) merged[existingIndex] = s;
    // Backfill CSES task ids onto rows fetched before problemId was recorded.
    else if (existingIndex >= 0 && s.problemId && !merged[existingIndex].problemId) {
      merged[existingIndex] = { ...merged[existingIndex], problemId: s.problemId };
    }
    continue;
  }
  keys.forEach((key) => seen.add(key));
  merged.push(s);
  added++;
}
merged.sort((a, b) => a.epoch - b.epoch);
for (const submission of merged) submission.epoch = Math.floor(Number(submission.epoch));

fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
fs.writeFileSync(DATA_PATH, JSON.stringify(merged, null, 2) + "\n");
console.log(`added ${added} new rows → total ${merged.length} in ${path.relative(ROOT, DATA_PATH)}`);
