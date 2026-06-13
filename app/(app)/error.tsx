"use client";

/**
 * App-group error boundary (UI_WORKFLOWS §13.5): graceful message + a
 * retry path forward. Unexpected errors will also flow to Sentry in M10.
 */
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Couldn't load this page. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Retry
      </button>
    </main>
  );
}
