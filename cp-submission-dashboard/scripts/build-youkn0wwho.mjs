// Builds data/youkn0wwho.json from YouKn0wWho's topic list (data/youkn0wwho-problems.js and
// data/youkn0wwho-topics.js, exported from https://youkn0wwho.academy) and marks
// which problems are solved using data/submissions.json. Run after `pnpm refresh`.
//
// Solved matching per judge (everything else stays unsolved):
//   Codeforces  codeforces_1063b ↔ submission "1063B - Title" (or the same title in the
//               paired Div. 1/Div. 2 contest, e.g. 688E ↔ 687C)
//   AtCoder     atcoder_abc176_d ↔ submission "abc176_d"
//   CodeChef    codechef_abroads ↔ submission "ABROADS"
//   UVa         uva_11573        ↔ submission "11573 - Title"
//   CSES        cses_1633        ↔ submission problemId "1633" (title for older rows)
//   SPOJ / Kattis / LeetCode  ↔ submission title (Kattis also by slug)

import fs from "node:fs";
import path from "node:path";
import { loadLeetCodeCatalog } from "./leetcode-catalog.mjs";
import { csesTaskId, isCodeforcesGym } from "./youkn0wwho-judge.mjs";

const DATA = path.join(import.meta.dirname, "..", "data");
const read = (file) => JSON.parse(fs.readFileSync(path.join(DATA, file), "utf8"));
const norm = (value) => String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();

const { topicListProblems, topicInfo } = await import("../data/youkn0wwho-problems.js");
const { topicList } = await import("../data/youkn0wwho-topics.js");
const submissions = read("submissions.json");
const kattisTitles = fs.existsSync(path.join(DATA, "kattis-titles.json")) ? read("kattis-titles.json") : {};
const leetcodeCatalog = loadLeetCodeCatalog();

// ---------- topics, in the order the list presents them ----------
const topics = {};
let order = 0;
for (const category of topicList) {
  for (const sub of category.sub_categories ?? []) {
    for (const topic of sub.topics ?? []) {
      topics[topic.topic_id] = {
        title: topic.topic_title,
        category: category.category_title,
        subCategory: sub.sub_category_title,
        difficulty: topic.difficulty ?? null,
        importance: topic.importance ?? null,
        order: order++,
      };
    }
  }
}
topics.uncategorized = { title: "Uncategorized", category: "Other", subCategory: "Other", difficulty: null, importance: null, order: order++ };

// ---------- judge names ----------
const judgeByHost = {
  "codeforces.com": "Codeforces", "atcoder.jp": "AtCoder", "cses.fi": "CSES", "codechef.com": "CodeChef",
  "spoj.com": "SPOJ", "judge.yosupo.jp": "Library Checker", "onlinejudge.org": "UVa", "open.kattis.com": "Kattis",
  "leetcode.com": "LeetCode", "toph.co": "Toph", "lightoj.com": "LightOJ", "oj.uz": "oj.uz", "usaco.org": "USACO",
  "hackerrank.com": "HackerRank", "hackerearth.com": "HackerEarth", "dmoj.ca": "DMOJ", "acm.timus.ru": "Timus",
  "csacademy.com": "CS Academy", "acmicpc.net": "Baekjoon", "szkopul.edu.pl": "Szkopuł", "poj.org": "POJ",
  "loj.ac": "LibreOJ", "uoj.ac": "UOJ", "acm.hdu.edu.cn": "HDU", "luogu.com.cn": "Luogu", "tlx.toki.id": "TLX",
  "qoj.ac": "QOJ", "community.topcoder.com": "TopCoder", "topcoder.com": "TopCoder", "eolymp.com": "Eolymp",
  "codedrills.io": "CodeDrills", "contest.yandex.com": "Yandex", "wcipeg.com": "PEG", "yukicoder.me": "yukicoder",
  "zerojudge.tw": "ZeroJudge", "infoarena.ro": "Infoarena", "acmp.ru": "ACMP", "vnoi.info": "VNOI",
};
const judgeByPrefix = {
  codeforces: "Codeforces", cf: "Codeforces", cf_gym: "CF Gym", gym: "CF Gym", acmsguru: "Codeforces",
  spoj: "SPOJ", cses: "CSES", atcoder: "AtCoder", codechef: "CodeChef", uva: "UVa", yosupo: "Library Checker",
  hackerrank: "HackerRank", lightoj: "LightOJ", kattis: "Kattis", toph: "Toph", usaco: "USACO", dmoj: "DMOJ",
  timus: "Timus", csacademy: "CS Academy", leetcode: "LeetCode", baekjoon: "Baekjoon", poj: "POJ", hdu: "HDU",
  hackerearth: "HackerEarth", aizu: "Aizu", szkopul: "Szkopuł", loj: "LibreOJ", uoj: "UOJ", eolymp: "Eolymp",
  luogu: "Luogu", tlx: "TLX", qoj: "QOJ", topcoder: "TopCoder", ural: "Timus", sgu: "Codeforces", zoj: "ZOJ",
};
const vjudgeJudge = { Gym: "CF Gym", CodeForces: "Codeforces", LightOJ: "LightOJ", HackerRank: "HackerRank", USACO: "USACO", UVA: "UVa", Kattis: "Kattis", SPOJ: "SPOJ", Aizu: "Aizu", POJ: "POJ", HDU: "HDU", URAL: "Timus", ZOJ: "ZOJ", CodeChef: "CodeChef", AtCoder: "AtCoder", TopCoder: "TopCoder", UVALive: "UVa Live", CSES: "CSES", EOlymp: "Eolymp", SGU: "Codeforces", Baekjoon: "Baekjoon" };

function judgeOf(id, url) {
  let host = "";
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch {}
  // Check Gym before the generic codeforces.com host. Some Gym problems use
  // group or problemset/gymProblem URLs rather than the usual /gym/ path.
  if (isCodeforcesGym(id, url)) return "CF Gym";
  if (host === "vjudge.net") {
    const oj = url.match(/\/problem\/([A-Za-z]+)-/)?.[1];
    if (oj && vjudgeJudge[oj]) return vjudgeJudge[oj];
  }
  if (judgeByHost[host]) return judgeByHost[host];
  const prefix = id.split("_")[0];
  if (judgeByPrefix[prefix]) return judgeByPrefix[prefix];
  if (/^(ioi|ceoi|boi|coi|coci|joi|apio|izho|noi|rmi|lmio|eio|egoi)\d*$/.test(prefix)) return "Olympiad";
  return host ? host.split(".").slice(-2, -1)[0].replace(/^./, (c) => c.toUpperCase()) : "Other";
}

// ---------- Codeforces id fixes ----------
// A few topic-list entries point at problems that don't exist: contest 802 uses split
// indices (J1, M2, …) and some ids carry a "?locale=en" suffix. Verified against the
// Codeforces problemset API by contest and title.
const codeforcesIndexFixes = {
  codeforces_802c: "802A3", // Heidi and Library (hard)
  codeforces_802i: "802G3", // Fake News (hard)
  codeforces_802j: "802J1", // Send the Fool Further! (easy)
  codeforces_802n: "802M2", // April Fools' Problem (medium)
  codeforces_802o: "802M3", // April Fools' Problem (hard)
};

function fixCodeforces(p) {
  const cleanId = p.problem_id.replace(/\?.*$/, "");
  const fixed = codeforcesIndexFixes[cleanId];
  if (fixed) {
    const [, contest, index] = fixed.match(/^(\d+)([A-Z]\d?)$/);
    return {
      ...p,
      problem_id: `codeforces_${fixed.toLowerCase()}`,
      problem_url: `https://codeforces.com/problemset/problem/${contest}/${index}`,
    };
  }
  if (cleanId === p.problem_id) return p;
  return { ...p, problem_id: cleanId, problem_url: p.problem_url.replace(/\?.*$/, "") };
}

// ---------- solved lookups from submissions.json ----------
const accepted = (platform) => submissions.filter((s) => s.platform === platform && s.ac).map((s) => s.problem);
const cfSolved = new Set(accepted("Codeforces").map((p) => norm(p.split(" - ")[0]).replace(/\s+/g, "")));
// "contest|title" for Div. 1/Div. 2 mirrors, which share a title across consecutive contest ids.
const cfSolvedByContestTitle = new Set(
  accepted("Codeforces").flatMap((p) => {
    const [key, ...rest] = p.split(" - ");
    const contest = key.match(/^(\d+)/)?.[1];
    return contest ? [`${contest}|${norm(rest.join(" - "))}`] : [];
  })
);
const atcoderSolved = new Set(accepted("AtCoder").map(norm));
const codechefSolved = new Set(accepted("CodeChef").map((p) => norm(p)));
const uvaSolved = new Set(accepted("UVA").map((p) => Number(p.split(" - ")[0])).filter(Number.isFinite));
const csesIdSolved = new Set(
  submissions.filter((s) => s.platform === "CSES" && s.ac && s.problemId).map((s) => String(s.problemId))
);
const titleSolved = {
  CSES: new Set(accepted("CSES").map(norm)),
  SPOJ: new Set(accepted("SPOJ").map(norm)),
  Kattis: new Set(accepted("Kattis").map(norm)),
  LeetCode: new Set(accepted("LeetCode").map(norm)),
};

function isSolved(problem, judge) {
  const id = problem.problem_id;
  const title = norm(problem.problem_title);
  if (judge === "Codeforces") {
    const [, contest, index] = id.match(/^(?:codeforces|cf|acmsguru)_(\d+)([a-z]\d?)$/) ?? [];
    if (contest == null) return false;
    if (cfSolved.has(contest + index)) return true;
    return [-1, 1].some((d) => cfSolvedByContestTitle.has(`${Number(contest) + d}|${title}`));
  }
  if (judge === "AtCoder") return atcoderSolved.has(id.replace(/^atcoder_/, ""));
  if (judge === "CodeChef") return codechefSolved.has(id.replace(/^codechef_/, ""));
  if (judge === "UVa") return uvaSolved.has(Number(id.replace(/^uva_/, "")));
  if (judge === "CSES") {
    const taskId = csesTaskId(id, problem.problem_url);
    return (taskId != null && csesIdSolved.has(taskId)) || titleSolved.CSES.has(title);
  }
  if (judge === "Kattis") {
    const slug = id.replace(/^kattis_/, "");
    const cached = kattisTitles[slug];
    return titleSolved.Kattis.has(title) || titleSolved.Kattis.has(slug) || (cached != null && titleSolved.Kattis.has(norm(cached)));
  }
  if (titleSolved[judge]) return titleSolved[judge].has(title);
  return false;
}

// ---------- problems, ordered by topic then by the topic's own problem order ----------
const difficultyOf = (value) => (Number.isInteger(value) && value >= 1 && value <= 4 ? value : null);
const problems = Object.values(topicListProblems)
  .filter((p) => p.problem_id && p.problem_url && !/^(dfdf|dsf|dsfdsf|sdff|sdfsdf|sdsd|sdsdsds|wer|wewew|k|asas|msk)_/.test(p.problem_id))
  .map((p) => {
    const judge = judgeOf(p.problem_id, p.problem_url);
    const catalogProblem = judge === "LeetCode"
      ? leetcodeCatalog.resolve({ id: p.problem_id, title: p.problem_title, url: p.problem_url })
      : null;
    if (judge === "LeetCode" && !catalogProblem) {
      throw new Error(`LeetCode catalog is missing YouKn0wWho problem ${p.problem_id}`);
    }
    const mappedProblem = catalogProblem
      ? { ...p, problem_title: catalogProblem.title, problem_url: catalogProblem.url }
      : judge === "Codeforces"
        ? fixCodeforces(p)
        : p;
    const known = (p.topics ?? []).filter((t) => topics[t]);
    const primary = known.length ? known.reduce((a, b) => (topics[a].order <= topics[b].order ? a : b)) : "uncategorized";
    return {
      id: mappedProblem.problem_id,
      sourceId: p.problem_id,
      judge,
      title: (mappedProblem.problem_title ?? p.problem_id).trim(),
      url: mappedProblem.problem_url,
      difficulty: difficultyOf(p.difficulty),
      starred: p.is_starred === true,
      topic: primary,
      topics: known.length ? known : ["uncategorized"],
      solved: isSolved(mappedProblem, judge),
    };
  });

// Sort by primary topic, then by the order the topic page lists its problems.
const rankInTopic = (p) => {
  const index = topicInfo[p.topic]?.problem_order?.indexOf(p.sourceId) ?? -1;
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
};
problems.sort(
  (a, b) =>
    topics[a.topic].order - topics[b.topic].order ||
    rankInTopic(a) - rankInTopic(b) ||
    (a.difficulty ?? 9) - (b.difficulty ?? 9) ||
    a.title.localeCompare(b.title)
);

const output = {
  source: "https://youkn0wwho.academy/topic-list",
  repository: "https://github.com/ShahjalalShohag/the-ultimate-topic-list",
  topics,
  problems: problems.map(({ sourceId, ...problem }) => problem),
};
// One problem per line keeps the file small and the git diffs readable.
const text =
  "{\n" +
  `  "source": ${JSON.stringify(output.source)},\n` +
  `  "repository": ${JSON.stringify(output.repository)},\n` +
  `  "topics": ${JSON.stringify(output.topics, null, 2).replace(/\n/g, "\n  ")},\n` +
  `  "problems": [\n${output.problems.map((p) => "    " + JSON.stringify(p)).join(",\n")}\n  ]\n` +
  "}\n";
fs.writeFileSync(path.join(DATA, "youkn0wwho.json"), text);

const solved = problems.filter((p) => p.solved);
const starred = problems.filter((p) => p.starred);
const byJudge = {};
for (const p of solved) byJudge[p.judge] = (byJudge[p.judge] ?? 0) + 1;
console.log(
  `youkn0wwho: ${problems.length} problems (${starred.length} starred), solved ${solved.length} ` +
    `(${starred.filter((p) => p.solved).length} starred) — ` +
    Object.entries(byJudge).sort((a, b) => b[1] - a[1]).map(([j, n]) => `${j} ${n}`).join(", ")
);
