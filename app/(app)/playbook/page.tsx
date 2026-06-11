import Link from "next/link";
import { fixturePlays } from "@/features/play/fixtures";
import { listPlays } from "@/features/play/queries";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { SignOutButton } from "./sign-out-button";

/**
 * Playbook landing. The real browse/search/grid view is M7; for now this
 * lists the team's database plays (M4) plus the hand-authored sample plays,
 * and surfaces the invite code for coaches (UI_WORKFLOWS §4.4).
 *
 * RLS scopes which plays come back: coaches see all their team's plays,
 * players only published ones.
 */
export default async function PlaybookPage() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("team_memberships")
    .select("team_id, role, teams ( name, invite_code )")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const team = membership?.teams as { name: string; invite_code: string } | null | undefined;
  const teamId = membership?.team_id;
  const isCoach = membership?.role === "coach";

  const plays = teamId ? await listPlays(supabase, teamId) : [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-blue-600">CourtVision</span>
          {team && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
              {team.name}
            </span>
          )}
        </div>
        <SignOutButton />
      </header>

      {isCoach && team && (
        <div
          data-testid="invite-strip"
          className="mb-8 flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-4 py-3"
        >
          <p className="text-sm text-blue-900">
            Share this code with your players:{" "}
            <span data-testid="invite-code" className="font-mono font-semibold tracking-widest">
              {team.invite_code}
            </span>
          </p>
        </div>
      )}

      {/* Team plays from the database (M4). */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-500">Plays</h2>
          {isCoach && (
            <Link
              href="/play/new"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              + New play
            </Link>
          )}
        </div>

        {plays.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
            <p className="text-sm text-gray-600">
              {isCoach
                ? "No plays yet. Add a sample play to see it animate, or wait for the editor."
                : "Your coach hasn't published any plays yet. Check back soon."}
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-3">
            {plays.map((play) => (
              <li
                key={play.id}
                className="rounded-lg border border-gray-200 transition-colors hover:border-blue-300"
              >
                <Link href={`/play/${play.id}`} className="block px-4 py-3 hover:bg-blue-50">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-900">{play.name}</span>
                    <StatusPill status={play.status} />
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    {play.formation ?? play.category} · {play.durationSeconds.toFixed(1)}s
                  </span>
                </Link>
                {isCoach && (
                  <Link
                    href={`/play/${play.id}/edit`}
                    className="block border-t border-gray-100 px-4 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                  >
                    Edit
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Hand-authored fixtures, always available as a demo of the viewer. */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-gray-500">Sample plays</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {Object.values(fixturePlays).map((play) => (
            <li key={play.id}>
              <Link
                href={`/play/${play.id}`}
                className="block rounded-lg border border-gray-200 px-4 py-3 transition-colors hover:border-blue-300 hover:bg-blue-50"
              >
                <span className="block font-medium text-gray-900">{play.name}</span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  {play.formation ?? play.category} · {(play.duration / 1000).toFixed(1)}s
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function StatusPill({ status }: { status: "draft" | "published" | "archived" }) {
  const styles = {
    draft: "bg-amber-100 text-amber-800",
    published: "bg-green-100 text-green-800",
    archived: "bg-gray-100 text-gray-600",
  } as const;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}
