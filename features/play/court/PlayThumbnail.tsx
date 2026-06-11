import { Court } from "@/features/play/court/Court";
import { positionAt } from "@/features/play/engine/position";
import { type Play, playSchema } from "@/features/play/schemas";
import { samplePath, toPolylinePoints } from "@/features/play/viewer/paths";

/**
 * A play tile thumbnail (UI_WORKFLOWS §5.5): the court with each player's
 * motion path and starting position, generated from `play.data` on the fly —
 * no caching, no raster. At thumbnail size, paths + start dots communicate
 * the play's shape better than tokens and labels would.
 *
 * Accepts the raw (unvalidated) body; renders an empty court if it doesn't
 * parse, so one bad row can't break the whole playbook grid.
 */
export function PlayThumbnail({ data, className }: { data: unknown; className?: string }) {
  const parsed = playSchema.safeParse(data);
  const play: Play | null = parsed.success ? parsed.data : null;

  return (
    <Court className={className}>
      {play?.players.map((player) => {
        const points = samplePath(player.path, play.duration, 32);
        const start = positionAt(player.path, 0);
        const color = `var(--slot-${player.slot})`;
        return (
          <g key={player.id} pointerEvents="none">
            <polyline
              points={toPolylinePoints(points)}
              fill="none"
              stroke={color}
              strokeWidth="0.9"
              strokeLinecap="round"
              opacity="0.55"
            />
            <circle cx={start.x} cy={start.y} r="2.2" fill={color} />
          </g>
        );
      })}
    </Court>
  );
}
