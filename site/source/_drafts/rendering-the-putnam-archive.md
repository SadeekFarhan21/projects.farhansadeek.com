---
layout: post
title: "A Searchable Putnam Archive Rendered From the Original LaTeX"
tab_title: Putnam Archive
code: https://github.com/SadeekFarhan21/projects.farhansadeek.com/tree/main/putnam-problems
date: 2026-09-19 09:52:09
tags:
  - mathematics
  - latex
  - static-sites
description: >-
  An Astro site for the 492 Putnam problems from 1985 to 2025, filterable by
  subject and difficulty, where 111 statements break under the usual KaTeX setup
  and a 339-line translator built from surveying all of them renders every one.
---

I built a site for practicing Putnam problems. It holds all 492 problems from 1985 to 2025, each tagged with subjects and a difficulty from 1 to 10, with filters for subject, difficulty and year, full-text search, and a "solved" mark that syncs across devices. The statements come straight from the LaTeX in Kiran Kedlaya's Putnam archive<sup>[[1]](#ref-1)</sup> and get rendered to HTML when the site builds.

That rendering step was most of the work. The usual approach is to find the math between dollar signs and hand it to KaTeX<sup>[[2]](#ref-2)</sup>, and I measured what that does to this corpus. **111 of the 492 statements, nearly a quarter, come out visibly broken**, either with red KaTeX errors or with raw `\begin{enumerate}` and `\item` sitting in the text. KaTeX renders math, and Putnam statements are small LaTeX documents. I wrote a 339-line translator for the parts that aren't math, shaped by a survey of what these 492 statements actually use, and with it every statement renders. This was a solo build.

## Why It Matters

The Putnam is the main undergraduate math competition in North America. It's 12 problems in two sessions, A1 to A6 and B1 to B6, and the numbering roughly tracks difficulty. People preparing for it usually work through old problems, and the standard source is Kedlaya's archive, which has one `.tex` file of problems and one of solutions per year.

That format is great for reading a whole year and bad for practice. If I want number theory problems at the easier end, from any year, I have to open 41 files and skim. I wanted the archive as a list I could filter. Show me combinatorics, difficulty 3 to 5, hide what I've solved. And because these are math problems, the statements have to render properly. A problem with half its formulas showing as source code is worse than no problem at all.

## Technical Details

### The Data

Each problem is one JSON record with its year, its label, a list of subjects, a difficulty and the statement as LaTeX.

```json
{
  "year": 1985,
  "problem": "A1",
  "category": ["combinatorics"],
  "difficulty": 3,
  "statement": "Determine, with proof, the number of ordered triples $(A_1, A_2, A_3)$ ..."
}
```

There are eight subjects. Analysis is the largest with 154 problems, then number theory with 147 and combinatorics with 132, down to abstract algebra with 25. A problem can carry more than one subject, so the counts add up to more than 492. The site also has a page for Miguel Lerma's list of 48 "easy" Putnam problems, and pages for three course problem-set collections (MIT 18.314, KAIST MAS210 and Berkeley Math 115) that I put next to the archive for the same practice routine.

### What Breaks

I measured the naive approach directly. Take every statement, find the math the way KaTeX's auto-render extension does (`$...$`, `$$...$$`, `\[...\]` and `\(...\)`), render each formula with KaTeX, and leave the rest as text. Two kinds of failure show up.

| Failure | Statements |
| --- | --- |
| A formula KaTeX can't parse (57 formulas) | 30 |
| Raw LaTeX commands left in the prose | 87 |
| Either one | 111 |

The formula failures come from two sources. Kedlaya's files define their own macros in the preamble, like `\RR` for the real numbers and `\FF` for a finite field, and the statements use them without the preamble. And the statements use `\mbox` and `\parbox`, which KaTeX doesn't define. The prose failures are LaTeX structure. `\begin{enumerate}` appears in 56 statements, `\item` in 33 and `\emph` in 27, and KaTeX never sees any of it because none of it is inside math.

## Implementation

### Macros From the Preamble

The simplest fixes are macros. KaTeX accepts a table of string macros, so Kedlaya's preamble definitions go in as they are, along with shims for the plain-TeX commands.

```ts
const MACROS: Record<string, string> = {
  "\\RR": "\\mathbb{R}",
  "\\FF": "\\mathbb{F}",
  "\\MM": "\\mathcal{M}",
  "\\bA": "\\mathbf{A}",
  "\\mbox": "\\text{#1}",
  // ...
};
```

`\parbox` can't be handled this way. `\parbox{2in}{if every block of zeros...}` needs to keep its second argument and throw away the first, and KaTeX works out a string macro's arguments from a leading `#1`, so a body of just `#2` gets expanded literally. So `\parbox`, `\multirow` and `\multicolumn` are rewritten before the formula reaches KaTeX, by reading their brace-delimited arguments and keeping only the one with content.

### Text Mode, Written by Hand

Everything outside math goes through a small scanner. It walks the string one character at a time. A `$` or `\[` starts math. A known text macro like `\emph` or `\textbf` reads its argument, renders the argument recursively and wraps it in a tag. Formatting commands like `\noindent` and `\medskip` are dropped. Anything else is prose, which gets HTML-escaped and then has its leftover markup translated, with `---` becoming a dash, ``` `` ``` and `''` becoming curly quotes, and blank lines becoming paragraph breaks.

Lists and tables are handled before the scanner runs. Each `enumerate`, `itemize`, `tabular` and display-math environment is rendered on its own and replaced by a placeholder, so the scanner never sees a half-finished block.

```ts
s = s.replace(/\\begin\{(enumerate|itemize)\}([\s\S]*?)\\end\{\1\}/g, (_m, env, body) =>
  stash(list(body, env === "enumerate")),
);
```

Putnam statements often use custom list markers, like `\item[(i)]`, and the list renderer keeps those, since a problem that later refers to "condition (ii)" needs its items to be labeled (ii).

### The Dollar Sign Problem

The bug that took longest was a formula ending early. Some statements put text inside math with `\mbox`, and the text itself contains math.

```latex
f(x) = \begin{cases} x & \mbox{if $x \leq e$} \\ ...
```

A scanner that looks for the next `$` to close the formula stops at the `$` before `x \leq e`, and the rest of the statement comes out scrambled. **The fix is to treat any brace group inside a formula as opaque.** When the scanner meets `{` while looking for the closing `$`, it skips to the matching `}` and keeps going, so dollar signs inside `\mbox{...}` never count.

### Building It Once

All of this runs at build time in Astro<sup>[[3]](#ref-3)</sup>. The data module renders every statement once and also builds a plain-text version with the LaTeX stripped out, so search matches words instead of markup.

```ts
export const ENTRIES: Entry[] = (raw as Problem[]).map((p) => ({
  ...p,
  id: `${p.year}-${p.problem}`,
  html: renderLatex(p.statement),
  haystack: searchable(p.statement),
}));
```

The browser gets static HTML and KaTeX's stylesheet, and the filters only toggle which entries are visible. If one formula ever does fail, the renderer prints it as code and keeps going instead of failing the build.

### Solved Problems on Every Device

Marking a problem solved writes to `localStorage` first, so the site works without an account. Signing in with GitHub or an email link through Supabase mirrors each toggle to a `solved` table, where row-level security restricts every user to their own rows. On sign-in, the browser and the account may each have progress the other lacks, so the site uploads whatever is only local and then keeps the union of both. If a write fails, the toggle is undone locally and the page says so, so the screen never claims something the database doesn't have.

Each statement can also be copied as its original LaTeX, by clicking it or with a button, which is handy for starting a write-up.

## Results

With the full pipeline, I ran the same check over all 492 statements. **No statement produces a KaTeX error, and none has `\begin`, `\end`, `\item`, `\emph` or `\textbf` left in its text.** The statements contain 3,369 formulas between the usual delimiters, plus the display-math environments that get rendered whole.

The lesson I took from it is about scope. I didn't write a LaTeX-to-HTML converter, which is a project people spend years on. **I wrote a converter for these 492 inputs, and the survey of what they actually use is what kept it to 339 lines.** Every macro in the tables is there because some statement uses it.

## What I Would Change

The renderer only knows the corpus it was built from. When the 2026 problems come out, I'll re-run the same check over the new statements before adding them, since a new problem could use a command none of the old ones did. Turning that check into a test that runs on every build would catch it automatically.

## References

<a id="ref-1"></a>1. Kiran Kedlaya. The William Lowell Putnam Mathematical Competition Problems and Solutions archive. [kskedlaya.org/putnam-archive](https://kskedlaya.org/putnam-archive/)

<a id="ref-2"></a>2. KaTeX. [katex.org](https://katex.org)

<a id="ref-3"></a>3. Astro. [astro.build](https://astro.build)
