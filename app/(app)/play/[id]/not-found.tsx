import Link from "next/link";

/** 404 for plays (UI_WORKFLOWS §13.5). */
export default function PlayNotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-lg font-semibold">Play not found</h1>
      <p className="text-sm text-muted-foreground">
        It may have been deleted, or you may not have access to it.
      </p>
      <Link
        href="/playbook"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Back to playbook
      </Link>
    </main>
  );
}
