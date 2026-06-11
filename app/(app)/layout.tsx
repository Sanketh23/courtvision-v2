import { requireAuth } from "@/lib/auth";

/**
 * Auth-gated layout for the authenticated app. `requireAuth()` redirects to
 * /sign-in when there's no session; middleware handles team-membership
 * redirects (welcome vs playbook).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <div className="min-h-screen bg-white">{children}</div>;
}
