import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * RLS verification against the local Supabase stack (ROADMAP §4 DoD:
 * "a player cannot read another team's data").
 *
 * Skipped unless local Supabase env vars are present, so it doesn't fail CI
 * where Docker/Supabase isn't running. To run:
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

d("RLS: team isolation", () => {
  let admin: SupabaseClient;
  let userA: { id: string; email: string; password: string };
  let userB: { id: string; email: string; password: string };
  let teamBId: string;

  beforeAll(async () => {
    admin = createClient(URL as string, SERVICE as string, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const stamp = Date.now();
    userA = { id: "", email: `rls-a+${stamp}@example.com`, password: "password123" };
    userB = { id: "", email: `rls-b+${stamp}@example.com`, password: "password123" };

    for (const u of [userA, userB]) {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });
      if (error) throw error;
      u.id = data.user.id;
    }

    // User B owns team B.
    const { data: team, error: teamErr } = await admin
      .from("teams")
      .insert({
        name: "Team B",
        season: "2025-2026",
        owner_id: userB.id,
        invite_code: `RLSB${String(stamp).slice(-2)}`,
      })
      .select("id")
      .single();
    if (teamErr) throw teamErr;
    teamBId = team.id;

    await admin
      .from("team_memberships")
      .insert({ team_id: teamBId, user_id: userB.id, role: "coach" });
  });

  afterAll(async () => {
    if (!ready) return;
    await admin.from("teams").delete().eq("id", teamBId);
    await admin.auth.admin.deleteUser(userA.id);
    await admin.auth.admin.deleteUser(userB.id);
  });

  it("a non-member (user A) cannot read team B", async () => {
    const client = createClient(URL as string, ANON as string);
    await client.auth.signInWithPassword({ email: userA.email, password: userA.password });

    const { data } = await client.from("teams").select("*").eq("id", teamBId);
    expect(data ?? []).toHaveLength(0);
  });

  it("a non-member cannot read team B's memberships", async () => {
    const client = createClient(URL as string, ANON as string);
    await client.auth.signInWithPassword({ email: userA.email, password: userA.password });

    const { data } = await client.from("team_memberships").select("*").eq("team_id", teamBId);
    expect(data ?? []).toHaveLength(0);
  });

  it("the owner (user B) can read team B", async () => {
    const client = createClient(URL as string, ANON as string);
    await client.auth.signInWithPassword({ email: userB.email, password: userB.password });

    const { data } = await client.from("teams").select("*").eq("id", teamBId);
    expect(data ?? []).toHaveLength(1);
  });

  it("find_team_by_code returns only id + name", async () => {
    const client = createClient(URL as string, ANON as string);
    const { data: team } = await admin
      .from("teams")
      .select("invite_code")
      .eq("id", teamBId)
      .single();

    const { data } = await client.rpc("find_team_by_code", {
      p_code: team?.invite_code as string,
    });
    expect(data?.[0]).toEqual({ id: teamBId, name: "Team B" });
  });
});
