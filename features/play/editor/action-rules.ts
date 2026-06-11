/**
 * Selection-drives-action rules (UI_WORKFLOWS.md §7.3).
 *
 * The coach selects players, then clicks an action; a button is enabled
 * only when the current selection makes that action valid. Selection order
 * matters for two-player actions: first selected = source (passer,
 * screener, handoff giver), second = target.
 */

import type { Action } from "@/features/play/schemas";

export type ActionType = Action["type"];

/** The six author-able actions, in rail display order. `catch` is derived
 * data (ball reception) and never authored directly. */
export const EDITOR_ACTION_TYPES = ["pass", "screen", "cut", "dribble", "handoff", "shot"] as const;

export type EditorActionType = (typeof EDITOR_ACTION_TYPES)[number];

/** How many selected players each action needs. */
export const ACTION_ARITY: Record<EditorActionType, 1 | 2> = {
  pass: 2,
  screen: 2,
  handoff: 2,
  cut: 1,
  dribble: 1,
  shot: 1,
};

/** Default action lengths, in milliseconds (DATA_MODEL §3.4 "reasonable"). */
export const ACTION_DEFAULT_DURATION: Record<EditorActionType, number> = {
  pass: 500,
  screen: 1000,
  cut: 1000,
  dribble: 1000,
  handoff: 400,
  shot: 800,
};

/** Quick-add keyboard letters (UI_WORKFLOWS §7.9: P S D C H T). */
export const ACTION_SHORTCUTS: Record<string, EditorActionType> = {
  p: "pass",
  s: "screen",
  d: "dribble",
  c: "cut",
  h: "handoff",
  t: "shot",
};

/** Whether `type` can be created from the current ordered selection. */
export function isActionValidForSelection(
  type: EditorActionType,
  selectedSlots: readonly number[],
): boolean {
  return selectedSlots.length === ACTION_ARITY[type];
}

/** Human hint for the rail (e.g. shown when nothing is enabled). */
export function selectionHint(selectedSlots: readonly number[]): string {
  if (selectedSlots.length === 0) return "Select a player to add an action.";
  if (selectedSlots.length === 1)
    return "Cut, Dribble, Shot — or shift-click a second player for Pass, Screen, Handoff.";
  return "Pass, Screen, Handoff go from the first selected player to the second.";
}
