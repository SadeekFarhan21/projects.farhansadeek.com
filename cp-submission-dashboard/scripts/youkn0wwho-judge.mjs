export function isCodeforcesGym(id, url) {
  const problemId = String(id ?? "").toLowerCase();
  if (problemId.startsWith("cf_gym_") || problemId.startsWith("gym_")) return true;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "codeforces.com") {
      return /\/(?:gym\/|problemset\/gymProblem\/)/i.test(parsed.pathname);
    }
    if (host === "vjudge.net") return /\/problem\/Gym-/i.test(parsed.pathname);
  } catch {}

  return false;
}

// CSES task number for a topic-list problem. CSES renames tasks over time
// (e.g. "Grid Paths" → "Grid Paths I"), so solved matching uses this number.
export function csesTaskId(id, url) {
  const fromUrl = String(url ?? "").match(/cses\.fi\/(?:problemset|[a-z0-9]+)\/task\/(\d+)|vjudge\.net\/problem\/CSES-(\d+)/i);
  if (fromUrl) return fromUrl[1] ?? fromUrl[2];
  return String(id ?? "").match(/^cses_(\d+)$/)?.[1] ?? null;
}
