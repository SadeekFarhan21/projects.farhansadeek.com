export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center"
    >
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
