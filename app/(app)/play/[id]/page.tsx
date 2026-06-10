import Link from "next/link";
import { notFound } from "next/navigation";
import { fixturePlays } from "@/features/play/fixtures";
import { PlayViewer } from "@/features/play/viewer";

/**
 * The play viewer route (UI_WORKFLOWS.md §8–§9).
 *
 * M3: plays come from the hand-authored fixtures, not the database —
 * persistence is M4 (ROADMAP.md §6 "explicitly not included"). The id
 * segment looks up a fixture; unknown ids 404.
 */
export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const play = fixturePlays[id];
  if (!play) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Link
        href="/playbook"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M19 12H5m0 0l7 7m-7-7l7-7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Playbook
      </Link>
      <PlayViewer play={play} />
    </main>
  );
}
