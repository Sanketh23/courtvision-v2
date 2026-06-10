/**
 * Ball position over time (ANIMATION_DESIGN.md §3.2).
 */

import { interpolateKeyframes, segmentIndexAt } from "@/features/play/engine/interpolate";
import type { BallState } from "@/features/play/schemas";

export type BallPoint = { x: number; y: number; inFlight: boolean };

/**
 * Where the ball is at time t, and whether it's in flight.
 *
 * Position follows the same interpolation rules as player paths.
 * `inFlight` semantics: a keyframe's flag describes how the ball *arrived*
 * at it, so mid-segment the ball carries the destination keyframe's flag
 * (a segment ending in `inFlight: true` is a pass/shot in the air).
 * Exactly at a keyframe — or clamped outside the range — the ball reports
 * that keyframe's own flag.
 */
export function ballPositionAt(state: BallState, t: number): BallPoint {
  const { x, y } = interpolateKeyframes(state.keyframes, t, state.type);

  const keyframes = state.keyframes;
  const count = keyframes.length;
  const first = keyframes[0];
  const last = keyframes[count - 1];
  if (!first || !last) {
    // interpolateKeyframes already threw for an empty sequence.
    throw new Error("ballPositionAt: ball state has no keyframes");
  }

  let inFlight: boolean;
  if (count === 1 || t <= first.time) {
    inFlight = first.inFlight;
  } else if (t >= last.time) {
    inFlight = last.inFlight;
  } else {
    const i = segmentIndexAt(keyframes, t);
    const start = keyframes[i] as (typeof keyframes)[number];
    const end = keyframes[i + 1] as (typeof keyframes)[number];
    inFlight = t === start.time ? start.inFlight : end.inFlight;
  }

  return { x, y, inFlight };
}
