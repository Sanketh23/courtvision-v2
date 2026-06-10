import type { Overlay } from "@/features/play/engine/overlays";
import { toPolylinePoints } from "@/features/play/viewer/paths";

/**
 * Visual action cues drawn over the court while their time window is
 * active (ANIMATION_DESIGN.md §8): pass arrows, screen marks, cut
 * dashes, and shot arcs.
 */
export function ActionOverlays({
  overlays,
  currentTime,
}: {
  overlays: readonly Overlay[];
  currentTime: number;
}) {
  const visible = overlays.filter(
    (overlay) => overlay.time <= currentTime && currentTime <= overlay.time + overlay.duration,
  );

  return (
    <g fill="none">
      {visible.map((overlay) => {
        switch (overlay.type) {
          case "pass_arrow":
            return (
              <CurvedArrow
                key={overlay.id}
                from={overlay.data.from}
                to={overlay.data.to}
                bow={4}
                dashed={false}
              />
            );
          case "screen_mark":
            // Circle around the screener (ANIMATION_DESIGN.md §8.2).
            return (
              <circle
                key={overlay.id}
                cx={overlay.data.at.x}
                cy={overlay.data.at.y}
                r="4.2"
                stroke="var(--foreground)"
                strokeWidth="0.4"
                strokeDasharray="1.2 0.8"
                opacity="0.7"
              />
            );
          case "cut_marker":
            return (
              <polyline
                key={overlay.id}
                points={toPolylinePoints(overlay.data.points)}
                stroke={`var(--slot-${overlay.data.slot})`}
                strokeWidth="0.8"
                strokeDasharray="1.6 1.2"
                opacity="0.9"
              />
            );
          case "shot_arc":
            return (
              <CurvedArrow
                key={overlay.id}
                from={overlay.data.from}
                to={overlay.data.to}
                bow={7}
                dashed
              />
            );
          default:
            return null;
        }
      })}
    </g>
  );
}

/**
 * A quadratic arc with an arrowhead. The control point sits `bow` units
 * perpendicular to the chord midpoint, biased upward (smaller y) so passes
 * and shots read as lobs, not ground balls.
 */
function CurvedArrow({
  from,
  to,
  bow,
  dashed,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  bow: number;
  dashed: boolean;
}) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  // Perpendicular unit vector, flipped if needed so the bow points up-court.
  let nx = -dy / length;
  let ny = dx / length;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const cx = midX + nx * bow;
  const cy = midY + ny * bow;

  // Arrowhead aligned with the curve's end tangent (end − control).
  const tx = to.x - cx;
  const ty = to.y - cy;
  const tLength = Math.hypot(tx, ty) || 1;
  const ux = tx / tLength;
  const uy = ty / tLength;
  const size = 2;
  const leftX = to.x - ux * size - uy * (size * 0.6);
  const leftY = to.y - uy * size + ux * (size * 0.6);
  const rightX = to.x - ux * size + uy * (size * 0.6);
  const rightY = to.y - uy * size - ux * (size * 0.6);

  return (
    <g stroke="var(--foreground)" strokeWidth="0.5" opacity="0.85">
      <path
        d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
        strokeDasharray={dashed ? "1.6 1.2" : undefined}
      />
      <path d={`M ${leftX} ${leftY} L ${to.x} ${to.y} L ${rightX} ${rightY}`} />
    </g>
  );
}
