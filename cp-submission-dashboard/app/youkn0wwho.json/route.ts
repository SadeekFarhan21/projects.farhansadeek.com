import { NextResponse } from "next/server";
import { youkn0wwho } from "../../lib/youkn0wwho";

export function GET() {
  return NextResponse.json({
    source: youkn0wwho.source,
    repository: youkn0wwho.repository,
    total: youkn0wwho.problems.length,
    topics: youkn0wwho.topics,
    problems: youkn0wwho.problems,
  });
}
