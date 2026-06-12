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

/** A play as listed in the playbook — table columns plus the raw JSON body
 * (`data`) so list surfaces can generate thumbnails without a second fetch. */
export type PlaySummary = {
  id: string;
  teamId: string;
  name: string;
  category: string;
  formation: string | null;
  status: "draft" | "published" | "archived";
  tags: string[];
  durationSeconds: number;
  /** Number of actions in the play body (sorting + tile metadata). */
  actionCount: number;
  createdAt: string;
  updatedAt: string;
  /** The unvalidated play body; parse through the schema before rendering. */
  data: unknown;
};

function toSummary(row: PlayRow): PlaySummary {
  const body = row.data as { actions?: unknown[] } | null;
  return {
    id: row.id,
    teamId: row.team_id,
    name: row.name,
    category: row.category,
    formation: row.formation,
    status: row.status as PlaySummary["status"],
    tags: row.tags,
    durationSeconds: row.duration_seconds,
    actionCount: Array.isArray(body?.actions) ? body.actions.length : 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    data: row.data,
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

/** A version row as listed in the history modal (no body — fetched lazily). */
export type PlayVersionSummary = {
  versionNumber: number;
  changeSource: "manual" | "restore" | "ai";
  changeSummary: string;
  restoredFromVersion: number | null;
  createdAt: string;
};

/** A play's versions, newest first (UI_WORKFLOWS §10.2). RLS scopes rows. */
export async function listPlayVersions(
  client: Client,
  playId: string,
): Promise<PlayVersionSummary[]> {
  const { data, error } = await client
    .from("play_versions")
    .select("version_number, change_source, change_summary, restored_from_version, created_at")
    .eq("play_id", playId)
    .order("version_number", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    versionNumber: row.version_number,
    changeSource: row.change_source as PlayVersionSummary["changeSource"],
    changeSummary: row.change_summary,
    restoredFromVersion: row.restored_from_version,
    createdAt: row.created_at,
  }));
}

/** One version's validated play body, for the preview pane (§10.3). */
export async function getPlayVersionData(
  client: Client,
  playId: string,
  versionNumber: number,
): Promise<Play | null> {
  const { data, error } = await client
    .from("play_versions")
    .select("data")
    .eq("play_id", playId)
    .eq("version_number", versionNumber)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  const result = playSchema.safeParse(data.data);
  if (!result.success) {
    throw new Error(`Version ${versionNumber} failed schema validation: ${result.error.message}`);
  }
  return result.data;
}
