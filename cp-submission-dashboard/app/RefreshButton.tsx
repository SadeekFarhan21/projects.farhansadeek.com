"use client";

import { useEffect, useState } from "react";

type RefreshState = "idle" | "running" | "success" | "failure";

export default function RefreshButton() {
  const [state, setState] = useState<RefreshState>("success");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!startedAt) return;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const response = await fetch(`/api/refresh/status?after=${startedAt}`, {
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Unable to check refresh status.");
        if (cancelled) return;

        if (result.status === "success") {
          setState("success");
          setMessage(null);
          setStartedAt(null);
          return;
        }
        if (result.status === "failure") {
          setState("failure");
          setMessage("Refresh failed");
          setStartedAt(null);
          return;
        }
        timeout = setTimeout(poll, 3000);
      } catch (error) {
        if (cancelled) return;
        setState("failure");
        setMessage(error instanceof Error ? error.message : "Unable to check refresh status.");
        setStartedAt(null);
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [startedAt]);

  async function refresh() {
    setState("running");
    setMessage(null);
    try {
      const response = await fetch("/api/refresh", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Refresh failed.");
      setStartedAt(result.startedAt ?? Date.now());
    } catch (error) {
      setState("failure");
      setMessage(error instanceof Error ? error.message : "Refresh failed.");
    }
  }

  const running = state === "running";
  const label = state === "failure" ? "Refresh failed" : "Refreshed";

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs ${state === "failure" ? "text-red-400" : "text-neutral-500"}`}>
        {running ? (
          <span className="inline-flex items-center gap-1" aria-label="Refresh in progress">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:240ms]" />
          </span>
        ) : label}
      </span>
      <button
        type="button"
        onClick={refresh}
        disabled={running}
        aria-label="Refresh submissions"
        title="Refresh submissions"
        className="rounded-md border border-neutral-700 bg-neutral-900 p-2 text-neutral-300 transition-colors hover:border-emerald-600 hover:text-white disabled:cursor-wait disabled:opacity-60"
      >
        <svg
          aria-hidden="true"
          className={`h-4 w-4 ${running ? "animate-spin" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20 11a8.1 8.1 0 0 0-14.9-4L3 10" />
          <path d="M3 4v6h6" />
          <path d="M4 13a8.1 8.1 0 0 0 14.9 4L21 14" />
          <path d="M21 20v-6h-6" />
        </svg>
      </button>
      {message && state !== "failure" && <span className="text-xs text-neutral-500">{message}</span>}
    </div>
  );
}
