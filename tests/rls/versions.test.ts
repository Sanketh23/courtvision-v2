import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spreadPr } from "@/features/play/fixtures";

/**
 * Versioning trigger + restore RPC + RLS (ROADMAP M8 DoD), against the
 * local Supabase stack. Skipped without env vars — see tests/rls/rls.test.ts.
 */

const URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ready = Boolean(URL && ANON && SERVICE);
const d = ready ? describe : describe.skip;

function body(overrides: Record<string, unknown>) {
  return { ...structuredClone(spreadPr), ...overrides };
}

d("versioning: snapshot trigger + restore", () => {
  let admin: SupabaseClient;
  const stamp = Date.now();
  const coach = { id: "", email: `ver-coach+${stamp}@example.com`, password: "password123" };
  const player = { id: "", email: `ver-player+${stamp}@example.com`, password: "password123" };
  let teamId: string;
  let playId: string;

  async function signedIn(u: { email: string; password: string }) {
    const client = createClient(URL as string, ANON as string);
    await client.auth.signInWithPassword({ email: u.email, password: u.password });
    return client;
  }

  beforeAll(async () => {
    admin = createClient(URL as string, SERVICE as string, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    for (const u of [coach, player]) {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });
      if (error) throw error;
      u.id = data.user.id;
    }
    const { data: team, error: teamErr } = await admin
      .from("teams")
      .insert({
        name: "Version Team",
        season: "2025-2026",
        owner_id: coach.id,
        invite_code: `VR${String(stamp).slice(-4)}`,
      })
      .select("id")
      .single();
    if (teamErr) throw teamErr;
    teamId = team.id;
    await admin.from("team_memberships").insert([
      { team_id: teamId, user_id: coach.id, role: "coach" },
      { team_id: teamId, user_id: player.id, role: "player" },
    ]);

    // Coach inserts the play through RLS (so auth.uid() is the coach).
    const client = await signedIn(coach);
    const { data: play, error: playErr } = await client
      .from("plays")
      .insert({
        team_id: teamId,
        created_by: coach.id,
        name: "Versioned Play",
        category: "offense",
        status: "published",
        data: body({ name: "Versioned Play", duration: 5000 }),
      })
      .select("id")
      .single();
    if (playErr) throw playErr;
    playId = play.id;
  });

  afterAll(async () => {
    if (!ready) return;
    await admin.from("teams").delete().eq("id", teamId);
    for (const u of [coach, player]) await admin.auth.admin.deleteUser(u.id);
  });

  it("insert creates v1 ('Created'); each data update appends a version", async () => {
    const client = await signedIn(coach);

    const v1 = await client.from("play_versions").select("*").eq("play_id", playId);
    expect(v1.data).toHaveLength(1);
    expect(v1.data?.[0]).toMatchObject({
      version_number: 1,
      change_source: "manual",
      change_summary: "Created",
    });

    // Update with changed timing → v2 with a derived summary.
    await client
      .from("plays")
      .update({ data: body({ name: "Versioned Play", duration: 6000 }) })
      .eq("id", playId);

    const v2 = await client
      .from("play_versions")
      .select("version_number, change_summary")
      .eq("play_id", playId)
      .order("version_number");
    expect(v2.data).toHaveLength(2);
    expect(v2.data?.[1]).toMatchObject({
      version_number: 2,
      change_summary: "Changed play timing",
    });
  });

  it("a no-data-change update creates no version", async () => {
    const client = await signedIn(coach);
    const before = await client.from("play_versions").select("id").eq("play_id", playId);
    await client.from("plays").update({ name: "Renamed Column Only" }).eq("id", playId);
    const after = await client.from("play_versions").select("id").eq("play_id", playId);
    expect(after.data?.length).toBe(before.data?.length);
  });

  it("clients cannot write version rows directly", async () => {
    const client = await signedIn(coach);
    const { error } = await client.from("play_versions").insert({
      play_id: playId,
      version_number: 99,
      data: {},
      created_by: coach.id,
    });
    expect(error).not.toBeNull();
  });

  it("restore creates a NEW annotated version and preserves earlier ones", async () => {
    const client = await signedIn(coach);
    const { data: newVersion, error } = await client.rpc("restore_play_version", {
      p_play_id: playId,
      p_version: 1,
    });
    expect(error).toBeNull();
    expect(newVersion).toBe(3);

    const versions = await client
      .from("play_versions")
      .select("version_number, change_source, change_summary, restored_from_version")
      .eq("play_id", playId)
      .order("version_number");
    expect(versions.data).toHaveLength(3); // v1, v2 intact + v3 restore
    expect(versions.data?.[2]).toMatchObject({
      version_number: 3,
      change_source: "restore",
      change_summary: "Restored from v1",
      restored_from_version: 1,
    });

    // The play's data is back to v1's (duration 5000).
    const { data: play } = await client.from("plays").select("data").eq("id", playId).single();
    expect((play?.data as { duration: number }).duration).toBe(5000);
  });

  it("a player can read versions of a published play but cannot restore", async () => {
    const client = await signedIn(player);
    const { data: visible } = await client
      .from("play_versions")
      .select("version_number")
      .eq("play_id", playId);
    expect((visible ?? []).length).toBeGreaterThan(0);

    const { error } = await client.rpc("restore_play_version", {
      p_play_id: playId,
      p_version: 1,
    });
    expect(error?.message).toMatch(/Only a coach/);
  });
});
