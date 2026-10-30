import { halimBookCsv } from "../../lib/halim-book";

export function GET() {
  return new Response(halimBookCsv(), {
    headers: { "Content-Type": "text/csv; charset=utf-8" },
  });
}
