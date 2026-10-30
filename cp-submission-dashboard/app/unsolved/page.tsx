import type { Metadata } from "next";
import Nav from "../Nav";
import UnsolvedList from "../UnsolvedList";
import { getUnsolvedProblems } from "../../lib/unsolved";

export const metadata: Metadata = {
  title: "Unsolved Problems",
  description: "Problems attempted on any judge that never got an accepted verdict.",
};

export default function UnsolvedPage() {
  const problems = getUnsolvedProblems();
  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      <Nav current="/unsolved" />
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Unsolved Problems</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Problems I attempted but never got accepted, most recent attempt first
        </p>
      </header>
      <UnsolvedList problems={problems} />
    </main>
  );
}
