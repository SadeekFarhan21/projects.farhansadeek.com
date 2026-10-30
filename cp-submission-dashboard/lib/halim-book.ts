import data from "../data/halim-book.json";

export type HalimBookProblem = {
  judge: string;
  id: string;
  title: string | null;
  url: string | null;
  section: string;
  topic: string;
  hint: string;
  dacu: number | null;
  points: number;
  cp5: boolean;
  solved: boolean;
};

export const halimBook = data as HalimBookProblem[];

const columns: (keyof HalimBookProblem)[] = [
  "judge",
  "id",
  "title",
  "url",
  "section",
  "topic",
  "hint",
  "dacu",
  "points",
  "cp5",
  "solved",
];

function escapeCsv(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function halimBookCsv(): string {
  const rows = halimBook.map((problem) => columns.map((column) => escapeCsv(problem[column])).join(","));
  return [columns.join(","), ...rows].join("\n") + "\n";
}

// Plain-text table with every field, for humans and agents that read text rather than JSON.
export function halimBookTxt(): string {
  const header = ["#", "Judge", "ID", "Title", "Section", "Topic", "Hint", "DACU", "Points", "CP5", "Solved", "URL"];
  const rows = halimBook.map((p, i) =>
    [
      String(i + 1),
      p.judge,
      p.id,
      p.title ?? "",
      p.section,
      p.topic,
      p.hint,
      p.dacu == null ? "-" : String(p.dacu),
      p.points.toFixed(1),
      p.cp5 ? "yes" : "no",
      p.solved ? "yes" : "no",
      p.url ?? "",
    ].map((cell) => cell.replace(/\s+/g, " ").trim())
  );
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join(" | ").trimEnd();
  const rule = widths.map((w) => "-".repeat(w)).join("-+-");
  const solved = halimBook.filter((p) => p.solved).length;
  const byJudge = ["UVa", "Kattis", "LeetCode"]
    .map((judge) => `${judge}: ${halimBook.filter((p) => p.judge === judge).length}`)
    .join(" | ");
  return [
    "Halim Book Starred Problems (Competitive Programming 4 and 5, Steven Halim)",
    "Source: https://cpbook.net/methodstosolve?oj=all&topic=all&quality=starred&difficulty=all",
    `Problems: ${halimBook.length} | ${byJudge} | Solved: ${solved}`,
    "Rows are ordered by book chapter and section. Points are the book's difficulty estimate; DACU is UVa's distinct accepted user count.",
    "",
    line(header),
    rule,
    ...rows.map(line),
    "",
  ].join("\n");
}
