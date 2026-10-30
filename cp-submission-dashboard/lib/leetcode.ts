import { StoredSub } from "./store";
import { handles } from "./config";

const GRAPHQL_URL = "https://leetcode.com/graphql";
const USERNAME = handles.leetcode ?? "";

// LeetCode's public feeds are capped at the latest 20 submissions. The
// alfa-leetcode-api wrapper exposes that feed with verdicts for every attempt.
const PUBLIC_FEED_URL =
  process.env.LEETCODE_API_URL ??
  `https://alfa-leetcode-api.onrender.com/${USERNAME}/submission?limit=10000`;

const RECENT_SUBMISSIONS_QUERY = `
  query recentSubmissionList($username: String!, $limit: Int!) {
    recentSubmissionList(username: $username, limit: $limit) {
      id title titleSlug timestamp statusDisplay lang
    }
  }
`;

const SUBMISSION_LIST_QUERY = `
  query submissionList($limit: Int!, $offset: Int!) {
    submissionList(limit: $limit, offset: $offset) {
      lastKey
      hasNext
      submissions { id title titleSlug timestamp statusDisplay lang runtime memory }
    }
  }
`;

const BASE_HEADERS = {
  "Content-Type": "application/json",
  Referer: "https://leetcode.com/",
  Origin: "https://leetcode.com",
  "User-Agent": "Mozilla/5.0",
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  const date = Date.parse(value);
  return Number.isFinite(date) ? date / 1000 : null;
}

function memoryBytes(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.match(/([\d.]+)\s*(KB|MB|GB)?/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = (match[2] ?? "MB").toUpperCase();
  const multiplier = unit === "GB" ? 1024 ** 3 : unit === "KB" ? 1024 : 1024 ** 2;
  return Math.round(amount * multiplier);
}

function runtimeMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.match(/[\d.]+/);
  return match ? Number(match[0]) : null;
}

export function normalizeLeetCodeSubmissions(payload: any): StoredSub[] {
  const rows = [
    payload?.submissionList?.submissions,
    payload?.recentSubmissionList,
    payload?.recentAcSubmissionList,
    payload?.submission,
    payload?.submissions,
    payload?.result,
    payload?.data?.submission,
    payload?.data?.submissions,
    payload?.data,
  ].find(Array.isArray) ?? [];

  return rows.flatMap((row: any) => {
    const epochValue = row.timestamp ?? row.timeStamp ?? row.createdAt;
    const epoch = asNumber(epochValue);
    const title = row.title ?? row.problem ?? row.titleSlug;
    if (epoch === null || !title) return [];

    const verdict = String(
      row.statusDisplay ?? row.status_display ?? row.status ?? "UNKNOWN"
    ).toUpperCase();
    return [{
      ...(row.id != null ? { id: String(row.id) } : {}),
      platform: "LeetCode" as const,
      epoch: Math.floor(epoch),
      problem: String(title),
      verdict,
      ac: verdict === "ACCEPTED",
      language: row.lang ?? row.language ?? null,
      runtimeMs: runtimeMs(row.runtime),
      memoryBytes: memoryBytes(row.memory),
    }];
  });
}

async function graphql(query: string, variables: Record<string, unknown>, headers: Record<string, string> = {}) {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { ...BASE_HEADERS, ...headers },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const payload = await res.json();
  if (payload.errors?.length) throw new Error(payload.errors[0].message ?? "GraphQL error");
  return payload.data ?? {};
}

async function fetchPublicFeed(): Promise<StoredSub[]> {
  const res = await fetch(PUBLIC_FEED_URL, {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return normalizeLeetCodeSubmissions(await res.json());
}

export async function fetchLeetCodeSubmissions(limit = 20): Promise<StoredSub[]> {
  const session = process.env.LEETCODE_SESSION;
  if (session) {
    const data = await graphql(SUBMISSION_LIST_QUERY, { limit, offset: 0 }, { Cookie: `LEETCODE_SESSION=${session}` });
    // An expired cookie yields `submissions: null` instead of an error.
    if (Array.isArray(data.submissionList?.submissions)) return normalizeLeetCodeSubmissions(data);
  }
  if (!USERNAME) return [];
  try {
    return await fetchPublicFeed();
  } catch {
    const data = await graphql(RECENT_SUBMISSIONS_QUERY, { username: USERNAME, limit: Math.min(limit, 20) });
    return normalizeLeetCodeSubmissions(data);
  }
}
