import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";
import { getPlay } from "@/features/play/queries";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Lazy-load the editor — it's heavy and desktop-only (CONVENTIONS §13).
const PlayEditor = dynamic(() => import("@/features/play/editor").then((m) => m.PlayEditor));

/**
 * Edit an existing play (UI_WORKFLOWS §7). Coach-only: RLS already prevents
 * a player from loading a draft, and we redirect any non-coach defensively.
 * The play is loaded + schema-validated by getPlay, then handed to the
 * editor as plain data (AI_INTEGRATION §14: load from a plain object).
 */
export default async function EditPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const supabase = await createClient();

  const play = await getPlay(supabase, id);
  if (!play) notFound();

  // Defensive role check (RLS is the real gate; this avoids opening a
  // read-only player into the editor UI).
  const { data: membership } = await supabase
    .from("team_memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("team_id", play.teamId)
    .maybeSingle();
  if (membership?.role !== "coach") redirect(`/play/${id}`);

  return <PlayEditor play={play} playId={id} />;
}
