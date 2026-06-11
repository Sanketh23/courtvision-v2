"use client";

import { useCallback, useMemo, useRef } from "react";
import { Court } from "@/features/play/court/Court";
import { useEditor } from "@/features/play/editor/store-context";
import { positionAt } from "@/features/play/engine/position";
import { samplePath, splitPathAt, toPolylinePoints } from "@/features/play/viewer/paths";

/**
 * The editor canvas (UI_WORKFLOWS §7.4).
 *
 * Players render at their current-cursor interpolated position. Dragging a
 * player writes a keyframe at the cursor time (drag-to-keyframe); dragging a
 * keyframe dot on the selected path moves that keyframe's position. Pointer
 * coordinates are mapped from screen pixels into court space via the SVG's
 * bounding box.
 */
export function EditorCourt() {
  const play = useEditor((s) => s.play);
  const cursor = useEditor((s) => s.cursor);
  const showPaths = useEditor((s) => s.showPaths);
  const selectedSlot = useEditor((s) => s.selectedSlot);
  const selectedKeyframe = useEditor((s) => s.selectedKeyframe);
  const selectSlot = useEditor((s) => s.selectSlot);
  const selectKeyframe = useEditor((s) => s.selectKeyframe);
  const dragPlayerTo = useEditor((s) => s.dragPlayerTo);
  const moveKeyframePos = useEditor((s) => s.moveKeyframePos);

  const svgRef = useRef<SVGSVGElement>(null);

  /** Map a pointer event to court coordinates using the SVG's box. */
  const toCourt = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 94;
    return { x, y };
  }, []);

  // Drag a player token → keyframe at cursor time.
  const onPlayerPointerDown = useCallback(
    (slot: number) => (e: React.PointerEvent) => {
      e.preventDefault();
      selectSlot(slot);
      const target = e.currentTarget as Element;
      target.setPointerCapture(e.pointerId);

      const move = (ev: PointerEvent) => {
        const { x, y } = toCourt(ev.clientX, ev.clientY);
        dragPlayerTo(slot, x, y);
      };
      const up = () => {
        target.releasePointerCapture(e.pointerId);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [selectSlot, toCourt, dragPlayerTo],
  );

  // Drag a keyframe dot → move that keyframe's position.
  const onKeyframePointerDown = useCallback(
    (slot: number, index: number) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      selectKeyframe({ slot, index });
      const target = e.currentTarget as Element;
      target.setPointerCapture(e.pointerId);

      const move = (ev: PointerEvent) => {
        const { x, y } = toCourt(ev.clientX, ev.clientY);
        moveKeyframePos(slot, index, x, y);
      };
      const up = () => {
        target.releasePointerCapture(e.pointerId);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [selectKeyframe, moveKeyframePos, toCourt],
  );

  const sampled = useMemo(
    () => play.players.map((p) => ({ player: p, points: samplePath(p.path, play.duration) })),
    [play.players, play.duration],
  );

  return (
    <Court ref={svgRef} className="w-full touch-none select-none rounded-lg border border-border">
      {/* Paths */}
      {sampled.map(({ player, points }) => {
        if (!showPaths && player.slot !== selectedSlot) return null;
        const { traveled, remaining } = splitPathAt(points, player.path, cursor);
        const color = `var(--slot-${player.slot})`;
        const emphasized = player.slot === selectedSlot;
        return (
          <g key={player.id} fill="none" stroke={color} strokeLinecap="round">
            <polyline
              points={toPolylinePoints(remaining)}
              strokeWidth={emphasized ? 0.5 : 0.4}
              opacity={emphasized ? 0.45 : 0.2}
            />
            <polyline
              points={toPolylinePoints(traveled)}
              strokeWidth={emphasized ? 0.8 : 0.6}
              opacity={emphasized ? 0.75 : 0.4}
            />
          </g>
        );
      })}

      {/* Keyframe dots for the selected player */}
      {selectedSlot !== null &&
        play.players
          .filter((p) => p.slot === selectedSlot)
          .flatMap((player) =>
            player.path.keyframes.map((kf, index) => {
              const isSelected =
                selectedKeyframe?.slot === player.slot && selectedKeyframe.index === index;
              return (
                <circle
                  key={`${player.id}-kf-${kf.time}`}
                  cx={kf.x}
                  cy={kf.y}
                  r={isSelected ? 1.9 : 1.4}
                  fill="var(--court-surface)"
                  stroke={`var(--slot-${player.slot})`}
                  strokeWidth={isSelected ? 0.8 : 0.5}
                  className="cursor-grab"
                  onPointerDown={onKeyframePointerDown(player.slot, index)}
                />
              );
            }),
          )}

      {/* Player tokens */}
      {play.players.map((player) => {
        const pos = positionAt(player.path, cursor);
        const isSelected = player.slot === selectedSlot;
        return (
          <g
            key={player.id}
            data-testid={`player-token-${player.slot}`}
            transform={`translate(${pos.x} ${pos.y})`}
            className="cursor-grab"
            onPointerDown={onPlayerPointerDown(player.slot)}
          >
            <circle
              r="3"
              fill={isSelected ? `var(--slot-${player.slot})` : "var(--court-surface)"}
              stroke={`var(--slot-${player.slot})`}
              strokeWidth={isSelected ? 0.5 : 0.9}
            />
            <text
              y="0.2"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="2.4"
              fontWeight="700"
              fill={isSelected ? "#ffffff" : `var(--slot-${player.slot})`}
            >
              {player.label}
            </text>
          </g>
        );
      })}
    </Court>
  );
}
