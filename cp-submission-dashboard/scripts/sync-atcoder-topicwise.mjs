// Pulls the AtCoder Categories site (https://atcoder-categories.github.io) into
// data/atcoder-topicwise-source.json: the category tree from index.html and the problem list
// embedded in each topic page. Upstream adds new contests weekly, so the refresh workflow runs
// this before build-atcoder-topicwise.mjs.
//
//   node scripts/sync-atcoder-topicwise.mjs               fetch from GitHub
//   node scripts/sync-atcoder-topicwise.mjs ../checkout   read a local clone instead

import fs from "node:fs";
import path from "node:path";

const REPOSITORY = "https://github.com/atcoder-categories/atcoder-categories.github.io";
const RAW = "https://raw.githubusercontent.com/atcoder-categories/atcoder-categories.github.io/main/";
const OUT = path.join(import.meta.dirname, "..", "data", "atcoder-topicwise-source.json");
const localDir = process.argv[2];

async function read(file) {
  if (localDir) {
    const full = path.join(localDir, file);
    return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : null;
  }
  const response = await fetch(RAW + file);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  return response.text();
}

// index.html declares the tree as a JS literal (`const CATEGORIES = [...]`), not JSON.
const index = await read("index.html");
const literal = index?.match(/const CATEGORIES = (\[[\s\S]*?\n\s*\]);/)?.[1];
if (!literal) throw new Error("index.html: CATEGORIES not found");
const categories = new Function(`return ${literal}`)();

// Flatten to topics in page order: category → sub → sub-sub.
const topics = [];
const walk = (node, category, parent, depth) => {
  const id = node.href.replace(/\.html$/, "");
  topics.push({ id, title: node.title, category, parent, depth });
  for (const child of node.subs ?? node.subsubs ?? []) walk(child, category, id, depth + 1);
};
for (const category of categories) walk(category, category.title, null, 0);

// Each topic page embeds `const PROBLEMS = [...]` as JSON.
const lists = {};
const problems = {};
const missing = [];
await Promise.all(
  topics.map(async (topic) => {
    const html = await read(`${topic.id}.html`);
    const json = html?.match(/const PROBLEMS = (\[.*?\]);/s)?.[1];
    if (!json) return missing.push(topic.id);
    lists[topic.id] = JSON.parse(json).map((p) => {
      // AtCoder Daily Training reuses ABC tasks under its own contest and letter; point those
      // back at the original contest so links, letters, and solved checks line up.
      const contest = p.id.slice(0, p.id.lastIndexOf("_"));
      const reused = p.contest_id !== contest && p.contest_id.startsWith("adt_");
      problems[p.id] ??= {
        contest: reused ? contest : p.contest_id,
        index: reused ? p.id.slice(p.id.lastIndexOf("_") + 1).toUpperCase() : p.problem_index,
        title: p.title.replace(/^[A-Za-z0-9]+\. /, ""),
        difficulty: Number.isFinite(p.difficulty) ? p.difficulty : null,
        url: reused ? `https://atcoder.jp/contests/${contest}/tasks/${p.id}` : p.url,
      };
      return p.id;
    });
  })
);

const kept = topics.filter((t) => lists[t.id]);
const output = {
  source: "https://atcoder-categories.github.io",
  repository: REPOSITORY,
  topics: kept,
  lists: Object.fromEntries(kept.map((t) => [t.id, lists[t.id]])),
  problems: Object.fromEntries(Object.entries(problems).sort(([a], [b]) => a.localeCompare(b))),
};
// One entry per line keeps the diff small when upstream adds a week's contests.
const text =
  "{\n" +
  `  "source": ${JSON.stringify(output.source)},\n` +
  `  "repository": ${JSON.stringify(output.repository)},\n` +
  `  "topics": [\n${kept.map((t) => "    " + JSON.stringify(t)).join(",\n")}\n  ],\n` +
  `  "lists": {\n${kept.map((t) => `    ${JSON.stringify(t.id)}: ${JSON.stringify(lists[t.id])}`).join(",\n")}\n  },\n` +
  `  "problems": {\n${Object.entries(output.problems).map(([id, p]) => `    ${JSON.stringify(id)}: ${JSON.stringify(p)}`).join(",\n")}\n  }\n` +
  "}\n";
fs.writeFileSync(OUT, text);

console.log(
  `atcoder-topicwise sync: ${kept.length} topics, ${Object.keys(problems).length} problems` +
    (missing.length ? ` (no page for ${missing.join(", ")})` : "")
);
