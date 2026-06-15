"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setStudiedAction } from "@/features/play/actions";

/**
 * "Mark studied" footer control (UI_WORKFLOWS §8.7). Optimistic checkbox;
 * play_progress RLS scopes the write to the current user.
 */
export function MarkStudied({
  playId,
  initialStudied,
}: {
  playId: string;
  initialStudied: boolean;
}) {
  const router = useRouter();
  const [studied, setStudied] = useState(initialStudied);
  const [, startTransition] = useTransition();

  const toggle = (next: boolean) => {
    setStudied(next);
    startTransition(async () => {
      try {
        await setStudiedAction({ playId, studied: next });
        router.refresh();
      } catch {
        setStudied(!next); // roll back on failure
      }
    });
  };

  return (
    <label className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm">
      <input
        type="checkbox"
        checked={studied}
        onChange={(e) => toggle(e.target.checked)}
        className="h-4 w-4 accent-[var(--primary)]"
      />
      Mark studied
    </label>
  );
}
