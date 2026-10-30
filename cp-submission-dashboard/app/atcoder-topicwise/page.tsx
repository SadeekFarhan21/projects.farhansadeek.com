import type { Metadata } from "next";
import Nav from "../Nav";
import { atcoderTopicwise } from "../../lib/atcoder-topicwise";
import AtCoderTable from "./AtCoderTable";

export const metadata: Metadata = {
  title: "AtCoder Topicwise",
  description: "AtCoder ABC, ARC, and AGC problems grouped by topic, with solved problems marked.",
};

const { problems, topics } = atcoderTopicwise;
const summary = [
  `${problems.length.toLocaleString()} problems`,
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

export default function AtCoderTopicwisePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      <Nav current="/atcoder-topicwise" />
      <header className="mb-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-white">AtCoder Topicwise</h1>
          {/* <details> gives a dropdown without client JS. */}
          <details className="group relative">
            <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-sm font-medium text-neutral-300 ring-1 ring-inset ring-white/10 transition hover:bg-white/5 hover:text-white [&::-webkit-details-marker]:hidden">
              <DownloadIcon />
              Export
              <span className="text-[10px] text-neutral-500 transition group-open:rotate-180">▾</span>
            </summary>
            <div className="absolute right-0 z-30 mt-2 w-36 overflow-hidden rounded-lg border border-white/10 bg-[#141416] py-1 shadow-xl">
              {[
                { href: "/atcoder-topicwise.txt", label: "Text" },
                { href: "/atcoder-topicwise.csv", label: "CSV" },
                { href: "/atcoder-topicwise.json", label: "JSON" },
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
          AtCoder problems sorted into topics by{" "}
          <a href={atcoderTopicwise.source} target="_blank" rel="noreferrer" className="underline decoration-white/30 underline-offset-4 hover:text-white">
            AtCoder Categories
          </a>
          , easy to hard within each topic, with the ones I&apos;ve solved marked.
        </p>
        <p className="mt-1 text-xs tabular-nums text-neutral-500">{summary}</p>
      </header>
      <AtCoderTable problems={problems} topics={topics} />
    </main>
  );
}
