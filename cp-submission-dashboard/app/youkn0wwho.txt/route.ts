import { youkn0wwhoTxt } from "../../lib/youkn0wwho";

export function GET() {
  return new Response(youkn0wwhoTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'inline; filename="youkn0wwho.txt"',
    },
  });
}
