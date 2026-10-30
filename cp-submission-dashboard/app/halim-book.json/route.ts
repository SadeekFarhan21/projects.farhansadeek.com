import { NextResponse } from "next/server";
import { halimBook } from "../../lib/halim-book";

export function GET() {
  return NextResponse.json({
    source: "https://cpbook.net/methodstosolve?oj=all&topic=all&quality=starred&difficulty=all",
    total: halimBook.length,
    problems: halimBook,
  });
}
