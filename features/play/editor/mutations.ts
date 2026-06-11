/**
 * Pure play-mutation helpers for the editor.
 *
 * Every editor edit is expressed here as `(play, args) → newPlay`, never
 * mutating the input. The Zustand store wraps these with undo/redo and
 * selection; keeping the logic pure makes the novel drag-to-keyframe
 * behavior unit-testable without React (same discipline as the engine).
 *
 * Two invariants are maintained on every edit so the result stays
 * schema-valid: keyframes stay sorted strictly by time, and the play
 * duration always equals the latest keyframe across all players + the ball
 * (auto-extend, UI_WORKFLOWS.md §7.5 / ROADMAP M5 DoD).
 */

import {
  COURT_HEIGHT,
  COURT_WIDTH,
  type Keyframe,
  type Play,
  type Player,
} from "@/features/play/schemas";

/** Smallest gap (ms) allowed between two keyframes when snapping times apart. */
const MIN_KEYFRAME_GAP = 1;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Clamp a point into the court bounds (DATA_MODEL §2). */
export function clampToCourt(x: number, y: number): { x: number; y: number } {
  return { x: clamp(x, 0, COURT_WIDTH), y: clamp(y, 0, COURT_HEIGHT) };
}

function sortKeyframes(keyframes: Keyframe[]): Keyframe[] {
  return [...keyframes].sort((a, b) => a.time - b.time);
}

function mapPlayer(play: Play, slot: number, fn: (player: Player) => Player): Play {
  return { ...play, players: play.players.map((p) => (p.slot === slot ? fn(p) : p)) };
}

/**
 * The play duration that keeps every keyframe in range: the max keyframe
 * time across all players and the ball. Used to auto-extend (and to shrink
 * back, never below the latest keyframe).
 */
export function requiredDuration(play: Play): number {
  let max = 0;
  for (const player of play.players) {
    for (const kf of player.path.keyframes) max = Math.max(max, kf.time);
  }
  for (const kf of play.ball.keyframes) max = Math.max(max, kf.time);
  return max;
}

/**
 * Re-pin the last keyframe of every path to `duration` and update
 * `play.duration`. Keeps the schema invariant "last keyframe == duration"
 * after edits that change timing.
 */
function withDuration(play: Play, duration: number): Play {
  // Generic over keyframe shape so ball keyframes keep their `inFlight` flag.
  const pinLast = <T extends { time: number }>(keyframes: T[]): T[] => {
    if (keyframes.length === 0) return keyframes;
    const sorted = [...keyframes].sort((a, b) => a.time - b.time);
    const last = sorted[sorted.length - 1] as T;
    if (last.time === duration) return sorted;
    sorted[sorted.length - 1] = { ...last, time: duration };
    return sorted;
  };

  return {
    ...play,
    duration,
    players: play.players.map((p) => ({
      ...p,
      path: { ...p.path, keyframes: pinLast(p.path.keyframes) },
    })),
    ball: { ...play.ball, keyframes: pinLast(play.ball.keyframes) },
  };
}

/**
 * Insert a keyframe for `slot` at `time`, or replace the position of the
 * existing keyframe at that time. This is the drag-to-keyframe primitive:
 * dragging a player at the current cursor time lands here.
 *
 * Times equal within ±`MIN_KEYFRAME_GAP` are treated as the same keyframe,
 * so repeated drags at one cursor position move a single keyframe rather
 * than stacking duplicates. Duration auto-extends if `time` exceeds it.
 */
export function upsertKeyframe(play: Play, slot: number, time: number, x: number, y: number): Play {
  const pos = clampToCourt(x, y);
  const t = clamp(time, 0, Math.max(time, play.duration));

  const next = mapPlayer(play, slot, (player) => {
    const existingIndex = player.path.keyframes.findIndex(
      (kf) => Math.abs(kf.time - t) <= MIN_KEYFRAME_GAP,
    );
    const keyframes = [...player.path.keyframes];
    if (existingIndex >= 0) {
      const existing = keyframes[existingIndex] as Keyframe;
      keyframes[existingIndex] = { ...existing, x: pos.x, y: pos.y };
    } else {
      keyframes.push({ time: t, x: pos.x, y: pos.y });
    }
    return { ...player, path: { ...player.path, keyframes: sortKeyframes(keyframes) } };
  });

  return withDuration(next, Math.max(next.duration, t));
}

/** Move an existing keyframe's position (not its time). For dragging a dot. */
export function moveKeyframePosition(
  play: Play,
  slot: number,
  index: number,
  x: number,
  y: number,
): Play {
  const pos = clampToCourt(x, y);
  return mapPlayer(play, slot, (player) => {
    const keyframes = [...player.path.keyframes];
    const kf = keyframes[index];
    if (!kf) return player;
    keyframes[index] = { ...kf, x: pos.x, y: pos.y };
    return { ...player, path: { ...player.path, keyframes } };
  });
}

/**
 * Move a keyframe's time (timeline-lane drag). The first keyframe is pinned
 * at 0; intermediate keyframes are clamped strictly between their neighbors
 * so order is preserved; moving the last keyframe changes the duration.
 */
export function moveKeyframeTime(play: Play, slot: number, index: number, time: number): Play {
  const player = play.players.find((p) => p.slot === slot);
  if (!player) return play;
  const keyframes = player.path.keyframes;
  const kf = keyframes[index];
  if (!kf) return play;

  // The first keyframe is anchored at t=0.
  if (index === 0) return play;

  const prev = keyframes[index - 1];
  const nextKf = keyframes[index + 1];
  const lower = (prev?.time ?? 0) + MIN_KEYFRAME_GAP;
  const upper = nextKf ? nextKf.time - MIN_KEYFRAME_GAP : Number.POSITIVE_INFINITY;
  const newTime = clamp(time, lower, Math.max(lower, upper));

  const updated = mapPlayer(play, slot, (p) => {
    const next = [...p.path.keyframes];
    next[index] = { ...kf, time: newTime };
    return { ...p, path: { ...p.path, keyframes: sortKeyframes(next) } };
  });

  // Moving the last keyframe of any path can change the overall duration.
  return withDuration(updated, requiredDuration(updated));
}

/**
 * Delete a keyframe. The first and last are protected (a path needs ≥2
 * keyframes and must span [0, duration]); returns the play unchanged if the
 * deletion would violate that. After deletion the duration shrinks to fit.
 */
export function deleteKeyframe(play: Play, slot: number, index: number): Play {
  const player = play.players.find((p) => p.slot === slot);
  if (!player) return play;
  const count = player.path.keyframes.length;
  // Keep at least 2, and never drop the t=0 anchor or the final keyframe.
  if (count <= 2 || index === 0 || index === count - 1) return play;

  const updated = mapPlayer(play, slot, (p) => {
    const keyframes = p.path.keyframes.filter((_, i) => i !== index);
    return { ...p, path: { ...p.path, keyframes } };
  });
  return withDuration(updated, requiredDuration(updated));
}

/** Nudge a keyframe's position by a court-unit delta (arrow keys). */
export function nudgeKeyframe(
  play: Play,
  slot: number,
  index: number,
  dx: number,
  dy: number,
): Play {
  const player = play.players.find((p) => p.slot === slot);
  const kf = player?.path.keyframes[index];
  if (!kf) return play;
  return moveKeyframePosition(play, slot, index, kf.x + dx, kf.y + dy);
}

/** Set the play duration explicitly, never below the latest keyframe. */
export function setDuration(play: Play, duration: number): Play {
  const floor = requiredDuration(play);
  return withDuration(play, Math.max(duration, floor, MIN_KEYFRAME_GAP));
}

/** Rename a player's label (left-rail double-click). */
export function renamePlayer(play: Play, slot: number, label: string): Play {
  return mapPlayer(play, slot, (player) => ({ ...player, label }));
}

/** Patch top-level play metadata from the properties rail. */
export type PlayMeta = Partial<
  Pick<Play, "name" | "category" | "formation" | "tags" | "description" | "status">
>;

export function updateMeta(play: Play, meta: PlayMeta): Play {
  return { ...play, ...meta };
}
