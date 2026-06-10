/**
 * Catmull-Rom spline interpolation (ANIMATION_DESIGN.md §3.4).
 *
 * Catmull-Rom is the cubic we use for player motion because it passes
 * through every control point exactly — a player is *at* each keyframe at
 * its time — while curving smoothly between them. The curve between p1 and
 * p2 is shaped by the neighbors p0 and p3: each segment's tangent at p1 is
 * (p2 - p0) / 2 and at p2 is (p3 - p1) / 2, which is what makes adjacent
 * segments join without kinks.
 */

/**
 * Interpolate between p1 and p2 at normalized parameter t ∈ [0, 1],
 * with p0 and p3 as the shaping neighbors. Operates on one axis;
 * call once for x and once for y.
 *
 * At t=0 this returns exactly p1; at t=1 exactly p2.
 */
export function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;

  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

/** Linear interpolation between p1 and p2 at normalized t ∈ [0, 1]. */
export function lerp(p1: number, p2: number, t: number): number {
  return p1 + (p2 - p1) * t;
}
