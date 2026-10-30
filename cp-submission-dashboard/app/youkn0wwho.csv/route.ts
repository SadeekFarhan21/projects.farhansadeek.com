import { youkn0wwhoCsv } from "../../lib/youkn0wwho";

export function GET() {
  return new Response(youkn0wwhoCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'inline; filename="youkn0wwho.csv"',
    },
  });
}
