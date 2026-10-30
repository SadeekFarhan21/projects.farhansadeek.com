import { NextRequest, NextResponse } from "next/server";
import { getSubmissions, dateKey, StoredSub } from "../../../lib/store";

type Platform =
  | "codeforces"
  | "atcoder"
  | "leetcode"
  | "codechef"
  | "spoj"
  | "cses"
  | "kattis"
  | "uva";

type DayCounts = Record<Platform, number> & {
  total: number;
  accepted: number;
  acc: Record<Platform, number>;
  // Submissions to problems not yet accepted at that point (excludes re-submits)
  fresh: Record<Platform, number>;
};

const DAY_MS = 86_400_000;

const PLATFORM_KEY: Record<StoredSub["platform"], Platform> = {
  Codeforces: "codeforces",
  AtCoder: "atcoder",
  LeetCode: "leetcode",
  CodeChef: "codechef",
  SPOJ: "spoj",
  CSES: "cses",
  Kattis: "kattis",
  UVA: "uva",
};

export async function GET(request: NextRequest) {
  const requestedTimeZone = request.nextUrl.searchParams.get("tz") || "UTC";
  let timeZone = "UTC";
  try {
    // Validate the browser-provided IANA timezone before passing it to Intl.
    new Intl.DateTimeFormat("en-US", { timeZone: requestedTimeZone }).format();
    timeZone = requestedTimeZone;
  } catch {
    // Keep UTC as a safe fallback for invalid or missing timezone values.
  }
  const yearParam = request.nextUrl.searchParams.get("year");
  const selectedYear = yearParam && /^\d{4}$/.test(yearParam) ? Number(yearParam) : null;
  // range=all: totals and platform stats cover the whole history. The client
  // still draws the last 365 days of the calendar it gets back.
  const allTime = request.nextUrl.searchParams.get("range") === "all";
  const days = Math.min(Number(request.nextUrl.searchParams.get("days")) || 365, 730);

  // The heatmap is backed by the bundled dataset so it renders immediately.
  // scripts/refresh-data.mjs updates this file through the scheduled workflow.
  const all = (await getSubmissions()).slice().sort((a, b) => a.epoch - b.epoch);
  const sinceEpoch = allTime
    ? (all[0]?.epoch ?? 0)
    : selectedYear != null
      ? Date.UTC(selectedYear, 0, 1) / 1000
      : Math.floor((Date.now() - days * DAY_MS) / 1000);
  const untilEpoch = !allTime && selectedYear != null ? Date.UTC(selectedYear + 1, 0, 1) / 1000 : null;
  const availableYears = [...new Set(all.map((s) => new Date(s.epoch * 1000).getUTCFullYear()))].sort((a, b) => b - a);
  const errors: string[] = [];
  const warnings: string[] = [];

  // Once a problem is accepted, attempts made after that point do not represent
  // another opportunity to solve it and must not affect accuracy. This has to
  // be calculated from the complete history before applying the requested
  // period, otherwise an acceptance in an earlier period would not suppress
  // later attempts in the selected period.
  const acceptedProblems = new Set<string>();
  const accuracySubmissions = all.filter((s) => {
    const key = `${s.platform}:${s.problem}`;
    if (acceptedProblems.has(key)) return false;
    if (s.ac === true) acceptedProblems.add(key);
    return true;
  });
  const isFreshSubmission = new Set(accuracySubmissions);

  // Accepted counts shown in the calendar are still one per problem, while
  // the platform accuracy stats use the deduplicated submission set above.
  const acceptedProblemsForCalendar = new Set<string>();
  const isNewAc = (s: StoredSub): boolean => {
    if (s.ac !== true) return false;
    const key = `${s.platform}:${s.problem}`;
    if (acceptedProblemsForCalendar.has(key)) return false;
    acceptedProblemsForCalendar.add(key);
    return true;
  };

  const calendar: Record<string, DayCounts> = {};
  const periodTotals: Record<Platform, { submissions: number; accepted: number }> = {
    codeforces: { submissions: 0, accepted: 0 },
    atcoder: { submissions: 0, accepted: 0 },
    leetcode: { submissions: 0, accepted: 0 },
    codechef: { submissions: 0, accepted: 0 },
    spoj: { submissions: 0, accepted: 0 },
    cses: { submissions: 0, accepted: 0 },
    kattis: { submissions: 0, accepted: 0 },
    uva: { submissions: 0, accepted: 0 },
  };

  for (const s of all) {
    const newAc = isNewAc(s); // must run over full history for the calendar
    const platform = PLATFORM_KEY[s.platform];
    if (s.epoch < sinceEpoch || (untilEpoch != null && s.epoch >= untilEpoch)) continue;
    const day = dateKey(s.epoch, s.platform, timeZone);
    calendar[day] ??= {
      total: 0,
      accepted: 0,
      codeforces: 0,
      atcoder: 0,
      leetcode: 0,
      codechef: 0,
      spoj: 0,
      cses: 0,
      kattis: 0,
      uva: 0,
      acc: {
        codeforces: 0,
        atcoder: 0,
        leetcode: 0,
        codechef: 0,
        spoj: 0,
        cses: 0,
        kattis: 0,
        uva: 0,
      },
      fresh: {
        codeforces: 0,
        atcoder: 0,
        leetcode: 0,
        codechef: 0,
        spoj: 0,
        cses: 0,
        kattis: 0,
        uva: 0,
      },
    };
    calendar[day][platform]++;
    if (isFreshSubmission.has(s)) calendar[day].fresh[platform]++;
    calendar[day].total++;
    if (newAc) {
      calendar[day].accepted++;
      calendar[day].acc[platform]++;
    }
  }

  for (const s of accuracySubmissions) {
    if (s.epoch < sinceEpoch || (untilEpoch != null && s.epoch >= untilEpoch)) continue;
    const platform = PLATFORM_KEY[s.platform];
    periodTotals[platform].submissions++;
    if (s.ac === true) periodTotals[platform].accepted++;
  }

  const stats = Object.fromEntries(
    Object.entries(periodTotals).map(([platform, t]) => [
      platform,
      {
        submissions: t.submissions,
        accepted: t.accepted,
        accuracy:
          t.submissions > 0 ? Math.round((t.accepted / t.submissions) * 1000) / 10 : null,
      },
    ])
  );

  return NextResponse.json(
    {
      since: new Date(sinceEpoch * 1000).toISOString().slice(0, 10),
      year: allTime ? null : selectedYear,
      allTime,
      availableYears,
      totalSubmissions: Object.values(calendar).reduce((sum, d) => sum + d.total, 0),
      days: calendar,
      stats,
      errors,
      warnings,
    },
    {
      headers: {
        // CDN caches for 5 minutes — upstream APIs are hit at most once per window
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    }
  );
}
