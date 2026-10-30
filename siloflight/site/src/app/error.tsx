"use client";

import { useEffect } from "react";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-zinc-100">Something went wrong</h1>
      <p className="text-sm text-zinc-400">
        We hit an unexpected error. The team has been notified.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-white/10 px-5 py-2 text-sm text-zinc-100 transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent,white)]"
      >
        Try again
      </button>
    </main>
  );
}
