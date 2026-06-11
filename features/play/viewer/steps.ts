/**
 * The steps list: a human-readable, time-ordered companion to the
 * animation (UI_WORKFLOWS.md §8.5). Pure derivation from actions.
 */

import type { Action, Player } from "@/features/play/schemas";

export type Step = {
  id: string;
  time: number;
  duration: number;
  description: string;
};

function labelOf(playerId: string, labels: Map<string, string>): string {
  return labels.get(playerId) ?? playerId;
}

function describeAction(action: Action, labels: Map<string, string>): string {
  switch (action.type) {
    case "pass":
      return `Pass: ${labelOf(action.from, labels)} → ${labelOf(action.to, labels)}`;
    case "screen":
      return `Screen: ${labelOf(action.screener, labels)} for ${labelOf(action.target, labels)}`;
    case "cut":
      return action.toward
        ? `Cut: ${labelOf(action.player, labels)} toward ${action.toward}`
        : `Cut: ${labelOf(action.player, labels)}`;
    case "dribble":
      return `Dribble: ${labelOf(action.player, labels)}`;
    case "handoff":
      return `Handoff: ${labelOf(action.from, labels)} → ${labelOf(action.to, labels)}`;
    case "shot":
      return `Shot: ${labelOf(action.player, labels)}`;
    case "catch":
      return `Catch: ${labelOf(action.player, labels)}`;
  }
}

/** Actions as display steps, sorted by start time (ties by id, stable). */
export function stepsFromActions(actions: readonly Action[], players: readonly Player[]): Step[] {
  const labels = new Map(players.map((player) => [player.id, player.label]));
  return [...actions]
    .sort((a, b) => a.time - b.time || a.id.localeCompare(b.id))
    .map((action) => ({
      id: action.id,
      time: action.time,
      duration: action.duration,
      description: describeAction(action, labels),
    }));
}

/**
 * The step to highlight at time t: the latest one that has started.
 * Sticky through gaps (a step stays current until the next begins),
 * null before the first step starts.
 */
export function activeStepId(steps: readonly Step[], t: number): string | null {
  let active: string | null = null;
  for (const step of steps) {
    if (step.time <= t) active = step.id;
    else break;
  }
  return active;
}

/** "1.2s" formatting for step rows and the time readout. */
export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}
