import { useMemo } from "react";
import type { Play } from "@/features/play/schemas";
import { samplePath, splitPathAt, toPolylinePoints } from "@/features/play/viewer/paths";

/**
 * Player motion paths (UI_WORKFLOWS.md §13.3): the full path as a faint
 * line in the player's slot color, with the traveled portion darker and
 * slightly thicker. Sampling is memoized per play; only the split is
 * recomputed each frame.
 */
export function PlayerPaths({ play, currentTime }: { play: Play; currentTime: number }) {
  const sampled = useMemo(
    () =>
      play.players.map((player) => ({ player, points: samplePath(player.path, play.duration) })),
    [play.players, play.duration],
  );

  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
      {sampled.map(({ player, points }) => {
        const { traveled, remaining } = splitPathAt(points, player.path, currentTime);
        const color = `var(--slot-${player.slot})`;
        return (
          <g key={player.id} stroke={color}>
            <polyline points={toPolylinePoints(remaining)} strokeWidth="0.4" opacity="0.25" />
            <polyline points={toPolylinePoints(traveled)} strokeWidth="0.7" opacity="0.6" />
          </g>
        );
      })}
    </g>
  );
}
