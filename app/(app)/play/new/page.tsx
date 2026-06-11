import { redirect } from "next/navigation";
import { NewPlayFlow } from "@/features/play/editor";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * New play route (UI_WORKFLOWS §7.10). Coach-only: resolves the acting
 * coach's team, then hands off to the formation picker + editor. The play
 * isn't persisted until the first save.
 */
export default async function NewPlayPage() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("team_memberships")
    .select("team_id, role")
    .eq("user_id", user.id)
    .eq("role", "coach")
    .limit(1)
    .maybeSingle();

  // Players can't author plays; send them back to the playbook.
  if (!membership) redirect("/playbook");

  return <NewPlayFlow teamId={membership.team_id} userId={user.id} />;
}
