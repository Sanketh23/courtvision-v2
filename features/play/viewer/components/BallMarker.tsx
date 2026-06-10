/** The ball: orange dot, with a flight ring while passed or shot. */
export function BallMarker({ x, y, inFlight }: { x: number; y: number; inFlight: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {inFlight && (
        <circle
          r="2.4"
          fill="none"
          stroke="var(--ball)"
          strokeWidth="0.3"
          strokeDasharray="0.9 0.7"
          opacity="0.8"
        />
      )}
      <circle r="1.4" fill="var(--ball)" stroke="var(--court-surface)" strokeWidth="0.3" />
    </g>
  );
}
