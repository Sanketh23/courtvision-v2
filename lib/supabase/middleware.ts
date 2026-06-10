import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/types.generated";

/**
 * Refreshes the Supabase auth session on each request and applies routing
 * redirects based on auth + team-membership state.
 *
 * Redirect rules (per ROADMAP M1 / UI_WORKFLOWS §3):
 *  - unauthenticated on an app route   -> /sign-in
 *  - authenticated with no membership  -> /welcome
 *  - authenticated with membership on /welcome -> /playbook
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isAuthRoute =
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/join") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/set-new-password");

  // Unauthenticated user on a protected route -> sign in.
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  if (user) {
    const { count } = await supabase
      .from("team_memberships")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const hasTeam = (count ?? 0) > 0;

    // Authenticated but no team -> welcome (unless already there or joining).
    if (!hasTeam && !pathname.startsWith("/welcome") && !pathname.startsWith("/join")) {
      const url = request.nextUrl.clone();
      url.pathname = "/welcome";
      return NextResponse.redirect(url);
    }

    // Authenticated with a team but sitting on welcome -> playbook.
    if (hasTeam && pathname.startsWith("/welcome")) {
      const url = request.nextUrl.clone();
      url.pathname = "/playbook";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
