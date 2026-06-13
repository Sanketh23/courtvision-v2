/** Playbook loading skeleton (UI_WORKFLOWS §13.1). */
export default function PlaybookLoading() {
  return (
    <main className="mx-auto max-w-6xl animate-pulse px-4 py-6 sm:px-6" aria-busy="true">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-7 w-44 rounded bg-secondary" />
        <div className="h-7 w-32 rounded bg-secondary" />
      </div>
      <div className="mb-5 h-8 w-72 rounded bg-secondary" />
      <div className="grid grid-cols-1 gap-4 min-[800px]:grid-cols-2 min-[1100px]:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-48 rounded-lg border border-border bg-secondary/40" />
        ))}
      </div>
    </main>
  );
}
