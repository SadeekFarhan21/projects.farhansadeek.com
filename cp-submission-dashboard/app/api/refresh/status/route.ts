import { NextRequest, NextResponse } from "next/server";
import { github } from "../../../../lib/config";

const RUNS_URL = github.repo
  ? `https://api.github.com/repos/${github.repo}/actions/workflows/${github.workflow}/runs?branch=${encodeURIComponent(github.branch)}&per_page=5`
  : null;

export async function GET(request: NextRequest) {
  const token = process.env.GITHUB_REFRESH_TOKEN;
  if (!token || !RUNS_URL) {
    return NextResponse.json(
      { error: "Refresh is not configured on the server." },
      { status: 503 }
    );
  }

  const after = Number(request.nextUrl.searchParams.get("after")) || 0;
  const response = await fetch(RUNS_URL, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: `GitHub returned HTTP ${response.status}.` },
      { status: 502 }
    );
  }

  const payload = await response.json();
  const run = (payload.workflow_runs ?? []).find(
    (candidate: { created_at?: string }) =>
      Date.parse(candidate.created_at ?? "") >= after - 5000
  );

  if (!run) return NextResponse.json({ status: "waiting" });

  const status =
    run.status !== "completed"
      ? "running"
      : run.conclusion === "success"
        ? "success"
        : "failure";

  return NextResponse.json(
    {
      status,
      runUrl: run.html_url,
      updatedAt: run.updated_at,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
