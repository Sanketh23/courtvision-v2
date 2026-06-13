/** Team page loading skeleton (UI_WORKFLOWS §13.1). */
export default function TeamLoading() {
  return (
    <main className="mx-auto max-w-3xl animate-pulse px-4 py-6 sm:px-6" aria-busy="true">
      <div className="mb-6 h-7 w-32 rounded bg-secondary" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="mb-6 h-36 rounded-lg border border-border bg-secondary/40" />
      ))}
    </main>
  );
}
