// All per-deployment identity lives in environment variables so the project
// can be run for any set of accounts. See .env.example for the full list.

const env = (name: string): string | null => {
  const value = process.env[name]?.trim();
  return value ? value : null;
};

export const handles = {
  codeforces: env("CODEFORCES_HANDLE"),
  atcoder: env("ATCODER_HANDLE"),
  leetcode: env("LEETCODE_HANDLE"),
  codechef: env("CODECHEF_HANDLE"),
  kattis: env("KATTIS_USERNAME"),
  uva: env("UVA_USERNAME"),
};

export const owner = {
  name: env("OWNER_NAME"),
  website: env("OWNER_URL"),
  iconUrl: env("SITE_ICON_URL"),
};

// "owner/repo" of the GitHub repository whose refresh workflow the
// "Refresh now" button dispatches. Vercel exposes the linked repo automatically.
const vercelRepo =
  env("VERCEL_GIT_REPO_OWNER") && env("VERCEL_GIT_REPO_SLUG")
    ? `${env("VERCEL_GIT_REPO_OWNER")}/${env("VERCEL_GIT_REPO_SLUG")}`
    : null;

export const github = {
  repo: env("GITHUB_REPO") ?? vercelRepo,
  workflow: env("GITHUB_REFRESH_WORKFLOW") ?? "refresh-data.yml",
  branch: env("GITHUB_REFRESH_BRANCH") ?? "main",
};
