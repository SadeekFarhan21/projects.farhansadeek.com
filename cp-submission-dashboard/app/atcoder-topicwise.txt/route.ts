import { atcoderTopicwiseTxt } from "../../lib/atcoder-topicwise";

export function GET() {
  return new Response(atcoderTopicwiseTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'inline; filename="atcoder-topicwise.txt"',
    },
  });
}
