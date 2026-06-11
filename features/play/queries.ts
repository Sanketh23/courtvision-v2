/**
 * Typed play CRUD against Supabase (ARCHITECTURE.md §8.3).
 *
 * RLS is the access-control contract (§8.4): these functions never check
 * roles themselves — the database returns the rows the caller may see.
 *
 * On read, the JSON `data` column is parsed through the play Zod schema, so
 * a database-loaded play is identical to a fixture (M4 DoD) and a malformed
 * row surfaces loudly rather than reaching the renderer.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { type Play, playSchema } from "@/features/play/schemas";
import type { Database } from "@/lib/supabase/types.generated";

type Client = SupabaseClient<Database>;
type PlayRow = Database["public"]["Tables"]["plays"]["Row"];

/** A play as listed in the playbook — table columns, not the full body. */
export type PlaySummary = {
  id: string;
  teamId: string;
  name: string;
  category: string;
  formation: string | null;
  status: "draft" | "published" | "archived";
  tags: string[];
  durationSeconds: number;
  updatedAt: string;
};

function toSummary(row: PlayRow): PlaySummary {
  return {
    id: row.id,
    teamId: row.team_id,
    name: row.name,
    category: row.category,
    formation: row.formation,
    status: row.status as PlaySummary["status"],
    tags: row.tags,
    durationSeconds: row.duration_seconds,
    updatedAt: row.updated_at,
  };
}

/** Parse the stored JSON body into a validated Play (throws on bad data). */
function parsePlayData(row: Pick<PlayRow, "id" | "data">): Play {
  const result = playSchema.safeParse(row.data);
  if (!result.success) {
    throw new Error(`Play ${row.id} failed schema validation: ${result.error.message}`);
  }
  return result.data;
}

/** Plays visible to the caller for a team, newest-edited first. RLS filters rows. */
export async function listPlays(client: Client, teamId: string): Promise<PlaySummary[]> {
  const { data, error } = await client
    .from("plays")
    .select("*")
    .eq("team_id", teamId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(toSummary);
}

/** A single play's validated body by id, or null if not visible / not found. */
export async function getPlay(client: Client, playId: string): Promise<Play | null> {
  const { data, error } = await client
    .from("plays")
    .select("id, data")
    .eq("id", playId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return parsePlayData(data);
}

export type CreatePlayInput = {
  teamId: string;
  createdBy: string;
  /** The validated play body. */
  play: Play;
};

/**
 * Insert a play. The animation body goes into `data`; queryable columns
 * (name, category, status, …) are mirrored from it. Returns the new id.
 * duration_seconds is filled by the database trigger, not here.
 */
export async function createPlay(client: Client, input: CreatePlayInput): Promise<string> {
  const { play, teamId, createdBy } = input;
  const { data, error } = await client
    .from("plays")
    .insert({
      team_id: teamId,
      created_by: createdBy,
      name: play.name,
      description: play.description ?? null,
      category: play.category,
      formation: play.formation ?? null,
      tags: play.tags,
      status: play.status,
      published_at: play.publishedAt ?? null,
      published_by: play.publishedBy ?? null,
      data: play,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

/**
 * Update an existing play's body and mirrored columns (editor save,
 * UI_WORKFLOWS §7.7). duration_seconds and updated_at are maintained by the
 * trigger. RLS rejects the update unless the caller is a coach on the team.
 */
export async function updatePlay(client: Client, playId: string, play: Play): Promise<void> {
  const { error } = await client
    .from("plays")
    .update({
      name: play.name,
      description: play.description ?? null,
      category: play.category,
      formation: play.formation ?? null,
      tags: play.tags,
      status: play.status,
      published_at: play.publishedAt ?? null,
      published_by: play.publishedBy ?? null,
      data: play,
    })
    .eq("id", playId);

  if (error) throw new Error(error.message);
}
