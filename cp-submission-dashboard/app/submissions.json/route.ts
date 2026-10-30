import { NextResponse } from "next/server";
import { getSubmissions } from "../../lib/store";
import { handles, owner } from "../../lib/config";

export const dynamic = "force-dynamic";

const accounts = {
  Codeforces: handles.codeforces,
  AtCoder: handles.atcoder,
  LeetCode: handles.leetcode,
  CodeChef: handles.codechef,
  SPOJ: null,
  CSES: null,
  Kattis: handles.kattis,
  UVA: handles.uva,
};

export async function GET() {
  const submissions = (await getSubmissions())
    .sort((a, b) => b.epoch - a.epoch)
    .map((submission) => ({
      id: `${submission.platform.toLowerCase()}:${submission.epoch}`,
      platform: submission.platform,
      problem: submission.problem,
      epoch: submission.epoch,
      submittedAt: new Date(submission.epoch * 1000).toISOString(),
      verdict: submission.verdict,
      accepted: submission.ac,
      language: submission.language,
      runtimeMs: submission.runtimeMs,
      memoryBytes: submission.memoryBytes,
    }));

  const byPlatform = Object.fromEntries(
    Object.entries(
      submissions.reduce<Record<string, { submissions: number; accepted: number }>>(
        (counts, submission) => {
          const current = counts[submission.platform] ?? { submissions: 0, accepted: 0 };
          current.submissions += 1;
          if (submission.accepted) current.accepted += 1;
          counts[submission.platform] = current;
          return counts;
        },
        {}
      )
    )
  );

  return NextResponse.json(
    {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      user: {
        name: owner.name,
        website: owner.website,
        accounts,
      },
      summary: {
        totalSubmissions: submissions.length,
        acceptedSubmissions: submissions.filter((submission) => submission.accepted).length,
        byPlatform,
      },
      fields: {
        epoch: "Unix timestamp in seconds",
        submittedAt: "ISO 8601 timestamp in UTC",
        accepted: "Whether the judge accepted the submission",
        runtimeMs: "Runtime in milliseconds, or null when unavailable",
        memoryBytes: "Memory usage in bytes, or null when unavailable",
      },
      submissions,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    }
  );
}
