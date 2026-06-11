import Link from "next/link";
import { fixturePlays } from "@/features/play/fixtures";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { SignOutButton } from "./sign-out-button";

/**
 * M1 playbook placeholder. The real playbook (browse/search/grid) is M7.
 * For M1 this confirms the authed + team-scoped landing and surfaces the
 * invite code so a coach can share it (UI_WORKFLOWS §4.4).
 */
export default async function PlaybookPage() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("team_memberships")
    .select("role, teams ( name, invite_code )")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const team = membership?.teams as { name: string; invite_code: string } | null | undefined;
  const role = membership?.role;
  const isCoach = role === "coach";

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

      {/* M3 preview: fixture plays demonstrate the animated viewer until
          real persistence (M4) and the playbook browse view (M7) land. */}
      <section className="mb-8">
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

      <div className="rounded-lg border border-dashed border-gray-300 py-20 text-center">
        <h1 className="mb-2 text-xl font-semibold text-gray-900">
          {isCoach ? "Your playbook is empty" : "No plays yet"}
        </h1>
        <p className="text-sm text-gray-600">
          {isCoach
            ? "Creating plays comes next. The editor lands in a later milestone."
            : "Your coach hasn't published any plays yet. Check back soon."}
        </p>
      </div>
    </main>
  );
}
