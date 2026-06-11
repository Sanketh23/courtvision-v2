"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  createNewPlay,
  FORMATION_OPTIONS,
  type FormationId,
} from "@/features/play/editor/formations";
import { cn } from "@/lib/utils";

// The editor is heavy and desktop-only — load it lazily (CONVENTIONS §13).
const PlayEditor = dynamic(
  () => import("@/features/play/editor/components/PlayEditor").then((m) => m.PlayEditor),
  { ssr: false },
);

/**
 * The new-play flow (UI_WORKFLOWS §7.10): pick a starting formation, then
 * the editor opens with 5 players placed. The play isn't persisted until the
 * coach saves (an unsaved draft, AI_INTEGRATION §14: load from plain JSON).
 */
export function NewPlayFlow({ teamId, userId }: { teamId: string; userId: string }) {
  const [formation, setFormation] = useState<FormationId | null>(null);

  const play = useMemo(
    () => (formation ? createNewPlay({ formation, teamId, createdBy: userId }) : null),
    [formation, teamId, userId],
  );

  if (play) return <PlayEditor play={play} playId={null} />;

  return (
    <div className="flex h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6">
        <h1 className="text-lg font-semibold">Pick a starting formation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Five players will be placed for you. You can move anyone once the editor opens.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {FORMATION_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFormation(option.id)}
              className={cn(
                "rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-accent",
              )}
            >
              <span className="block font-medium">{option.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {option.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
