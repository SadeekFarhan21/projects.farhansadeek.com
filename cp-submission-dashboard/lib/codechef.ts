import type { StoredSub } from "./store";

// CodeChef's recent-submissions endpoint exposes timestamp titles in IST.
const CODECHEF_TIME_ZONE = "Asia/Kolkata";

function parseEpoch(value: string, timeZone = CODECHEF_TIME_ZONE): number {
  const normalized = value.trim().toLowerCase();
  if (normalized === "just now") return Math.floor(Date.now() / 1000);
  const relative = normalized.match(/^(\d+)\s+(min(?:ute)?|h(?:ou)?r|day|week)s?\s+ago$/);
  if (relative) {
    const unit = relative[2].startsWith("min") ? "minute" : relative[2].startsWith("h") ? "hour" : relative[2];
    const seconds = { minute: 60, hour: 3600, day: 86400, week: 604800 }[unit as "minute" | "hour" | "day" | "week"];
    return Math.floor(Date.now() / 1000 - Number(relative[1]) * seconds);
  }

  const absolute = value.match(/^(\d{1,2}):(\d{2})\s*([AP]M)\s+(\d{2})\/(\d{2})\/(\d{2})$/i);
  if (!absolute) return NaN;
  let hour = Number(absolute[1]) % 12;
  if (absolute[3].toUpperCase() === "PM") hour += 12;
  const year = 2000 + Number(absolute[6]);
  const month = Number(absolute[5]) - 1;
  const day = Number(absolute[4]);
  const localAsUtc = Date.UTC(year, month, day, hour, Number(absolute[2]));
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

function decode(value: string): string {
  return value
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .trim();
}

function cellText(value: string): string {
  return decode(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
}

export function parseCodeChefSubmissions(html: string): StoredSub[] {
  const rows: StoredSub[] = [];
  for (const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = match[1];
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((entry) => cellText(entry[1]));
    const titles = [...row.matchAll(/<td\b[^>]*\btitle\s*=\s*(['"])(.*?)\1/gi)].map((entry) => decode(entry[2]));
    const epoch = parseEpoch(titles[0] ?? cells[0] ?? "");
    const problem = titles[1] || cells[1] || row.match(/\/problems\/([^'"?#]+)/i)?.[1];
    const resultTitle = row.match(/<span\b[^>]*\btitle\s*=\s*(['"])(.*?)\1/i)?.[2];
    const score = cells[2]?.match(/\(\s*\d+\s*\)/)?.[0];
    const verdict = resultTitle ?? (score ? "ACCEPTED" : "UNKNOWN");
    const solutionId = row.match(/\/viewsolution\/(\d+)/i)?.[1];
    if (!problem || !Number.isFinite(epoch)) continue;
    rows.push({
      ...(solutionId ? { id: `codechef:${solutionId}` } : {}),
      platform: "CodeChef",
      epoch,
      problem: decode(problem),
      verdict: decode(verdict).toUpperCase(),
      ac: decode(verdict).toLowerCase().startsWith("accepted"),
      language: titles[3] ?? cells[3] ?? null,
      runtimeMs: null,
      memoryBytes: null,
    });
  }
  return rows;
}
