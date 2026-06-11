"use client";

import { useState } from "react";
import {
  EDITOR_ACTION_TYPES,
  type EditorActionType,
  isActionValidForSelection,
  selectionHint,
} from "@/features/play/editor/action-rules";
import { useEditor } from "@/features/play/editor/store-context";
import { cn } from "@/lib/utils";

/**
 * Left rail (UI_WORKFLOWS §7.3): the 5 players (click selects, shift-click
 * extends the ordered selection, double-click renames) and the "Add action"
 * grid — selection-drives-action: a button enables only when the current
 * selection satisfies its arity, and clicking it adds the action at the
 * timeline cursor.
 */
export function PlayerRail() {
  const players = useEditor((s) => s.play.players);
  const selectedSlots = useEditor((s) => s.selectedSlots);
  const selectSlot = useEditor((s) => s.selectSlot);
  const toggleSlot = useEditor((s) => s.toggleSlot);
  const rename = useEditor((s) => s.rename);
  const createAction = useEditor((s) => s.createAction);

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
                  onClick={(e) => (e.shiftKey ? toggleSlot(player.slot) : selectSlot(player.slot))}
                  onDoubleClick={() => setEditingSlot(player.slot)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    selectedSlots.includes(player.slot)
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
                    {selectedSlots.length > 1 && selectedSlots.includes(player.slot) && (
                      <span className="rounded bg-primary/15 px-1 text-[10px] font-semibold text-primary">
                        {selectedSlots.indexOf(player.slot) + 1}
                      </span>
                    )}
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
          {EDITOR_ACTION_TYPES.map((type: EditorActionType) => {
            const enabled = isActionValidForSelection(type, selectedSlots);
            return (
              <button
                key={type}
                type="button"
                disabled={!enabled}
                onClick={() => createAction(type)}
                className={cn(
                  "rounded-md border px-2 py-1.5 text-xs capitalize transition-colors",
                  enabled
                    ? "border-border text-foreground hover:border-primary hover:bg-accent"
                    : "cursor-not-allowed border-dashed border-border text-muted-foreground opacity-60",
                )}
              >
                {type}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          {selectionHint(selectedSlots)}
        </p>
      </section>
    </div>
  );
}
