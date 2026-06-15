"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteTeamAction,
  regenerateInviteCodeAction,
  removeMemberAction,
  type TeamMember,
  updateTeamAction,
} from "@/features/team/actions";
import { cn, formatRelativeTime } from "@/lib/utils";

export type TeamDetail = {
  id: string;
  name: string;
  season: string;
  level: string | null;
  inviteCode: string;
};

/**
 * Team management (UI_WORKFLOWS §11): editable team info, the invite code
 * with regenerate / copy / share, the roster with remove actions, and the
 * type-to-confirm Delete team danger zone.
 */
export function TeamManagement({
  team,
  members,
  currentUserId,
}: {
  team: TeamDetail;
  members: TeamMember[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Team info
  const [name, setName] = useState(team.name);
  const [season, setSeason] = useState(team.season);
  const [level, setLevel] = useState(team.level ?? "");
  const [infoSaved, setInfoSaved] = useState(false);

  // Invite code
  const [code, setCode] = useState(team.inviteCode);
  const [copied, setCopied] = useState(false);

  // Member removal + danger zone
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const saveInfo = () =>
    startTransition(async () => {
      setError(null);
      try {
        await updateTeamAction({ teamId: team.id, name, season, level: level || null });
        setInfoSaved(true);
        setTimeout(() => setInfoSaved(false), 2000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save team info");
      }
    });

  const regenerate = () =>
    startTransition(async () => {
      setError(null);
      try {
        const { code: next } = await regenerateInviteCodeAction(team.id);
        setCode(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't regenerate the code");
      }
    });

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const share = async () => {
    const text = `Join my team on CourtVision with code ${code}`;
    if (navigator.share) {
      await navigator.share({ text }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const remove = (membershipId: string) =>
    startTransition(async () => {
      setError(null);
      try {
        await removeMemberAction(membershipId);
        setRemoving(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't remove the member");
      }
    });

  const deleteTeam = () =>
    startTransition(async () => {
      setError(null);
      try {
        await deleteTeamAction(team.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't delete the team");
      }
    });

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Team info (§11.2) */}
      <section className="rounded-lg border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold">Team info</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-input px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">Season</span>
            <input
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="rounded-md border border-input px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">Level (optional)</span>
            <input
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="e.g. Varsity"
              className="rounded-md border border-input px-2 py-1.5"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={saveInfo}
            disabled={isPending || !name.trim() || !season.trim()}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            Save team info
          </button>
          {infoSaved && <span className="text-xs text-muted-foreground">Saved</span>}
        </div>
      </section>

      {/* Invite code (§11.2) */}
      <section className="rounded-lg border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold">Invite code</h2>
        <div className="flex flex-wrap items-center gap-3">
          <span
            data-testid="team-invite-code"
            className="rounded-md bg-secondary px-4 py-2 font-mono text-2xl font-semibold tracking-[0.3em]"
          >
            {code}
          </span>
          <button
            type="button"
            onClick={regenerate}
            disabled={isPending}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary disabled:opacity-60"
          >
            Regenerate
          </button>
          <button
            type="button"
            onClick={copy}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            type="button"
            onClick={share}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary"
          >
            Share
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Regenerating invalidates the old code immediately.
        </p>
      </section>

      {/* Members (§11.2–§11.3) */}
      <section className="rounded-lg border border-border p-4">
        <h2 className="mb-3 text-sm font-semibold">Members ({members.length})</h2>
        <ul className="divide-y divide-border">
          {members.map((member) => {
            const isSelf = member.userId === currentUserId;
            return (
              <li key={member.membershipId} className="flex items-center gap-3 py-2.5">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold"
                >
                  {member.fullName.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {member.fullName}
                    {isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.email} · joined {formatRelativeTime(member.joinedAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                    member.role === "coach"
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {member.role}
                </span>
                {!isSelf &&
                  (removing === member.membershipId ? (
                    <span className="flex items-center gap-1.5 text-xs">
                      Remove?
                      <button
                        type="button"
                        onClick={() => remove(member.membershipId)}
                        disabled={isPending}
                        className="rounded bg-destructive px-2 py-1 font-medium text-destructive-foreground disabled:opacity-60"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemoving(null)}
                        className="rounded border border-border px-2 py-1"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRemoving(member.membershipId)}
                      aria-label={`Remove ${member.fullName} from team`}
                      className="rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                    >
                      Remove
                    </button>
                  ))}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Danger zone (§11.4) */}
      <section className="rounded-lg border border-destructive/40 p-4">
        <h2 className="mb-1 text-sm font-semibold text-destructive">Danger zone</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Deleting the team removes all plays, versions, and memberships. This cannot be undone.
          Type the team name to confirm.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={team.name}
            aria-label="Type the team name to confirm deletion"
            className="rounded-md border border-input px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={deleteTeam}
            disabled={isPending || confirmName !== team.name}
            className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground disabled:opacity-50"
          >
            Delete team
          </button>
        </div>
      </section>
    </div>
  );
}
