import fs from "node:fs";
import path from "node:path";

const DEFAULT_CATALOG = path.join(import.meta.dirname, "..", "data", "leetcode-problems.csv");

export function canonicalLeetCodeId(value) {
  const digits = String(value ?? "").trim().replace(/^lc/i, "");
  if (!/^\d+$/.test(digits)) return null;
  return String(Number.parseInt(digits, 10));
}

export function normalizeLeetCodeTitle(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

export function canonicalLeetCodeUrl(value) {
  try {
    const url = new URL(value);
    if (url.hostname.replace(/^www\./, "") !== "leetcode.com") return null;
    const pathname = url.pathname.replace(/\/description\/?$/i, "").replace(/\/+$/, "");
    if (!pathname.startsWith("/problems/")) return null;
    return `https://leetcode.com${pathname}/`;
  } catch {
    return null;
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export function loadLeetCodeCatalog(file = DEFAULT_CATALOG) {
  const [header, ...rows] = parseCsv(fs.readFileSync(file, "utf8"));
  const columns = header.map((value) => value.replace(/^\uFEFF/, "").trim().toLowerCase());
  const numberIndex = columns.indexOf("number");
  const nameIndex = columns.indexOf("name");
  const linkIndex = columns.indexOf("link");
  if ([numberIndex, nameIndex, linkIndex].some((index) => index < 0)) {
    throw new Error(`${path.basename(file)} must contain number, name, and link columns`);
  }

  const problems = rows.flatMap((row, index) => {
    if (row.every((value) => !value.trim())) return [];
    const id = canonicalLeetCodeId(row[numberIndex]);
    const title = row[nameIndex]?.trim();
    const url = canonicalLeetCodeUrl(row[linkIndex]);
    if (!id || !title || !url) throw new Error(`${path.basename(file)} has an invalid problem on row ${index + 2}`);
    return [{ id, title, url }];
  });

  const byId = new Map();
  const byTitle = new Map();
  const byUrl = new Map();
  for (const problem of problems) {
    if (byId.has(problem.id)) throw new Error(`${path.basename(file)} contains duplicate problem number ${problem.id}`);
    byId.set(problem.id, problem);
    byTitle.set(normalizeLeetCodeTitle(problem.title), problem);
    byUrl.set(problem.url, problem);
  }

  function resolve({ id, title, url } = {}) {
    const canonicalId = canonicalLeetCodeId(id);
    const canonicalUrl = canonicalLeetCodeUrl(url);
    return (
      (canonicalId ? byId.get(canonicalId) : null) ??
      (canonicalUrl ? byUrl.get(canonicalUrl) : null) ??
      byTitle.get(normalizeLeetCodeTitle(title)) ??
      null
    );
  }

  return { problems, byId, byTitle, byUrl, resolve };
}
