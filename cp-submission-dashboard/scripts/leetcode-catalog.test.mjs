import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { canonicalLeetCodeId, loadLeetCodeCatalog } from "./leetcode-catalog.mjs";

const DATA = path.join(import.meta.dirname, "..", "data");
const read = (file) => JSON.parse(fs.readFileSync(path.join(DATA, file), "utf8"));

test("canonicalLeetCodeId matches CPBook's padded ids to catalog ids", () => {
  assert.equal(canonicalLeetCodeId("lc0001"), "1");
  assert.equal(canonicalLeetCodeId("lc0217"), "217");
  assert.equal(canonicalLeetCodeId(2469), "2469");
  assert.equal(canonicalLeetCodeId("not-a-problem"), null);
});

test("the local catalog resolves ids, titles, and description URLs", () => {
  const catalog = loadLeetCodeCatalog();
  assert.ok(catalog.problems.length >= 4068);
  assert.deepEqual(catalog.resolve({ id: "lc0001" }), {
    id: "1",
    title: "Two Sum",
    url: "https://leetcode.com/problems/two-sum/",
  });
  assert.equal(catalog.resolve({ title: "Contains Duplicate" })?.id, "217");
  assert.equal(catalog.resolve({ url: "https://leetcode.com/problems/valid-parentheses/description/" })?.id, "20");
});

test("the catalog covers every LeetCode problem used by the site", () => {
  const catalog = loadLeetCodeCatalog();
  const halim = read("halim-book.json").filter((problem) => problem.judge === "LeetCode");
  const youkn0wwho = read("youkn0wwho.json").problems.filter((problem) => problem.judge === "LeetCode");
  const submissions = read("submissions.json").filter((submission) => submission.platform === "LeetCode");

  assert.equal(halim.length, 201);
  assert.equal(youkn0wwho.length, 33);
  for (const problem of [...halim, ...youkn0wwho]) {
    const mapped = catalog.resolve(problem);
    assert.ok(mapped, `missing ${problem.id}`);
    assert.equal(problem.title, mapped.title);
    assert.equal(problem.url, mapped.url);
  }
  for (const submission of submissions) {
    assert.ok(catalog.resolve({ title: submission.problem, url: submission.url }), `missing ${submission.problem}`);
  }
});
