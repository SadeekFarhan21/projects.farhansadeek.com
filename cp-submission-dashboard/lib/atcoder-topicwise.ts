import data from "../data/atcoder-topicwise.json";

export type AtCoderTopic = {
  title: string;
  category: string;
  parent: string | null;
  depth: number;
  order: number;
};

export type AtCoderProblem = {
  id: string;
  contest: string;
  type: string;
  index: string;
  title: string;
  url: string;
  difficulty: number | null;
  topic: string;
  topics: string[];
  solved: boolean;
};

export const atcoderTopicwise = data as {
  source: string;
  repository: string;
  topics: Record<string, AtCoderTopic>;
  problems: AtCoderProblem[];
};

const columns: (keyof AtCoderProblem)[] = ["type", "contest", "index", "id", "title", "url", "difficulty", "topic", "topics", "solved"];

function escapeCsv(value: unknown): string {
  const text = value == null ? "" : Array.isArray(value) ? value.join("|") : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function atcoderTopicwiseCsv(): string {
  const rows = atcoderTopicwise.problems.map((problem) => columns.map((column) => escapeCsv(problem[column])).join(","));
  return [columns.join(","), ...rows].join("\n") + "\n";
}

// Plain-text table with every field, for humans and agents that read text rather than JSON.
export function atcoderTopicwiseTxt(): string {
  const { problems, topics } = atcoderTopicwise;
  const header = ["#", "Type", "Contest", "ID", "Title", "Difficulty", "Solved", "Category", "Topic", "All topics", "URL"];
  const rows = problems.map((p, i) =>
    [
      String(i + 1),
      p.type,
      p.contest,
      p.id,
      `${p.index}. ${p.title}`,
      p.difficulty == null ? "-" : String(p.difficulty),
      p.solved ? "yes" : "no",
      topics[p.topic]?.category ?? "",
      topics[p.topic]?.title ?? "",
      p.topics.map((t) => topics[t]?.title ?? t).join("; "),
      p.url,
    ].map((cell) => cell.replace(/\s+/g, " ").trim())
  );
  // Japanese titles are double-width in a terminal; padding counts code points, so those rows run long.
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join(" | ").trimEnd();
  const rule = widths.map((w) => "-".repeat(w)).join("-+-");
  const solved = problems.filter((p) => p.solved).length;
  return [
    "AtCoder Topicwise",
    `Source: ${atcoderTopicwise.source}`,
    `Repository: ${atcoderTopicwise.repository}`,
    `Problems: ${problems.length} | Topics: ${Object.keys(topics).length} | Solved: ${solved}`,
    "Rows are grouped by each problem's most specific topic, easy to hard. Difficulty is the AtCoder Problems estimate.",
    "",
    line(header),
    rule,
    ...rows.map(line),
    "",
  ].join("\n");
}
