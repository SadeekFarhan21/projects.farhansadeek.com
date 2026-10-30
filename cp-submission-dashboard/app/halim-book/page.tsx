import type { Metadata } from "next";
import Nav from "../Nav";
import { halimBook } from "../../lib/halim-book";
import HalimBookTable from "./HalimBookTable";

export const metadata: Metadata = {
  title: "Halim Book Problems",
  description: "Starred problems from Steven Halim's Competitive Programming 4 and 5 across UVa, Kattis, and LeetCode.",
};

const summary = [
  `${halimBook.length.toLocaleString()} problems`,
  ...["UVa", "Kattis", "LeetCode"].map(
    (judge) => `${halimBook.filter((p) => p.judge === judge).length.toLocaleString()} ${judge}`
  ),
  `${halimBook.filter((p) => p.solved).length.toLocaleString()} solved`,
].join(" · ");

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M10 3v10m0 0-4-4m4 4 4-4M4 16h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HalimBookPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      <Nav current="/halim-book" />
      <header className="mb-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Halim Book Problems</h1>
          {/* <details> gives a dropdown without client JS. */}
          <details className="group relative">
            <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-sm font-medium text-neutral-300 ring-1 ring-inset ring-white/10 transition hover:bg-white/5 hover:text-white [&::-webkit-details-marker]:hidden">
              <DownloadIcon />
              Export
              <span className="text-[10px] text-neutral-500 transition group-open:rotate-180">▾</span>
            </summary>
            <div className="absolute right-0 z-30 mt-2 w-36 overflow-hidden rounded-lg border border-white/10 bg-[#141416] py-1 shadow-xl">
              {[
                { href: "/halim-book.txt", label: "Text" },
                { href: "/halim-book.csv", label: "CSV" },
                { href: "/halim-book.json", label: "JSON" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block px-3 py-2 text-sm text-neutral-300 transition hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </details>
        </div>
        <p className="mt-1 text-sm text-neutral-400">
          Starred practice problems from Competitive Programming 4 and 5 (Steven Halim), organized by chapter, section, judge, and difficulty.
        </p>
        <p className="mt-1 text-xs tabular-nums text-neutral-500">{summary}</p>
      </header>
      <HalimBookTable problems={halimBook} />
    </main>
  );
}
