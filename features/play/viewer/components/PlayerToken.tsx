/** A player on the court: colored disc + position label (PG, SG, …). */
export function PlayerToken({
  x,
  y,
  slot,
  label,
}: {
  x: number;
  y: number;
  slot: number;
  label: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="3" fill={`var(--slot-${slot})`} stroke="var(--court-surface)" strokeWidth="0.4" />
      <text
        y="0.2"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="2.4"
        fontWeight="700"
        fill="#ffffff"
      >
        {label}
      </text>
    </g>
  );
}
