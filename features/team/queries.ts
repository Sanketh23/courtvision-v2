import { generateInviteCode } from "@/features/team/invite-code";
import type { Membership, Role, TeamSummary } from "@/features/team/types";
import { createClient } from "@/lib/supabase/client";

/**
 * Look up a team by invite code via the SECURITY DEFINER RPC. Returns null if
 * no team matches. Safe to call before the user is authenticated.
 */
export async function findTeamByCode(code: string): Promise<TeamSummary | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("find_team_by_code", {
    p_code: code.toUpperCase(),
  });
  const row = data?.[0];
  if (error || !row) return null;
  return { id: row.id, name: row.name };
}

/**
 * Create a team owned by the current user and insert their coach membership.
 *
 * The invite code is generated client-side and shown before submission
 * (UI_WORKFLOWS §4.3), then passed here to be committed. On a code collision
 * (unique violation) we generate a fresh code and retry once.
 */
export async function createTeam(input: {
  name: string;
  season: string;
  level?: string;
  inviteCode: string;
}): Promise<{ teamId: string; inviteCode: string; error: string | null }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { teamId: "", inviteCode: "", error: "Not authenticated." };
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const inviteCode = attempt === 0 ? input.inviteCode : generateInviteCode();
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        name: input.name,
        season: input.season,
        level: input.level ?? null,
        owner_id: user.id,
        invite_code: inviteCode,
      })
      .select("id, invite_code")
      .single();

    if (teamError) {
      // 23505 = unique_violation (invite_code collision) — retry with a new code.
      if (teamError.code === "23505" && attempt === 0) continue;
      return { teamId: "", inviteCode: "", error: teamError.message };
    }

    const { error: membershipError } = await supabase.from("team_memberships").insert({
      team_id: team.id,
      user_id: user.id,
      role: "coach",
    });
    if (membershipError) {
      return { teamId: "", inviteCode: "", error: membershipError.message };
    }

    return { teamId: team.id, inviteCode: team.invite_code, error: null };
  }

  return { teamId: "", inviteCode: "", error: "Could not generate a unique code. Try again." };
}

/**
 * Join a team as a player using an invite code. Requires the user to be
 * authenticated already.
 */
export async function joinTeamByCode(code: string): Promise<{ error: string | null }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const team = await findTeamByCode(code);
  if (!team) return { error: "Code not found. Check with your coach." };

  const { error } = await supabase.from("team_memberships").insert({
    team_id: team.id,
    user_id: user.id,
    role: "player",
  });
  if (error) {
    if (error.code === "23505") return { error: "You're already on this team." };
    return { error: error.message };
  }
  return { error: null };
}

/**
 * Returns the current user's first membership (v2 = one team per user), or null.
 */
export async function getCurrentMembership(): Promise<Membership | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("team_memberships")
    .select("id, team_id, user_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    teamId: data.team_id,
    userId: data.user_id,
    role: data.role as Role,
  };
}
