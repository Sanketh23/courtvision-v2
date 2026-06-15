"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/features/auth";
import { createClient } from "@/lib/supabase/client";

/**
 * Account settings (UI_WORKFLOWS §12): profile block, edit profile (name),
 * change password (current verified first), manage-team shortcut, contact
 * support, sign out. Account deletion (§12.3) is deferred — it requires
 * service-role plumbing and isn't in the M9 definition of done.
 */
export function AccountSettings({
  email,
  initialName,
  isCoach,
}: {
  email: string;
  initialName: string;
  isCoach: boolean;
}) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [nameSaved, setNameSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      data: { full_name: name.trim() },
    });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
    router.refresh();
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    // Supabase has no "current password" check on update — verify by
    // re-authenticating first so a hijacked session can't rotate it.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (verifyError) {
      setBusy(false);
      setError("Current password is incorrect.");
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("Password updated.");
  }

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* You (§12.2) */}
      <section className="flex items-center gap-3 rounded-lg border border-border p-4">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-lg font-semibold"
        >
          {(name || email).slice(0, 1).toUpperCase()}
        </span>
        <div>
          <p className="font-medium">{name || "—"}</p>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
      </section>

      {/* Edit profile */}
      <section className="rounded-lg border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold">Edit profile</h2>
        <form onSubmit={saveName} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">Full name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-64 rounded-md border border-input px-2 py-1.5"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            Save
          </button>
          {nameSaved && <span className="text-xs text-muted-foreground">Saved</span>}
        </form>
      </section>

      {/* Change password */}
      <section className="rounded-lg border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold">Change password</h2>
        <form onSubmit={changePassword} className="grid max-w-sm gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="rounded-md border border-input px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">New password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-md border border-input px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-md border border-input px-2 py-1.5"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="w-fit rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              Update password
            </button>
            {passwordMessage && (
              <span className="text-xs text-muted-foreground">{passwordMessage}</span>
            )}
          </div>
        </form>
      </section>

      {/* Shortcuts */}
      <section className="divide-y divide-border rounded-lg border border-border">
        {isCoach && (
          <Link href="/team" className="block px-4 py-3 text-sm hover:bg-secondary">
            Manage team →
          </Link>
        )}
        <a
          href="mailto:support@courtvision.app?subject=CourtVision%20feedback"
          className="block px-4 py-3 text-sm hover:bg-secondary"
        >
          Contact support
        </a>
        <button
          type="button"
          onClick={handleSignOut}
          className="block w-full px-4 py-3 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
