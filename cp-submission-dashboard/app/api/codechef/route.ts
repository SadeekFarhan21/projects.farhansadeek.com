import { NextRequest, NextResponse } from "next/server";
import { parseCodeChefSubmissions } from "../../../lib/codechef";
import { handles } from "../../../lib/config";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const handle = request.nextUrl.searchParams.get("handle") || handles.codechef;
  if (!handle || !/^[A-Za-z0-9_-]+$/.test(handle)) {
    return NextResponse.json({ error: "Invalid CodeChef handle." }, { status: 400 });
  }

  const submissions = [];
  const firstResponse = await fetch(`https://www.codechef.com/recent/user?user_handle=${encodeURIComponent(handle)}&page=0&_=${Date.now()}`, {
    headers: {
      "Cache-Control": "no-cache",
      "User-Agent": "curl/8.7.1",
      Accept: "application/json,text/plain,*/*",
    },
    cache: "no-store",
  });
  if (!firstResponse.ok) {
    return NextResponse.json({ error: `CodeChef returned HTTP ${firstResponse.status}.` }, { status: 502 });
  }
  const first = await firstResponse.json();
  const maxPage = Math.min(Number(first.max_page) || 1, 100);
  submissions.push(...parseCodeChefSubmissions(first.content ?? ""));

  for (let page = 1; page < maxPage; page += 1) {
    const response = await fetch(`https://www.codechef.com/recent/user?user_handle=${encodeURIComponent(handle)}&page=${page}`, {
      headers: { "User-Agent": "submission-activity/1.0" },
      cache: "no-store",
    });
    if (!response.ok) break;
    const payload = await response.json();
    submissions.push(...parseCodeChefSubmissions(payload.content ?? ""));
  }

  return NextResponse.json({ handle, submissions }, { headers: { "Cache-Control": "no-store" } });
}
