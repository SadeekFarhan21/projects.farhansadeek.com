import { atcoderTopicwiseCsv } from "../../lib/atcoder-topicwise";

export function GET() {
  return new Response(atcoderTopicwiseCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'inline; filename="atcoder-topicwise.csv"',
    },
  });
}
