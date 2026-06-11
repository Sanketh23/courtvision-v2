import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spreadPr } from "@/features/play/fixtures";

/**
 * Plays RLS + the duration_seconds trigger (ROADMAP §7 DoD), verified
 * against the local Supabase stack. Skipped without env vars. To run:
 *   supabase start
 *   SUPABASE_URL=http://localhost:54321 \
 *   SUPABASE_ANON_KEY=<anon> SUPABASE_SERVICE_ROLE_KEY=<service> \
 *   pnpm vitest run tests/rls
 */

const URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ready = Boolean(URL && ANON && SERVICE);
const d = ready ? describe : describe.skip;

function playBody(overrides: Record<string, unknown>) {
  return { ...structuredClone(spreadPr), ...overrides };
}

d("RLS + triggers: plays", () => {
  let admin: SupabaseClient;
  const stamp = Date.now();
  const coach = { id: "", email: `plays-coach+${stamp}@example.com`, password: "password123" };
  const player = { id: "", email: `plays-player+${stamp}@example.com`, password: "password123" };
  const outsider = { id: "", email: `plays-out+${stamp}@example.com`, password: "password123" };
  let teamId: string;
  let otherTeamId: string;
  let draftId: string;
  let publishedId: string;
  let otherTeamPlayId: string;

  beforeAll(async () => {
    admin = createClient(URL as string, SERVICE as string, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    for (const u of [coach, player, outsider]) {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });
      if (error) throw error;
      u.id = data.user.id;
    }

    // Coach's team: coach + player. Outsider owns a separate team.
    const mkTeam = async (ownerId: string, code: string) => {
      const { data, error } = await admin
        .from("teams")
        .insert({ name: `Team ${code}`, season: "2025-2026", owner_id: ownerId, invite_code: code })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    };
    teamId = await mkTeam(coach.id, `PL${String(stamp).slice(-2)}A`);
    otherTeamId = await mkTeam(outsider.id, `PL${String(stamp).slice(-2)}B`);

    await admin.from("team_memberships").insert([
      { team_id: teamId, user_id: coach.id, role: "coach" },
      { team_id: teamId, user_id: player.id, role: "player" },
      { team_id: otherTeamId, user_id: outsider.id, role: "coach" },
    ]);

    const insertPlay = async (team: string, by: string, status: string, name: string) => {
      const { data, error } = await admin
        .from("plays")
        .insert({
          team_id: team,
          created_by: by,
          name,
          category: "offense",
          status,
          data: playBody({ name, status }),
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    };
    draftId = await insertPlay(teamId, coach.id, "draft", "Draft Play");
    publishedId = await insertPlay(teamId, coach.id, "published", "Published Play");
    otherTeamPlayId = await insertPlay(otherTeamId, outsider.id, "published", "Other Team Play");
  });

  afterAll(async () => {
    if (!ready) return;
    await admin.from("teams").delete().in("id", [teamId, otherTeamId]);
    for (const u of [coach, player, outsider]) await admin.auth.admin.deleteUser(u.id);
  });

  async function signedInClient(u: { email: string; password: string }) {
    const client = createClient(URL as string, ANON as string);
    await client.auth.signInWithPassword({ email: u.email, password: u.password });
    return client;
  }

  it("a coach sees all their team's plays (draft + published)", async () => {
    const client = await signedInClient(coach);
    const { data } = await client.from("plays").select("id").eq("team_id", teamId);
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(draftId);
    expect(ids).toContain(publishedId);
  });

  it("a player sees only published plays in their team", async () => {
    const client = await signedInClient(player);
    const { data } = await client.from("plays").select("id").eq("team_id", teamId);
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(publishedId);
    expect(ids).not.toContain(draftId);
  });

  it("nobody sees another team's plays", async () => {
    const client = await signedInClient(coach);
    const { data } = await client.from("plays").select("id").eq("id", otherTeamPlayId);
    expect(data ?? []).toHaveLength(0);
  });

  it("a player cannot insert a play", async () => {
    const client = await signedInClient(player);
    const { error } = await client.from("plays").insert({
      team_id: teamId,
      created_by: player.id,
      name: "Sneaky",
      category: "offense",
      status: "draft",
      data: playBody({ name: "Sneaky" }),
    });
    expect(error).not.toBeNull();
  });

  it("the duration_seconds trigger denormalizes data.duration", async () => {
    // spreadPr.duration is 5000ms → 5.0s.
    const { data } = await admin
      .from("plays")
      .select("duration_seconds")
      .eq("id", publishedId)
      .single();
    expect(data?.duration_seconds).toBe(5);
  });

  it("the trigger recomputes duration_seconds on update", async () => {
    await admin
      .from("plays")
      .update({ data: playBody({ duration: 7500 }) })
      .eq("id", draftId);
    const { data } = await admin
      .from("plays")
      .select("duration_seconds")
      .eq("id", draftId)
      .single();
    expect(data?.duration_seconds).toBe(7.5);
  });
});
