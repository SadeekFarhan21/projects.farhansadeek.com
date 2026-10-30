"use client";

import { useState, useTransition } from "react";
import { deleteFlight } from "@/app/actions";

export default function DeleteFlightButton({
  id,
  flightNumber,
}: {
  id: string;
  flightNumber: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      await deleteFlight(id);
    });
  }

  return (
    <>
      {confirming && !pending && (
        <button
          type="button"
          onClick={() => setConfirming(false)}
          aria-label="Cancel delete"
          className="fixed inset-0 z-30 cursor-default bg-black/40 backdrop-blur-sm"
        />
      )}
      <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end gap-2 lg:bottom-8">
        {confirming && (
          <div className="animate-pop-in rounded-2xl border border-white/10 bg-[var(--bg)] px-4 py-3 text-sm text-neutral-100 shadow-2xl">
            Delete <span className="font-semibold">{flightNumber}</span> from history?
          </div>
        )}
        <button
          type="button"
          onClick={onClick}
          disabled={pending}
          aria-label={confirming ? "Confirm delete flight" : "Delete flight"}
          className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg transition-all duration-200 active:scale-95 ${
            confirming
              ? "bg-[var(--danger)] hover:brightness-110"
              : "bg-[var(--danger)]/90 hover:scale-105 hover:bg-[var(--danger)]"
          } disabled:opacity-60`}
        >
          {pending ? <Spinner /> : confirming ? <CheckIcon /> : <TrashIcon />}
        </button>
      </div>
    </>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M10 11v7M14 11v7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}

function Spinner() {
  return (
    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
  );
}
