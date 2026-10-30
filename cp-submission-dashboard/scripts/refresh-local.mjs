import { spawnSync } from "node:child_process";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const refreshArgs = process.argv.slice(2);

if (refreshArgs.includes("--help") || refreshArgs.includes("-h")) {
  console.log(`Usage: pnpm refresh:local -- [refresh options]

Refreshes submissions and rebuilds every derived local dataset.

Examples:
  pnpm refresh:local
  pnpm refresh:local -- --only=leetcode
  pnpm refresh:local -- --full

Options are forwarded to scripts/refresh-data.mjs.`);
  process.exit(0);
}

const steps = [
  { label: "Refresh submissions", script: "refresh-data.mjs", args: refreshArgs },
  { label: "Update Halim solved problems", script: "mark-halim-book-solved.mjs" },
  { label: "Rebuild YouKn0wWho topics", script: "build-youkn0wwho.mjs" },
  // Upstream can occasionally be unavailable. Keep the cached source and still
  // rebuild solved flags, matching the behavior of the GitHub workflow.
  { label: "Sync AtCoder topic categories", script: "sync-atcoder-topicwise.mjs", optional: true },
  { label: "Rebuild AtCoder topic list", script: "build-atcoder-topicwise.mjs" },
];

for (const step of steps) {
  console.log(`\n==> ${step.label}`);
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", step.script), ...(step.args ?? [])], {
    cwd: ROOT,
    env: process.env,
    stdio: "inherit",
  });

  if (result.status === 0) continue;
  if (step.optional) {
    console.warn(`${step.label} failed; continuing with the cached data.`);
    continue;
  }
  process.exit(result.status ?? 1);
}

console.log("\nLocal data refresh complete.");
