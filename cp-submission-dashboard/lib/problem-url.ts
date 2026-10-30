import kattisTitles from "../data/kattis-titles.json";
import type { StoredSub } from "./store";

// Kattis titles don't map cleanly to slugs, so reuse the slug → title cache
const kattisSlugByTitle = new Map(
  Object.entries(kattisTitles as Record<string, string>).map(([slug, title]) => [title, slug])
);
kattisSlugByTitle.set("Eight Queens", "8queens");

function leetcodeSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .join("-");
}

// Best-effort link to the problem statement; null when the judge's
// problem name can't be turned into a URL (SPOJ and CSES store titles only)
export function problemUrl(sub: Pick<StoredSub, "platform" | "problem" | "url">): string | null {
  if (sub.url) return sub.url;
  const problem = sub.problem.trim();
  switch (sub.platform) {
    case "Codeforces": {
      const m = problem.match(/^(\d+)([A-Za-z]\d*)\s+-/);
      if (!m) return null;
      const [, contest, index] = m;
      return Number(contest) >= 100000
        ? `https://codeforces.com/gym/${contest}/problem/${index}`
        : `https://codeforces.com/problemset/problem/${contest}/${index}`;
    }
    case "AtCoder": {
      const contest = problem.replace(/_[^_]+$/, "");
      return contest === problem ? null : `https://atcoder.jp/contests/${contest}/tasks/${problem}`;
    }
    case "LeetCode":
      return `https://leetcode.com/problems/${leetcodeSlug(problem)}/`;
    case "CodeChef":
      return /^[A-Z0-9_]+$/i.test(problem) ? `https://www.codechef.com/problems/${problem}` : null;
    case "Kattis": {
      const slug = kattisSlugByTitle.get(problem) ?? problem.toLowerCase().replace(/[^a-z0-9]/g, "");
      return slug ? `https://open.kattis.com/problems/${slug}` : null;
    }
    case "UVA": {
      const num = Number(problem.match(/^(\d+)\s+-/)?.[1]);
      return Number.isFinite(num) && num > 0
        ? `https://onlinejudge.org/external/${Math.floor(num / 100)}/${num}.pdf`
        : null;
    }
    default:
      return null;
  }
}
