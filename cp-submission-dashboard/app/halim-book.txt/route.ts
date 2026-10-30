import { halimBookTxt } from "../../lib/halim-book";

export function GET() {
  return new Response(halimBookTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'inline; filename="halim-book.txt"',
    },
  });
}
