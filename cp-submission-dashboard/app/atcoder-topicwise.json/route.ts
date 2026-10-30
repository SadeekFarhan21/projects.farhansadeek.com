import { NextResponse } from "next/server";
import { atcoderTopicwise } from "../../lib/atcoder-topicwise";

export function GET() {
  return NextResponse.json({
    source: atcoderTopicwise.source,
    repository: atcoderTopicwise.repository,
    total: atcoderTopicwise.problems.length,
    topics: atcoderTopicwise.topics,
    problems: atcoderTopicwise.problems,
  });
}
