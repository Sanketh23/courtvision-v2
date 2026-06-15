import Link from "next/link";
import { AccountSettings } from "@/features/auth/components/AccountSettings";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Account settings (UI_WORKFLOWS §12). */
export default async function AccountPage() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("team_memberships")
    .select("role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <Link href="/playbook" className="text-sm text-muted-foreground hover:text-foreground">
          ← Playbook
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Account</h1>
      </div>
      <AccountSettings
        email={user.email ?? ""}
        initialName={(user.user_metadata?.full_name as string | undefined) ?? ""}
        isCoach={membership?.role === "coach"}
      />
    </main>
  );
}
