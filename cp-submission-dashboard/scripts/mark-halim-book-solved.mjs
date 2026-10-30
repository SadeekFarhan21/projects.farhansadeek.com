// Adds a `solved` flag to data/halim-book.json and data/halim-book.csv based on the
// accepted submissions in data/submissions.json. Run after `pnpm refresh`.
//
// Matching per judge:
//   UVa      starred id "01124"  ↔ submission "1124 - Title"
//   LeetCode starred id "lc0001" ↔ catalog id 1 ↔ submission title
//   Kattis   starred id "hello"  ↔ submission title "Hello World!" (titles cached
//            in data/kattis-titles.json so each slug is only fetched once)

import fs from "node:fs";
import path from "node:path";
import { loadLeetCodeCatalog } from "./leetcode-catalog.mjs";

const DATA = path.join(import.meta.dirname, "..", "data");
const read = (file) => JSON.parse(fs.readFileSync(path.join(DATA, file), "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (value) => String(value).normalize("NFKC").trim().toLowerCase();

const submissions = read("submissions.json");
const starred = read("halim-book.json");
const leetcodeCatalog = loadLeetCodeCatalog();

const accepted = (platform) => submissions.filter((s) => s.platform === platform && s.ac);

const uvaSolved = new Set(
  accepted("UVA").map((s) => Number(s.problem.split(" - ")[0])).filter(Number.isFinite)
);

const leetcodeSolvedTitles = new Set(accepted("LeetCode").map((s) => norm(s.problem)));

const KATTIS_CACHE = path.join(DATA, "kattis-titles.json");
const kattisTitles = fs.existsSync(KATTIS_CACHE) ? read("kattis-titles.json") : {};
const kattisSolvedTitles = new Set(accepted("Kattis").map((s) => norm(s.problem)));
const decode = (value) =>
  value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
const missing = [...new Set(starred.filter((p) => p.judge === "Kattis" && !(p.id in kattisTitles)).map((p) => p.id))];
if (missing.length) console.log(`fetching ${missing.length} Kattis titles…`);
for (const slug of missing) {
  try {
    const res = await fetch(`https://open.kattis.com/problems/${encodeURIComponent(slug)}`, {
      headers: { "User-Agent": "submission-activity/1.0 (local dashboard)" },
    });
    const title = (await res.text()).match(/<title>([\s\S]*?)\s*&ndash;\s*Kattis/i)?.[1];
    if (res.ok && title) kattisTitles[slug] = decode(title.trim());
  } catch (error) {
    console.warn(`Kattis ${slug}: ${error.message}`);
  }
  await sleep(250);
}
fs.writeFileSync(KATTIS_CACHE, JSON.stringify(kattisTitles, null, 2) + "\n");

for (const problem of starred) {
  let solved = problem.solved ?? false;
  if (problem.judge === "UVa") {
    solved = uvaSolved.has(Number(problem.id));
  } else if (problem.judge === "LeetCode") {
    const catalogProblem = leetcodeCatalog.resolve(problem);
    if (!catalogProblem) throw new Error(`LeetCode catalog is missing Halim problem ${problem.id}`);
    problem.title = catalogProblem.title;
    problem.url = catalogProblem.url;
    solved = leetcodeSolvedTitles.has(norm(catalogProblem.title));
  } else if (problem.judge === "Kattis") {
    const title = kattisTitles[problem.id];
    solved = kattisSolvedTitles.has(norm(problem.id)) || (title != null && kattisSolvedTitles.has(norm(title)));
  }
  problem.solved = solved;
}
fs.writeFileSync(path.join(DATA, "halim-book.json"), JSON.stringify(starred, null, 2) + "\n");

// halim-book.csv keeps one row per halim-book.json entry in the same order. Keep
// its display title, URL, and solved status synchronized with the JSON data.
function parseCsv(textValue) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < textValue.length; i++) {
    const c = textValue[i];
    if (quoted) {
      if (c === '"' && textValue[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}
const escapeCsv = (value) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

const csvPath = path.join(DATA, "halim-book.csv");
const [header, ...body] = parseCsv(fs.readFileSync(csvPath, "utf8"));
if (body.length !== starred.length) throw new Error(`halim-book.csv has ${body.length} rows, halim-book.json has ${starred.length}`);
let solvedIndex = header.indexOf("Solved");
if (solvedIndex < 0) solvedIndex = header.push("Solved") - 1;
const titleIndex = header.indexOf("Problem Title");
let urlIndex = header.indexOf("URL");
if (urlIndex < 0) urlIndex = header.push("URL") - 1;
body.forEach((row, i) => {
  if (row[0] !== starred[i].id) throw new Error(`halim-book.csv row ${i + 2} (${row[0]}) does not match halim-book.json (${starred[i].id})`);
  if (starred[i].judge === "LeetCode" && titleIndex >= 0) row[titleIndex] = starred[i].title ?? row[titleIndex];
  row[solvedIndex] = String(starred[i].solved);
  row[urlIndex] = starred[i].url ?? "";
});
fs.writeFileSync(csvPath, [header, ...body].map((row) => row.map(escapeCsv).join(",")).join("\n") + "\n");

const count = (judge) => starred.filter((p) => p.judge === judge && p.solved).length;
console.log(
  `solved ${starred.filter((p) => p.solved).length}/${starred.length} starred ` +
    `(UVa ${count("UVa")}, Kattis ${count("Kattis")}, LeetCode ${count("LeetCode")})`
);
