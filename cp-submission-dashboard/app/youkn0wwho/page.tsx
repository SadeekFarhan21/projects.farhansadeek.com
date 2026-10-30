import type { Metadata } from "next";
import Nav from "../Nav";
import { youkn0wwho } from "../../lib/youkn0wwho";
import TopicTable from "./TopicTable";

export const metadata: Metadata = {
  title: "YouKn0wWho Topic List",
  description: "YouKn0wWho's competitive programming topic list with solved problems marked.",
};

const { problems, topics } = youkn0wwho;
const starredOnly = problems.filter((p) => p.starred);
const summary = [
  `${problems.length.toLocaleString()} problems`,
  `${starredOnly.length.toLocaleString()} starred`,
  `${Object.keys(topics).length.toLocaleString()} topics`,
  `${problems.filter((p) => p.solved).length.toLocaleString()} solved`,
].join(" · ");

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M10 3v10m0 0-4-4m4 4 4-4M4 16h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function YouKn0wWhoPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      <Nav current="/youkn0wwho" />
      <header className="mb-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-white">YouKn0wWho Topic List</h1>
          {/* <details> gives a dropdown without client JS. */}
          <details className="group relative">
            <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-sm font-medium text-neutral-300 ring-1 ring-inset ring-white/10 transition hover:bg-white/5 hover:text-white [&::-webkit-details-marker]:hidden">
              <DownloadIcon />
              Export
              <span className="text-[10px] text-neutral-500 transition group-open:rotate-180">▾</span>
            </summary>
            <div className="absolute right-0 z-30 mt-2 w-36 overflow-hidden rounded-lg border border-white/10 bg-[#141416] py-1 shadow-xl">
              {[
                { href: "/youkn0wwho.txt", label: "Text" },
                { href: "/youkn0wwho.csv", label: "CSV" },
                { href: "/youkn0wwho.json", label: "JSON" },
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
          Problems from{" "}
          <a href={youkn0wwho.source} target="_blank" rel="noreferrer" className="underline decoration-white/30 underline-offset-4 hover:text-white">
            YouKn0wWho&apos;s topic list
          </a>
          , ordered by category and topic, with the ones I&apos;ve solved marked.
        </p>
        <p className="mt-1 text-xs tabular-nums text-neutral-500">{summary}</p>
      </header>
      <TopicTable problems={problems} topics={topics} />
    </main>
  );
}
