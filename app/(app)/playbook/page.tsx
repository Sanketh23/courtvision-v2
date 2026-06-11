import Link from "next/link";
import type { ReactNode } from "react";
import { PlayThumbnail } from "@/features/play/court/PlayThumbnail";
import { fixturePlays } from "@/features/play/fixtures";
import { listPlays } from "@/features/play/queries";
import { PlaybookBrowse, type PlaybookItem } from "@/features/playbook";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { SignOutButton } from "./sign-out-button";

/**
 * The playbook (UI_WORKFLOWS §5 coach / §6 player). Server side does the
 * data work in 2 queries (membership+team, plays — budget is ≤3, ARCH §16);
 * filtering/search/sort run client-side over the fetched list.
 *
 * RLS scopes the rows: coaches get all team plays, players published only.
 * The route adapts play summaries into the playbook's view-model and
 * pre-renders thumbnails (features don't import features).
 */
export default async function PlaybookPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const user = await requireAuth();
  const supabase = await createClient();
  const { category } = await searchParams;

  const { data: membership } = await supabase
    .from("team_memberships")
    .select("team_id, role, teams ( name, invite_code )")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const team = membership?.teams as { name: string; invite_code: string } | null | undefined;
  const teamId = membership?.team_id;
  const role = membership?.role === "coach" ? ("coach" as const) : ("player" as const);
  const isCoach = role === "coach";

  const summaries = teamId ? await listPlays(supabase, teamId) : [];

  const items: PlaybookItem[] = summaries.map((play) => ({
    id: play.id,
    name: play.name,
    category: play.category,
    formation: play.formation,
    status: play.status,
    tags: play.tags,
    durationSeconds: play.durationSeconds,
    actionCount: play.actionCount,
    createdAt: play.createdAt,
    updatedAt: play.updatedAt,
  }));

  const thumbnails: Record<string, ReactNode> = Object.fromEntries(
    summaries.map((play) => [play.id, <PlayThumbnail key={play.id} data={play.data} />]),
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {/* Top bar (§5.2 — Team/Account nav arrives with their M9 screens) */}
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-primary">CourtVision</span>
          {team && (
            <span className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
              {team.name}
            </span>
          )}
          {!isCoach && <span className="text-sm text-muted-foreground">Playbook</span>}
        </div>
        <SignOutButton />
      </header>

      {/* Invite onboarding strip (§4.4 / §5.8) */}
      {isCoach && team && items.length === 0 && (
        <div
          data-testid="invite-strip"
          className="mb-6 rounded-md border border-accent bg-accent/50 px-4 py-3"
        >
          <p className="text-sm text-accent-foreground">
            Share this code with your players:{" "}
            <span data-testid="invite-code" className="font-mono font-semibold tracking-widest">
              {team.invite_code}
            </span>
          </p>
        </div>
      )}

      <PlaybookBrowse
        role={role}
        items={items}
        thumbnails={thumbnails}
        initialCategory={category ?? null}
      />

      {/* Sample plays: demo content while the playbook is empty (coaches). */}
      {isCoach && items.length === 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sample plays
          </h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {Object.values(fixturePlays).map((play) => (
              <li key={play.id}>
                <Link
                  href={`/play/${play.id}`}
                  className="block rounded-lg border border-border px-4 py-3 transition-colors hover:border-primary/50 hover:bg-accent/40"
                >
                  <span className="block font-medium">{play.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {play.formation ?? play.category} · {(play.duration / 1000).toFixed(1)}s
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
