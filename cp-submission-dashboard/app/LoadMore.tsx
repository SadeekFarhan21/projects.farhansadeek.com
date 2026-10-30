"use client";

import { useEffect, useRef } from "react";

// Loads the next page as the end of the list scrolls into view. The button stays as a fallback
// for keyboard users and for browsers without IntersectionObserver.
export default function LoadMore({ shown, total, onMore }: { shown: number; total: number; onMore: () => void }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const more = useRef(onMore);
  useEffect(() => {
    more.current = onMore;
  });

  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    // Start loading a screen early so rows are there before the reader reaches the end.
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && more.current(), {
      rootMargin: "0px 0px 800px 0px",
    });
    observer.observe(node);
    return () => observer.disconnect();
    // Re-observe after each page: if the sentinel is still in view, that fires again and keeps filling.
  }, [shown]);

  if (shown >= total) return null;
  return (
    <div ref={sentinel} className="mt-6 flex flex-col items-center gap-2">
      <button
        onClick={onMore}
        className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-200 ring-1 ring-inset ring-white/15 transition hover:bg-white/5 hover:ring-white/25"
      >
        Show more
      </button>
      <span className="text-xs tabular-nums text-neutral-500">
        Showing {shown.toLocaleString()} of {total.toLocaleString()}
      </span>
    </div>
  );
}
