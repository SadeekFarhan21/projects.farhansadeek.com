import katex from "katex";

/**
 * Renders the Putnam archive's LaTeX statements to HTML at build time.
 *
 * The corpus is narrow and known: inline/display math, a handful of amsmath
 * environments, enumerate/itemize, light text markup, and four problems
 * carrying figures. Everything below is driven by an actual survey of the
 * 492 statements rather than by general LaTeX coverage.
 */

const NUL = String.fromCharCode(0);
const FIG = NUL + "FIG" + NUL;
// A paragraph break, resolved by whoever owns the surrounding element: the top
// level is inside a <p> and can close it, a list item or table cell is not.
const PAR = NUL + "P" + NUL;

// Kedlaya's preamble macros, lifted from the source .tex files, plus shims for
// the plain-TeX and layout commands KaTeX does not implement.
const MACROS: Record<string, string> = {
  "\\RR": "\\mathbb{R}",
  "\\Z": "\\mathbb{Z}",
  "\\FF": "\\mathbb{F}",
  "\\MM": "\\mathcal{M}",
  "\\bA": "\\mathbf{A}",
  "\\bB": "\\mathbf{B}",
  "\\cal": "\\mathcal",
  "\\mbox": "\\text{#1}",
  "\\textsuperscript": "^{\\text{#1}}",
};

/**
 * Layout macros that KaTeX cannot express as string macros: it infers a
 * macro's arity from a leading #1, so a body that keeps only a later argument
 * (\parbox -> #2) would be expanded literally. These are rewritten before the
 * formula reaches KaTeX. Value is the index of the argument to keep.
 */
const MATH_LAYOUT_MACROS: Record<string, { args: number; keep: number; asText: boolean }> = {
  parbox: { args: 2, keep: 1, asText: true },
  multirow: { args: 3, keep: 2, asText: true },
  multicolumn: { args: 3, keep: 2, asText: false },
};

// Environments KaTeX renders natively as display math.
const MATH_ENVS = [
  "align*", "align", "gather*", "gather", "equation*", "equation",
  "eqnarray*", "eqnarray", "aligned", "gathered",
];

/**
 * Text-mode macros. `keep` is the index of the argument that carries the
 * content; the others are layout parameters (widths, spans) and are dropped.
 */
const TEXT_MACROS: Record<string, { args: number; keep: number; open?: string; close?: string }> = {
  emph: { args: 1, keep: 0, open: "<em>", close: "</em>" },
  textit: { args: 1, keep: 0, open: "<em>", close: "</em>" },
  textbf: { args: 1, keep: 0, open: "<strong>", close: "</strong>" },
  textsuperscript: { args: 1, keep: 0, open: "<sup>", close: "</sup>" },
  footnote: { args: 1, keep: 0, open: '<span class="tex-note">[', close: "]</span>" },
  text: { args: 1, keep: 0 },
  mbox: { args: 1, keep: 0 },
  textrm: { args: 1, keep: 0 },
  parbox: { args: 2, keep: 1 },
  multirow: { args: 3, keep: 2 },
  multicolumn: { args: 3, keep: 2 },
};

// Control words that stand alone in text mode.
const TEXT_ATOMS: Record<string, string> = {
  colon: ":", ldots: "…", dots: "…", cdots: "⋯",
  quad: " ", qquad: "  ", ", ": " ",
};

const DROP_ATOMS = new Set([
  "noindent", "medskip", "smallskip", "bigskip", "em", "rm", "bf", "it",
  "thinlines", "thicklines", "centering", "par", "hline", "makeatletter",
  "makeatother", "begingroup", "endgroup", "selectfont", "reset@font",
]);

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Rewrites layout macros KaTeX cannot take as string macros. */
function preMath(tex: string): string {
  let out = "";
  let i = 0;
  while (i < tex.length) {
    const m = tex.slice(i).match(/^\\([a-zA-Z]+)/);
    if (m && MATH_LAYOUT_MACROS[m[1]]) {
      const spec = MATH_LAYOUT_MACROS[m[1]];
      let j = i + m[0].length;
      const args: string[] = [];
      let ok = true;
      for (let a = 0; a < spec.args; a++) {
        while (tex[j] === " " || tex[j] === "\n") j++;
        const read = readArg(tex, j);
        if (!read) { ok = false; break; }
        args.push(read[0]);
        j = read[1];
      }
      if (ok) {
        const kept = preMath(args[spec.keep]);
        out += spec.asText ? `\\text{${kept}}` : kept;
        i = j;
        continue;
      }
    }
    if (tex[i] === "\\") { out += tex.slice(i, i + 2); i += 2; continue; }
    out += tex[i];
    i++;
  }
  return out;
}

function math(tex: string, display: boolean): string {
  try {
    return katex.renderToString(preMath(tex).trim(), {
      displayMode: display,
      throwOnError: false,
      strict: false,
      trust: true,
      macros: MACROS,
    });
  } catch {
    // Never let one malformed formula take down a build.
    return `<code class="tex-raw">${esc(tex)}</code>`;
  }
}

/** Reads a brace-delimited argument starting at `i` (which must point at "{"). */
function readArg(src: string, i: number): [string, number] | null {
  if (src[i] !== "{") return null;
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === "\\") { j++; continue; }
    if (src[j] === "{") depth++;
    else if (src[j] === "}") {
      depth--;
      if (depth === 0) return [src.slice(i + 1, j), j + 1];
    }
  }
  return null;
}

/** Plain prose: escape, then translate the residual markup. */
function prose(raw: string): string {
  let s = esc(raw);
  s = s.replace(/\\\\\s*/g, "<br>");
  s = s.replace(/\\ /g, " ").replace(/~/g, " ");
  s = s.replace(/\\[%$&#_{}]/g, (m) => m[1]);
  s = s.replace(/---/g, "—").replace(/--/g, "–");
  s = s.replace(/``/g, "“").replace(/''/g, "”");
  // Collapse source wrapping to single spaces but never trim the ends: a run of
  // prose sits between formulas, and its edge spaces are the word gaps around
  // them ("Let $m_0$ and $n_0$" must not become "Let m_0 and n_0" run together).
  return s
    .split(/\n[ \t]*\n/)
    .map((p) => p.replace(/[ \t\n]+/g, " "))
    .join(PAR);
}

/**
 * Resolves paragraph breaks for a context that has no <p> of its own — a list
 * item or a table cell. Blank paragraphs at the edges are dropped rather than
 * left as stray markup.
 */
function contained(html: string): string {
  return html
    .split(PAR)
    .filter((part) => part.trim() !== "")
    .join("<br><br>");
}

/** Splits a run into math, text-macro and prose segments and renders each. */
function inline(src: string): string {
  let out = "";
  let buf = "";
  let i = 0;

  const flush = () => { if (buf) out += prose(buf); buf = ""; };

  while (i < src.length) {
    const ch = src[i];

    if (ch === "\\") {
      const next = src[i + 1];

      if (next === "[" || next === "(") {
        const display = next === "[";
        const end = src.indexOf(display ? "\\]" : "\\)", i + 2);
        if (end === -1) { buf += src.slice(i); break; }
        flush();
        out += math(src.slice(i + 2, end), display);
        i = end + 2;
        continue;
      }

      const name = src.slice(i + 1).match(/^[a-zA-Z@]+/)?.[0];
      if (name) {
        const macro = TEXT_MACROS[name];
        if (macro) {
          let j = i + 1 + name.length;
          const args: string[] = [];
          let ok = true;
          for (let a = 0; a < macro.args; a++) {
            while (src[j] === " " || src[j] === "\n") j++;
            const read = readArg(src, j);
            if (!read) { ok = false; break; }
            args.push(read[0]);
            j = read[1];
          }
          if (ok) {
            flush();
            out += (macro.open ?? "") + inline(args[macro.keep]) + (macro.close ?? "");
            i = j;
            continue;
          }
        }
        if (name in TEXT_ATOMS) { buf += TEXT_ATOMS[name]; i += 1 + name.length; continue; }
        if (DROP_ATOMS.has(name)) {
          i += 1 + name.length;
          while (src[i] === " ") i++;
          continue;
        }
      }

      buf += src.slice(i, i + 2);
      i += 2;
      continue;
    }

    if (ch === "$") {
      const display = src[i + 1] === "$";
      const delim = display ? "$$" : "$";
      let end = i + delim.length;
      while (end < src.length) {
        if (src[end] === "\\") { end += 2; continue; }
        // \mbox{... $k$ ...} inside a formula re-enters math mode; those inner
        // dollars must not be mistaken for this formula's closing delimiter.
        if (src[end] === "{") {
          const read = readArg(src, end);
          if (read) { end = read[1]; continue; }
        }
        if (src.startsWith(delim, end)) break;
        end++;
      }
      if (end >= src.length) { buf += src.slice(i); break; }
      flush();
      out += math(src.slice(i + delim.length, end), display);
      i = end + delim.length;
      continue;
    }

    buf += ch;
    i++;
  }

  flush();
  return out;
}

/** \item[(i)] Foo  ->  list items, preserving any custom marker. */
function list(body: string, ordered: boolean): string {
  const items = body
    .split(/\\item\b/)
    .slice(1)
    .map((p) => {
      const m = p.match(/^\s*\[([^\]]*)\]/);
      const content = contained(inline(m ? p.slice(m[0].length) : p).trim());
      return m
        ? `<li class="marked"><span class="marker">${contained(inline(m[1]))}</span><div>${content}</div></li>`
        : `<li><div>${content}</div></li>`;
    })
    .join("");
  const tag = ordered ? "ol" : "ul";
  return `<${tag} class="tex-list">${items}</${tag}>`;
}

function table(body: string): string {
  const rows = body
    .replace(/\\begin\{tabular\}\s*(\{[^}]*\})?/g, "")
    .replace(/\\end\{tabular\}/g, "")
    .replace(/\\hline/g, "")
    .split(/\\\\/)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => `<tr>${r.split("&").map((c) => `<td>${contained(inline(c.trim()))}</td>`).join("")}</tr>`)
    .join("");
  return `<div class="tex-table-wrap"><table class="tex-table">${rows}</table></div>`;
}

const FIGURE_NOTE =
  '<p class="tex-figure-note">[ Figure omitted — see the original source for the diagram. ]</p>';

export function renderLatex(src: string): string {
  let s = src;

  // Drop picture environments; they are TeX drawing primitives, not content.
  // Where a figure sits inside display math, the whole display goes with it —
  // otherwise the sentinel would be handed to KaTeX as if it were a formula.
  s = s.replace(/\\\[[\s\S]*?\\\]/g, (m) =>
    /\\begin\{(tikzpicture|picture)\}/.test(m) ? FIG : m,
  );
  s = s.replace(/\\begin\{(tikzpicture|picture)\}[\s\S]*?\\end\{\1\}/g, FIG);

  // Unwrap containers that carry no meaning here.
  s = s.replace(/\\(?:begin|end)\{(?:center|verse|flushleft|flushright)\}/g, "\n\n");

  const blocks: string[] = [];
  const stash = (html: string) => {
    blocks.push(html);
    return NUL + "B" + (blocks.length - 1) + NUL;
  };

  s = s.replace(/\\begin\{tabular\}[\s\S]*?\\end\{tabular\}/g, (m) => stash(table(m)));

  for (const env of MATH_ENVS) {
    const e = env.replace("*", "\\*");
    s = s.replace(new RegExp(`\\\\begin\\{${e}\\}[\\s\\S]*?\\\\end\\{${e}\\}`, "g"), (m) =>
      stash(math(m, true)),
    );
  }

  s = s.replace(/\\begin\{(enumerate|itemize)\}([\s\S]*?)\\end\{\1\}/g, (_m, env, body) =>
    stash(list(body, env === "enumerate")),
  );
  // A few source problems open a list and never close it; run it to the end
  // rather than leaking a raw \begin into the page.
  s = s.replace(/\\begin\{(enumerate|itemize)\}([\s\S]*)$/g, (_m, env, body) =>
    stash(list(body, env === "enumerate")),
  );

  let html = `<p>${inline(s)}</p>`;
  html = html.replace(new RegExp(NUL + "B(\\d+)" + NUL, "g"), (_m, n) => `</p>${blocks[Number(n)]}<p>`);
  html = html.split(FIG).join(`</p>${FIGURE_NOTE}<p>`);
  html = html.split(PAR).join("</p><p>");
  html = html.replace(/<p>\s*<\/p>/g, "");
  return html;
}
