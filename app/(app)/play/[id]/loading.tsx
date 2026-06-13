/** Court canvas loading state (UI_WORKFLOWS §13.1: "Loading play…"). */
export default function PlayLoading() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6" aria-busy="true">
      <div className="mb-4 h-5 w-24 animate-pulse rounded bg-secondary" />
      <div className="mb-4 h-7 w-56 animate-pulse rounded bg-secondary" />
      <div className="flex aspect-[100/94] w-full max-w-xl items-center justify-center rounded-lg border border-border bg-secondary/30">
        <p className="text-sm text-muted-foreground">Loading play…</p>
      </div>
    </main>
  );
}
