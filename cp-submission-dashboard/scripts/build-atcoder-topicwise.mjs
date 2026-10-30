// Builds data/atcoder-topicwise.json from data/atcoder-topicwise-source.json (see
// sync-atcoder-topicwise.mjs) and marks which problems are solved using data/submissions.json.
// Run after `pnpm refresh`. AtCoder submissions record the task id ("abc176_d"), which is the
// problem id here too.

import fs from "node:fs";
import path from "node:path";

const DATA = path.join(import.meta.dirname, "..", "data");
const read = (file) => JSON.parse(fs.readFileSync(path.join(DATA, file), "utf8"));

const source = read("atcoder-topicwise-source.json");
const submissions = read("submissions.json");
const solved = new Set(submissions.filter((s) => s.platform === "AtCoder" && s.ac).map((s) => s.problem));

// ---------- topics, in the order the index page presents them ----------
const topics = {};
source.topics.forEach((t, order) => {
  topics[t.id] = { title: t.title, category: t.category, parent: t.parent, depth: t.depth, order };
});

// ---------- problems ----------
// Parent pages repeat their children's problems (DP lists every knapsack problem, and so on),
// so a problem's primary topic is its most specific one, earliest in page order on ties.
const topicsOf = {};
for (const t of source.topics) for (const id of source.lists[t.id]) (topicsOf[id] ??= []).push(t.id);

const contestType = (contest) => /^(abc|arc|agc)\d/.exec(contest)?.[1].toUpperCase() ?? "Other";
const problems = Object.entries(source.problems).map(([id, p]) => {
  const list = topicsOf[id];
  const primary = list.reduce((a, b) =>
    topics[b].depth > topics[a].depth || (topics[b].depth === topics[a].depth && topics[b].order < topics[a].order) ? b : a
  );
  return {
    id,
    contest: p.contest,
    type: contestType(p.contest),
    index: p.index,
    title: p.title,
    url: p.url,
    difficulty: p.difficulty,
    topic: primary,
    topics: list,
    solved: solved.has(id),
  };
});

// Upstream's default view: grouped by topic, easy to hard.
problems.sort(
  (a, b) =>
    topics[a.topic].order - topics[b.topic].order ||
    (a.difficulty ?? Infinity) - (b.difficulty ?? Infinity) ||
    a.id.localeCompare(b.id)
);

const output = { source: source.source, repository: source.repository, topics, problems };
// One problem per line keeps the file small and the git diffs readable.
const text =
  "{\n" +
  `  "source": ${JSON.stringify(output.source)},\n` +
  `  "repository": ${JSON.stringify(output.repository)},\n` +
  `  "topics": ${JSON.stringify(output.topics, null, 2).replace(/\n/g, "\n  ")},\n` +
  `  "problems": [\n${problems.map((p) => "    " + JSON.stringify(p)).join(",\n")}\n  ]\n` +
  "}\n";
fs.writeFileSync(path.join(DATA, "atcoder-topicwise.json"), text);

const byType = {};
for (const p of problems.filter((p) => p.solved)) byType[p.type] = (byType[p.type] ?? 0) + 1;
console.log(
  `atcoder-topicwise: ${problems.length} problems in ${Object.keys(topics).length} topics, ` +
    `solved ${problems.filter((p) => p.solved).length} — ` +
    Object.entries(byType).map(([t, n]) => `${t} ${n}`).join(", ")
);
