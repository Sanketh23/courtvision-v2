/**
 * Pure action mutations for the editor (ROADMAP M6).
 *
 * Same discipline as mutations.ts: `(play, args) → newPlay`, no input
 * mutation, schema invariants preserved. Every mutation finishes by
 * regenerating `play.ball` from the action list via the engine's pure
 * regenerateBallStates — the editor never hand-writes ball positions
 * (DATA_MODEL §3.3, AI_INTEGRATION §14). That keeps the ball correct
 * automatically as passes, handoffs, and shots are added, moved, or removed.
 */

import {
  ACTION_DEFAULT_DURATION,
  type EditorActionType,
} from "@/features/play/editor/action-rules";
import { regenerateBallStates } from "@/features/play/engine/ball-regen";
import { positionAt } from "@/features/play/engine/position";
import type { Action, Play } from "@/features/play/schemas";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Recompute the ball from the actions (the editor's ball is derived data). */
export function withRegeneratedBall(play: Play): Play {
  return {
    ...play,
    ball: regenerateBallStates(play.actions, play.players, play.duration),
  };
}

/** Player id for a slot, or null if the slot doesn't exist. */
function playerIdAtSlot(play: Play, slot: number): string | null {
  return play.players.find((p) => p.slot === slot)?.id ?? null;
}

/**
 * Create an action of `type` from the ordered slot selection at `time`.
 * Two-player actions read source from the first slot, target from the
 * second. Shots record the shooter's interpolated position at that moment
 * as the shot location. Returns the play unchanged if the selection doesn't
 * resolve to real players (the rail prevents that; this stays graceful).
 *
 * `id` is injectable for tests; callers default to a random UUID.
 */
export function addAction(
  play: Play,
  type: EditorActionType,
  selectedSlots: readonly number[],
  time: number,
  id: string = `action_${crypto.randomUUID()}`,
): Play {
  const t = clamp(time, 0, play.duration);
  const duration = Math.min(ACTION_DEFAULT_DURATION[type], Math.max(play.duration - t, 100));
  const [firstSlot, secondSlot] = selectedSlots;
  const first = firstSlot !== undefined ? playerIdAtSlot(play, firstSlot) : null;
  const second = secondSlot !== undefined ? playerIdAtSlot(play, secondSlot) : null;

  let action: Action | null = null;
  switch (type) {
    case "pass":
      if (first && second) action = { id, type, time: t, duration, from: first, to: second };
      break;
    case "handoff":
      if (first && second) action = { id, type, time: t, duration, from: first, to: second };
      break;
    case "screen":
      if (first && second)
        action = { id, type, time: t, duration, screener: first, target: second };
      break;
    case "cut":
      if (first) action = { id, type, time: t, duration, player: first };
      break;
    case "dribble":
      if (first) action = { id, type, time: t, duration, player: first };
      break;
    case "shot": {
      const shooter = play.players.find((p) => p.slot === firstSlot);
      if (first && shooter) {
        const location = positionAt(shooter.path, t);
        action = { id, type, time: t, duration, player: first, location };
      }
      break;
    }
  }

  if (!action) return play;
  const actions = [...play.actions, action].sort((a, b) => a.time - b.time);
  return withRegeneratedBall({ ...play, actions });
}

/** Move an action's start time (timeline bar drag), keeping it in the play. */
export function moveActionTime(play: Play, actionId: string, time: number): Play {
  const target = play.actions.find((a) => a.id === actionId);
  if (!target) return play;
  const t = clamp(time, 0, play.duration);
  const actions = play.actions
    .map((a) => (a.id === actionId ? { ...a, time: t } : a))
    .sort((a, b) => a.time - b.time);
  return withRegeneratedBall({ ...play, actions });
}

/** Resize an action's duration (timeline bar right-edge drag). */
export function resizeAction(play: Play, actionId: string, duration: number): Play {
  const target = play.actions.find((a) => a.id === actionId);
  if (!target) return play;
  const max = Math.max(play.duration - target.time, 100);
  const d = clamp(duration, 100, max);
  const actions = play.actions.map((a) => (a.id === actionId ? { ...a, duration: d } : a));
  return withRegeneratedBall({ ...play, actions });
}

/** Delete an action. */
export function deleteAction(play: Play, actionId: string): Play {
  if (!play.actions.some((a) => a.id === actionId)) return play;
  const actions = play.actions.filter((a) => a.id !== actionId);
  return withRegeneratedBall({ ...play, actions });
}

/** The slots an action involves (for rendering it on timeline lanes). */
export function actionSlots(play: Play, action: Action): number[] {
  const idsBySlot = new Map(play.players.map((p) => [p.id, p.slot]));
  const refs: string[] = [];
  switch (action.type) {
    case "pass":
    case "handoff":
      refs.push(action.from, action.to);
      break;
    case "screen":
      refs.push(action.screener, action.target);
      break;
    case "cut":
    case "dribble":
    case "shot":
    case "catch":
      refs.push(action.player);
      break;
  }
  return refs.map((id) => idsBySlot.get(id)).filter((slot): slot is number => slot !== undefined);
}
