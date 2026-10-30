import data from "../data/youkn0wwho.json";

export type TopicMeta = {
  title: string;
  category: string;
  subCategory: string;
  difficulty: number | null;
  importance: number | null;
  order: number;
};

export type TopicProblem = {
  id: string;
  judge: string;
  title: string;
  url: string;
  difficulty: number | null;
  starred: boolean;
  topic: string;
  topics: string[];
  solved: boolean;
};

export const youkn0wwho = data as {
  source: string;
  repository: string;
  topics: Record<string, TopicMeta>;
  problems: TopicProblem[];
};

const columns: (keyof TopicProblem)[] = ["judge", "id", "title", "url", "difficulty", "starred", "topic", "topics", "solved"];

function escapeCsv(value: unknown): string {
  const text = value == null ? "" : Array.isArray(value) ? value.join("|") : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function youkn0wwhoCsv(): string {
  const rows = youkn0wwho.problems.map((problem) => columns.map((column) => escapeCsv(problem[column])).join(","));
  return [columns.join(","), ...rows].join("\n") + "\n";
}

// Plain-text table with every field, for humans and agents that read text rather than JSON.
export function youkn0wwhoTxt(): string {
  const { problems, topics } = youkn0wwho;
  const header = ["#", "Judge", "ID", "Title", "Difficulty", "Starred", "Solved", "Category", "Sub-category", "Topic", "All topics", "URL"];
  const difficultyNames: Record<number, string> = { 1: "Easy", 2: "Medium", 3: "Hard", 4: "Very Hard" };
  const rows = problems.map((p, i) => {
    const meta = topics[p.topic];
    return [
      String(i + 1),
      p.judge,
      p.id,
      p.title,
      p.difficulty == null ? "-" : difficultyNames[p.difficulty] ?? String(p.difficulty),
      p.starred ? "yes" : "no",
      p.solved ? "yes" : "no",
      meta?.category ?? "",
      meta?.subCategory ?? "",
      meta?.title ?? "",
      p.topics.map((t) => topics[t]?.title ?? t).join("; "),
      p.url,
    ].map((cell) => cell.replace(/\s+/g, " ").trim());
  });
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join(" | ").trimEnd();
  const rule = widths.map((w) => "-".repeat(w)).join("-+-");
  const solved = problems.filter((p) => p.solved).length;
  const starred = problems.filter((p) => p.starred).length;
  return [
    "YouKn0wWho Topic List",
    `Source: ${youkn0wwho.source}`,
    `Repository: ${youkn0wwho.repository}`,
    `Problems: ${problems.length} | Starred: ${starred} | Topics: ${Object.keys(topics).length} | Solved: ${solved}`,
    "Rows are ordered by category, sub-category, and topic, then by the topic page's own problem order.",
    "",
    line(header),
    rule,
    ...rows.map(line),
    "",
  ].join("\n");
}
