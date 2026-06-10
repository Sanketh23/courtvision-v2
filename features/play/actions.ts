"use server";

import { redirect } from "next/navigation";
import { spreadPr } from "@/features/play/fixtures";
import { createPlay } from "@/features/play/queries";
import { playSchema } from "@/features/play/schemas";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Minimal "create play" path for M4 (ROADMAP §7): inserts a fixture-like
 * play so the viewer has real database rows to load. The full editor is M5.
 *
 * The acting coach's team is resolved from their membership; RLS rejects the
 * insert if they aren't a coach on that team.
 */
export async function createSamplePlayAction(): Promise<void> {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("team_memberships")
    .select("team_id, role")
    .eq("user_id", user.id)
    .eq("role", "coach")
    .limit(1)
    .maybeSingle();

  if (!membership) {
    throw new Error("Only a coach can create a play.");
  }

  // Start from the Spread P&R fixture as a seed, marked as a fresh draft.
  const seed = playSchema.parse({
    ...spreadPr,
    name: "Spread P&R (sample)",
    status: "draft",
    createdAt: new Date().toISOString(),
    createdBy: user.id,
    publishedAt: undefined,
    publishedBy: undefined,
  });

  const playId = await createPlay(supabase, {
    teamId: membership.team_id,
    createdBy: user.id,
    play: seed,
  });

  redirect(`/play/${playId}`);
}
