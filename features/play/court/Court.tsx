import type { ReactNode } from "react";
import { COURT_HEIGHT, COURT_WIDTH } from "@/features/play/schemas";

/**
 * The shared half-court SVG (ANIMATION_DESIGN.md §2, DATA_MODEL.md §2).
 *
 * Renders in normalized court space — viewBox "0 0 100 94", basket at
 * (50, 89) — so children (player tokens, ball, overlays) position
 * themselves directly in play coordinates with no conversion.
 *
 * Geometry is sketch-accurate, not regulation-accurate: 1 unit ≈ 0.5 ft,
 * sized to read clearly at phone width.
 */
export function Court({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${COURT_WIDTH} ${COURT_HEIGHT}`}
      className={className}
      role="img"
      aria-labelledby="court-title"
    >
      <title id="court-title">
        Basketball half-court diagram with players, ball, and play actions
      </title>

      {/* Surface */}
      <rect
        x="0"
        y="0"
        width={COURT_WIDTH}
        height={COURT_HEIGHT}
        fill="var(--court-surface)"
        stroke="var(--court-line)"
        strokeWidth="0.6"
      />

      <g fill="none" stroke="var(--court-line)" strokeWidth="0.45">
        {/* Center circle (half, at the midcourt line y=0) */}
        <path d="M 38 0 A 12 12 0 0 0 62 0" />

        {/* Three-point line: corner segments + arc around the basket */}
        <path d="M 8 94 L 8 89 A 42 42 0 0 1 92 89 L 92 94" />

        {/* Lane (key) and free-throw circle */}
        <rect x="34" y="56" width="32" height="38" />
        <circle cx="50" cy="56" r="12" />

        {/* Backboard and rim */}
        <line x1="44" y1="91.5" x2="56" y2="91.5" strokeWidth="0.8" />
        <circle cx="50" cy="89" r="1.6" stroke="var(--ball)" strokeWidth="0.5" />
      </g>

      {children}
    </svg>
  );
}
