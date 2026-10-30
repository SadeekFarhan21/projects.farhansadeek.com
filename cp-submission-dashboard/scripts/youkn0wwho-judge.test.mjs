import assert from "node:assert/strict";
import test from "node:test";
import { csesTaskId, isCodeforcesGym } from "./youkn0wwho-judge.mjs";

test("recognizes every Codeforces Gym link format used by the topic list", () => {
  assert.equal(isCodeforcesGym("cf_gym_100625j", "https://codeforces.com/gym/100625/problem/J"), true);
  assert.equal(isCodeforcesGym("gym_287306b", "https://codeforces.com/group/x/contest/219158/problem/B"), true);
  assert.equal(isCodeforcesGym("codeforces_100482a", "https://codeforces.com/problemset/gymProblem/100482/A"), true);
  assert.equal(isCodeforcesGym("anything", "https://vjudge.net/problem/Gym-102644C"), true);
});

test("does not classify regular Codeforces contests as Gym", () => {
  assert.equal(isCodeforcesGym("codeforces_1063b", "https://codeforces.com/problemset/problem/1063/B"), false);
  assert.equal(isCodeforcesGym("codeforces_1900a", "https://codeforces.com/contest/1900/problem/A"), false);
});

test("extracts CSES task numbers from every CSES link format used by the topic list", () => {
  assert.equal(csesTaskId("cses_1633", "https://cses.fi/problemset/task/1633"), "1633");
  assert.equal(csesTaskId("cses_3221", "https://cses.fi/boi24/task/3221"), "3221");
  assert.equal(csesTaskId("cses_2165", "https://vjudge.net/problem/CSES-2165"), "2165");
  assert.equal(csesTaskId("cf_edu_280801a", "https://cses.fi/problemset/task/1735"), "1735");
  assert.equal(csesTaskId("cses_241c", "https://cses.fi/241/task/C"), null);
});
