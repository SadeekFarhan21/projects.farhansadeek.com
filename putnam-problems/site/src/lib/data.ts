import raw from "../../public/data/all.json" with { type: "json" };
import { renderLatex } from "./latex";

export interface Problem {
  year: number;
  problem: string;
  category: string[];
  difficulty: number;
  statement: string;
}

export interface Entry extends Problem {
  id: string;
  html: string;
  haystack: string;
}

export const SUBJECTS = [
  { slug: "nt", label: "Number Theory", cat: "number theory", css: "--nt" },
  { slug: "combinatorics", label: "Combinatorics", cat: "combinatorics", css: "--combinatorics" },
  { slug: "analysis", label: "Analysis", cat: "analysis", css: "--analysis" },
  { slug: "algebra", label: "Algebra", cat: "algebra", css: "--algebra" },
  { slug: "geometry", label: "Geometry", cat: "geometry", css: "--geometry" },
  { slug: "linear-algebra", label: "Linear Algebra", cat: "linear algebra", css: "--linear-algebra" },
  { slug: "probability", label: "Probability", cat: "probability", css: "--probability" },
  { slug: "abstract-algebra", label: "Abstract Algebra", cat: "abstract algebra", css: "--abstract-algebra" },
] as const;

export type Subject = (typeof SUBJECTS)[number];

// Keyed by plain string: categories arrive from JSON, so the lookup has to
// accept any string and answer undefined for one it does not know.
export const CAT_TO_SUBJECT = new Map<string, Subject>(SUBJECTS.map((s) => [s.cat, s]));

/** Strips LaTeX down to words so the search box matches prose, not markup. */
function searchable(statement: string): string {
  return statement
    // Drop environments whole: stripping the backslash alone would leave the
    // environment name ("cases", "itemize") behind as a searchable word.
    .replace(/\\(?:begin|end)\s*\{[^}]*\}(?:\s*\{[^}]*\})?/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[${}\\^_&~%#\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export const ENTRIES: Entry[] = (raw as Problem[])
  .map((p) => ({
    ...p,
    id: `${p.year}-${p.problem}`,
    html: renderLatex(p.statement),
    haystack: searchable(p.statement),
  }))
  .sort((a, b) => b.year - a.year || a.problem.localeCompare(b.problem));

export const YEARS = [...new Set(ENTRIES.map((e) => e.year))].sort((a, b) => a - b);
export const YEAR_MIN = YEARS[0];
export const YEAR_MAX = YEARS[YEARS.length - 1];

export function countsByCategory(entries: Entry[] = ENTRIES): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of entries) for (const c of e.category) m.set(c, (m.get(c) ?? 0) + 1);
  return m;
}
