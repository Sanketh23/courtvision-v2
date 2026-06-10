/**
 * Player position over time (ANIMATION_DESIGN.md §3.1).
 */

import { type CourtPoint, interpolateKeyframes } from "@/features/play/engine/interpolate";
import type { Path } from "@/features/play/schemas";

/**
 * Where a player is at time t (milliseconds), per their motion path.
 *
 * Exact at keyframes; linear or Catmull-Rom between them per `path.type`;
 * clamped to the first/last keyframe outside the path's time range.
 */
export function positionAt(path: Path, t: number): CourtPoint {
  return interpolateKeyframes(path.keyframes, t, path.type);
}
