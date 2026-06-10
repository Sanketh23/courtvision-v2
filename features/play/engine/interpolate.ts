/**
 * Shared keyframe-sequence interpolation (ANIMATION_DESIGN.md §3).
 *
 * Both player paths and the ball reduce to the same problem: given a
 * time-ordered list of (time, x, y) keyframes, where is the point at time t?
 * This module answers that, with the clamping and endpoint-duplication
 * rules from the design doc. Hot path: no allocations beyond the returned
 * point, binary search for the segment.
 */

import { catmullRom, lerp } from "@/features/play/engine/catmull";

type PointKeyframe = { time: number; x: number; y: number };

export type CourtPoint = { x: number; y: number };

/**
 * Index of the segment containing t: the largest i such that
 * keyframes[i].time <= t, capped so i+1 is always a valid index.
 * Assumes keyframes are sorted by time (the schema guarantees it)
 * and t is within [first.time, last.time].
 */
export function segmentIndexAt(keyframes: readonly { time: number }[], t: number): number {
  let lo = 0;
  let hi = keyframes.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    // biome-ignore lint/style/noNonNullAssertion: mid ∈ [lo, hi] ⊂ bounds
    if (keyframes[mid]!.time <= t) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

/**
 * Interpolated position along a keyframe sequence at time t.
 *
 * - t before the first keyframe → first keyframe's position (clamp)
 * - t after the last keyframe → last keyframe's position (clamp)
 * - t exactly at a keyframe → that exact position
 * - otherwise → linear or Catmull-Rom between the bracketing keyframes,
 *   with first/last keyframes duplicated as virtual neighbors at the ends
 *   (ANIMATION_DESIGN.md §3.4)
 *
 * A single-keyframe sequence returns that keyframe's position for any t.
 * An empty sequence is invalid input (the schema requires ≥2 keyframes).
 */
export function interpolateKeyframes(
  keyframes: readonly PointKeyframe[],
  t: number,
  type: "linear" | "cubic",
): CourtPoint {
  const count = keyframes.length;
  if (count === 0) {
    throw new Error("interpolateKeyframes: keyframe sequence is empty");
  }

  const first = keyframes[0] as PointKeyframe;
  const last = keyframes[count - 1] as PointKeyframe;
  if (count === 1 || t <= first.time) return { x: first.x, y: first.y };
  if (t >= last.time) return { x: last.x, y: last.y };

  const i = segmentIndexAt(keyframes, t);
  const k1 = keyframes[i] as PointKeyframe;
  const k2 = keyframes[i + 1] as PointKeyframe;
  // Normalize t into [0, 1] across this segment (§3.4 time normalization).
  const u = (t - k1.time) / (k2.time - k1.time);

  if (type === "linear") {
    return { x: lerp(k1.x, k2.x, u), y: lerp(k1.y, k2.y, u) };
  }

  // Duplicate endpoints as virtual neighbors at the sequence boundaries.
  const k0 = keyframes[i - 1] ?? k1;
  const k3 = keyframes[i + 2] ?? k2;
  return {
    x: catmullRom(k0.x, k1.x, k2.x, k3.x, u),
    y: catmullRom(k0.y, k1.y, k2.y, k3.y, u),
  };
}
