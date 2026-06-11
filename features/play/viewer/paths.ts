/**
 * Player motion-path rendering helpers (UI_WORKFLOWS.md §13.3).
 *
 * Each player's full path renders as a faint line; the portion already
 * traveled (start → current time) renders darker. Sampling happens once
 * per play (memoized by the component); splitting is cheap per frame.
 */

import type { CourtPoint } from "@/features/play/engine/interpolate";
import { positionAt } from "@/features/play/engine/position";
import type { Path } from "@/features/play/schemas";

export type SampledPoint = CourtPoint & { time: number };

/** Evenly sample a path over the play duration (inclusive endpoints). */
export function samplePath(path: Path, duration: number, samples = 96): SampledPoint[] {
  const points: SampledPoint[] = [];
  for (let s = 0; s <= samples; s++) {
    const time = (duration * s) / samples;
    points.push({ time, ...positionAt(path, time) });
  }
  return points;
}

/**
 * Split a sampled path at time t into traveled and remaining segments.
 * Both include the exact current position so the two polylines meet
 * seamlessly under the player token.
 */
export function splitPathAt(
  sampled: readonly SampledPoint[],
  path: Path,
  t: number,
): { traveled: CourtPoint[]; remaining: CourtPoint[] } {
  const current = positionAt(path, t);
  const traveled: CourtPoint[] = [];
  const remaining: CourtPoint[] = [current];
  for (const point of sampled) {
    if (point.time <= t) traveled.push(point);
    else remaining.push(point);
  }
  traveled.push(current);
  return { traveled, remaining };
}

/** Points array → SVG polyline `points` attribute string. */
export function toPolylinePoints(points: readonly CourtPoint[]): string {
  let out = "";
  for (const point of points) {
    out += `${out ? " " : ""}${point.x.toFixed(2)},${point.y.toFixed(2)}`;
  }
  return out;
}
