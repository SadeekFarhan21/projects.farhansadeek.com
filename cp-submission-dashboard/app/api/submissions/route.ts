import { NextRequest, NextResponse } from "next/server";
import { getSubmissions } from "../../../lib/store";
import { problemUrl } from "../../../lib/problem-url";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const limit = Math.min(Number(params.get("limit")) || 15, 5000);
  const platform = params.get("platform");

  const errors: string[] = [];
  let subs = await getSubmissions();
  if (platform) {
    subs = subs.filter((s) => s.platform.toLowerCase() === platform.toLowerCase());
  }

  const submissions = subs
    .sort((a, b) => b.epoch - a.epoch)
    .slice(0, limit)
    .map((s) => ({
      platform: s.platform,
      epoch: s.epoch,
      time: new Date(s.epoch * 1000).toISOString(),
      problemName: s.problem,
      problemUrl: problemUrl(s),
      verdict: s.verdict,
      language: s.language,
      runtimeMs: s.runtimeMs,
      memoryBytes: s.memoryBytes,
    }));

  return NextResponse.json(
    { submissions, errors },
    {
      headers: {
        // CDN caches for 5 minutes — upstream APIs are hit at most once per window
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    }
  );
}
