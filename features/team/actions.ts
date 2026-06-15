"use server";

import { redirect } from "next/navigation";
import { generateInviteCode } from "@/features/team/invite-code";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Team management server actions (UI_WORKFLOWS §11). RLS is the gate for
 * every write: only the team owner can update/delete the team or remove
 * members, so these functions don't re-check roles (CLAUDE.md guardrail #4).
 */

export type TeamMember = {
  membershipId: string;
  userId: string;
  fullName: string;
  email: string;
  role: "coach" | "player";
  joinedAt: string;
};

/** Roster for the coach-only team page (names come via SECURITY DEFINER). */
export async function getTeamMembersAction(teamId: string): Promise<TeamMember[]> {
  await requireAuth();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_team_members", { p_team_id: teamId });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    membershipId: row.membership_id,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    role: row.role as TeamMember["role"],
    joinedAt: row.joined_at,
  }));
}

/** Edit team info (§11.2). */
export async function updateTeamAction(input: {
  teamId: string;
  name: string;
  season: string;
  level: string | null;
}): Promise<void> {
  await requireAuth();
  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ name: input.name, season: input.season, level: input.level })
    .eq("id", input.teamId);
  if (error) throw new Error(error.message);
}

/**
 * Regenerate the invite code (§11.2): the old code stops working
 * immediately. Retries on the (unlikely) unique-collision.
 */
export async function regenerateInviteCodeAction(teamId: string): Promise<{ code: string }> {
  await requireAuth();
  const supabase = await createClient();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    const { error } = await supabase.from("teams").update({ invite_code: code }).eq("id", teamId);
    if (!error) return { code };
    if (!error.message.includes("duplicate")) throw new Error(error.message);
  }
  throw new Error("Could not generate a unique invite code; try again.");
}

/** Remove a member (§11.3). RLS forbids removing the owner. */
export async function removeMemberAction(membershipId: string): Promise<void> {
  await requireAuth();
  const supabase = await createClient();
  const { error } = await supabase.from("team_memberships").delete().eq("id", membershipId);
  if (error) throw new Error(error.message);
}

/**
 * Delete the team (§11.4 danger zone). Plays, memberships, and versions
 * cascade in the database. The coach lands back on /welcome.
 */
export async function deleteTeamAction(teamId: string): Promise<void> {
  await requireAuth();
  const supabase = await createClient();
  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) throw new Error(error.message);
  redirect("/welcome");
}
