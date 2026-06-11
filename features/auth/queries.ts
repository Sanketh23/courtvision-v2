import { createClient } from "@/lib/supabase/client";

export type AuthResult = { error: string | null };

/**
 * Create a new account. Full name is stored in user metadata. Email
 * confirmation is disabled in v2 (UI_WORKFLOWS §2.5), so the session is
 * active immediately.
 */
export async function signUp(input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.fullName } },
  });
  return { error: error?.message ?? null };
}

export async function signIn(input: { email: string; password: string }): Promise<AuthResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<AuthResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  // Persisted UI prefs (cv:*) reset on sign out (UI_WORKFLOWS §13.9).
  if (typeof window !== "undefined") {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("cv:")) window.localStorage.removeItem(key);
    }
  }
  return { error: error?.message ?? null };
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/set-new-password`,
  });
  return { error: error?.message ?? null };
}

export async function updatePassword(newPassword: string): Promise<AuthResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error: error?.message ?? null };
}
