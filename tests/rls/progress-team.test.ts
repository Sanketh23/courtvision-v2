import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spreadPr } from "@/features/play/fixtures";

/**
 * M9 RLS: play_progress isolation + team management (owner-removes-member,
 * roster RPC coach-gating). Against the local stack; skipped without env.
 */

const URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ready = Boolean(URL && ANON && SERVICE);
const d = ready ? describe : describe.skip;

d("M9 RLS: progress + team management", () => {
  let admin: SupabaseClient;
  const stamp = Date.now();
  const coach = { id: "", email: `m9-coach+${stamp}@example.com`, password: "password123" };
  const p1 = { id: "", email: `m9-p1+${stamp}@example.com`, password: "password123" };
  const p2 = { id: "", email: `m9-p2+${stamp}@example.com`, password: "password123" };
  let teamId: string;
  let playId: string;
  let p1MembershipId: string;

  async function signedIn(u: { email: string; password: string }) {
    const client = createClient(URL as string, ANON as string);
    await client.auth.signInWithPassword({ email: u.email, password: u.password });
    return client;
  }

  beforeAll(async () => {
    admin = createClient(URL as string, SERVICE as string, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    for (const u of [coach, p1, p2]) {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.email.split("+")[0] },
      });
      if (error) throw error;
      u.id = data.user.id;
    }
    const { data: team } = await admin
      .from("teams")
      .insert({
        name: "M9 Team",
        season: "2025-2026",
        owner_id: coach.id,
        invite_code: `M9${String(stamp).slice(-4)}`,
      })
      .select("id")
      .single();
    teamId = team?.id;
    const { data: memberships } = await admin
      .from("team_memberships")
      .insert([
        { team_id: teamId, user_id: coach.id, role: "coach" },
        { team_id: teamId, user_id: p1.id, role: "player" },
        { team_id: teamId, user_id: p2.id, role: "player" },
      ])
      .select("id, user_id");
    p1MembershipId = memberships?.find((m) => m.user_id === p1.id)?.id;

    const coachClient = await signedIn(coach);
    const { data: play } = await coachClient
      .from("plays")
      .insert({
        team_id: teamId,
        created_by: coach.id,
        name: "Studied Play",
        category: "offense",
        status: "published",
        data: { ...structuredClone(spreadPr) },
      })
      .select("id")
      .single();
    playId = play?.id;
  });

  afterAll(async () => {
    if (!ready) return;
    await admin.from("teams").delete().eq("id", teamId);
    for (const u of [coach, p1, p2]) await admin.auth.admin.deleteUser(u.id);
  });

  it("a player marks a play studied; another player can't see that row", async () => {
    const c1 = await signedIn(p1);
    const { error } = await c1.from("play_progress").insert({ play_id: playId, user_id: p1.id });
    expect(error).toBeNull();

    const c2 = await signedIn(p2);
    const { data: othersView } = await c2.from("play_progress").select("*").eq("play_id", playId);
    expect(othersView ?? []).toHaveLength(0); // RLS hides p1's progress from p2

    const { data: ownView } = await c1.from("play_progress").select("*").eq("play_id", playId);
    expect(ownView).toHaveLength(1);
  });

  it("a player cannot forge progress for another user", async () => {
    const c1 = await signedIn(p1);
    const { error } = await c1.from("play_progress").insert({ play_id: playId, user_id: p2.id });
    expect(error).not.toBeNull();
  });

  it("the roster RPC returns members for a coach, ordered coach-first", async () => {
    const coachClient = await signedIn(coach);
    const { data, error } = await coachClient.rpc("get_team_members", { p_team_id: teamId });
    expect(error).toBeNull();
    expect(data).toHaveLength(3);
    expect(data?.[0]?.role).toBe("coach");
    expect(data?.[0]?.email).toBeTruthy(); // names/emails from auth.users
  });

  it("the roster RPC rejects a non-coach", async () => {
    const playerClient = await signedIn(p1);
    const { error } = await playerClient.rpc("get_team_members", { p_team_id: teamId });
    expect(error?.message).toMatch(/Only a coach/);
  });

  it("a player cannot remove another member", async () => {
    const c2 = await signedIn(p2);
    await c2.from("team_memberships").delete().eq("id", p1MembershipId);
    const { count } = await admin
      .from("team_memberships")
      .select("*", { count: "exact", head: true })
      .eq("id", p1MembershipId);
    expect(count).toBe(1); // still there
  });

  it("the owner can remove a player but not themselves", async () => {
    const coachClient = await signedIn(coach);

    // Self-removal is blocked by the owner-removes-members policy.
    const coachMembership = await admin
      .from("team_memberships")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", coach.id)
      .single();
    await coachClient.from("team_memberships").delete().eq("id", coachMembership.data?.id);
    const stillCoach = await admin
      .from("team_memberships")
      .select("*", { count: "exact", head: true })
      .eq("id", coachMembership.data?.id);
    expect(stillCoach.count).toBe(1);

    // Removing a player succeeds.
    await coachClient.from("team_memberships").delete().eq("id", p1MembershipId);
    const removed = await admin
      .from("team_memberships")
      .select("*", { count: "exact", head: true })
      .eq("id", p1MembershipId);
    expect(removed.count).toBe(0);
  });
});
