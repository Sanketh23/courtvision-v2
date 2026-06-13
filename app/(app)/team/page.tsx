import Link from "next/link";
import { redirect } from "next/navigation";
import { getTeamMembersAction } from "@/features/team/actions";
import { TeamManagement } from "@/features/team/components/TeamManagement";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Team management (UI_WORKFLOWS §11). Coach-only; players are sent back to
 * the playbook.
 */
export default async function TeamPage() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("team_memberships")
    .select("team_id, role, teams ( id, name, season, level, invite_code )")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership?.role !== "coach") redirect("/playbook");

  const team = membership.teams as unknown as {
    id: string;
    name: string;
    season: string;
    level: string | null;
    invite_code: string;
  };
  const members = await getTeamMembersAction(membership.team_id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/playbook" className="text-sm text-muted-foreground hover:text-foreground">
            ← Playbook
          </Link>
          <h1 className="mt-1 text-xl font-semibold">Team</h1>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-sm">{team.season}</span>
      </div>

      <TeamManagement
        team={{
          id: team.id,
          name: team.name,
          season: team.season,
          level: team.level,
          inviteCode: team.invite_code,
        }}
        members={members}
        currentUserId={user.id}
      />
    </main>
  );
}
