"use client";

import { useState } from "react";
import { useEditor } from "@/features/play/editor/store-context";
import { cn } from "@/lib/utils";

/** The six action types (UI_WORKFLOWS §7.3). Disabled until M6. */
const ACTION_BUTTONS = ["Pass", "Screen", "Cut", "Dribble", "Handoff", "Shot"] as const;

/**
 * Left rail (UI_WORKFLOWS §7.3): the 5 players (click to select, double-click
 * to rename) and the "Add action" grid. Actions are M6, so the grid is
 * rendered disabled here to show the shape without doing anything.
 */
export function PlayerRail() {
  const players = useEditor((s) => s.play.players);
  const selectedSlot = useEditor((s) => s.selectedSlot);
  const selectSlot = useEditor((s) => s.selectSlot);
  const rename = useEditor((s) => s.rename);

  const [editingSlot, setEditingSlot] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Players
        </h2>
        <ul className="space-y-1">
          {players.map((player) => (
            <li key={player.id}>
              {editingSlot === player.slot ? (
                <input
                  // biome-ignore lint/a11y/noAutofocus: rename field opens focused by intent
                  autoFocus
                  defaultValue={player.label}
                  onBlur={(e) => {
                    rename(player.slot, e.target.value.trim() || player.label);
                    setEditingSlot(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") setEditingSlot(null);
                  }}
                  className="w-full rounded-md border border-input px-2 py-1.5 text-sm"
                />
              ) : (
                <button
                  type="button"
                  data-testid={`player-rail-row-${player.slot}`}
                  onClick={() => selectSlot(player.slot)}
                  onDoubleClick={() => setEditingSlot(player.slot)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    player.slot === selectedSlot
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-secondary",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: `var(--slot-${player.slot})` }}
                    />
                    {player.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {player.path.keyframes.length} kf
                  </span>
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Add action
        </h2>
        <div className="grid grid-cols-2 gap-1.5">
          {ACTION_BUTTONS.map((action) => (
            <button
              key={action}
              type="button"
              disabled
              title="Actions arrive in the next milestone"
              className="cursor-not-allowed rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground opacity-60"
            >
              {action}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          Passes, screens, and cuts come in the next milestone.
        </p>
      </section>
    </div>
  );
}
