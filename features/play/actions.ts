"use server";

import { createPlay, updatePlay } from "@/features/play/queries";
import { type Play, playSchema } from "@/features/play/schemas";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side play save for the editor (UI_WORKFLOWS §7.7).
 *
 * Handles both an unsaved new play (insert) and an existing one (update).
 * The play body is re-validated against the schema on the server before it
 * touches the database — the client is never trusted to send valid data.
 * RLS rejects the write unless the caller is a coach on the play's team.
 *
 * Versioning (a play_versions snapshot per save) is M8; this is a plain save.
 *
 * Returns the play's database id (newly assigned on insert).
 */
export async function savePlayAction(input: {
  playId: string | null;
  play: unknown;
}): Promise<{ id: string }> {
  const user = await requireAuth();
  const supabase = await createClient();

  const play: Play = playSchema.parse(input.play);

  if (input.playId) {
    await updatePlay(supabase, input.playId, play);
    return { id: input.playId };
  }

  // New play: resolve the acting coach's team for the insert.
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

  const id = await createPlay(supabase, {
    teamId: membership.team_id,
    createdBy: user.id,
    play,
  });
  return { id };
}
