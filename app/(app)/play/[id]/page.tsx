import Link from "next/link";
import { notFound } from "next/navigation";
import { fixturePlays } from "@/features/play/fixtures";
import { getPlay } from "@/features/play/queries";
import type { Play } from "@/features/play/schemas";
import { PlayViewer } from "@/features/play/viewer";
import { MarkStudied } from "@/features/play/viewer/components/MarkStudied";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * The play viewer route (UI_WORKFLOWS.md §8–§9).
 *
 * M4: a play is loaded from the database by id, validated against the Zod
 * schema in getPlay(). The hand-authored fixtures from M3 are kept as a
 * fallback so the sample plays still work without seeding the database;
 * a database play renders identically to a fixture (M4 DoD). RLS decides
 * whether the caller may see a given database play.
 */
export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const supabase = await createClient();

  let play: Play | null = null;
  let isDbPlay = true;
  try {
    play = await getPlay(supabase, id);
  } catch {
    // Non-UUID ids (e.g. the fixture "play_001") make Postgres throw on the
    // uuid comparison; fall through to the fixture lookup below.
    play = null;
  }
  if (!play) {
    play = fixturePlays[id] ?? null;
    isDbPlay = false;
  }

  if (!play) notFound();

  // Players get the "Mark studied" footer (§8.7) on real plays only.
  const { data: membership } = await supabase
    .from("team_memberships")
    .select("role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const isPlayer = membership?.role === "player";

  let isStudied = false;
  if (isPlayer && isDbPlay) {
    const { data: progress } = await supabase
      .from("play_progress")
      .select("id")
      .eq("play_id", id)
      .maybeSingle();
    isStudied = Boolean(progress);
  }

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
      {isPlayer && isDbPlay && (
        <div className="mt-6">
          <MarkStudied playId={id} initialStudied={isStudied} />
        </div>
      )}
    </main>
  );
}
