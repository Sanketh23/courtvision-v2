"use client";

import { useCallback, useRef, useState } from "react";
import { useEditor } from "@/features/play/editor/store-context";
import { cn } from "@/lib/utils";

/**
 * Bottom timeline (UI_WORKFLOWS §7.6): a master scrubber row with play/pause
 * and time readout, plus collapsible per-slot lanes. Each lane shows a
 * player's keyframes as draggable dots; dragging a dot changes its time.
 */
export function Timeline() {
  const play = useEditor((s) => s.play);
  const cursor = useEditor((s) => s.cursor);
  const isPlaying = useEditor((s) => s.isPlaying);
  const setCursor = useEditor((s) => s.setCursor);
  const setPlaying = useEditor((s) => s.setPlaying);
  const selectedSlot = useEditor((s) => s.selectedSlot);
  const selectSlot = useEditor((s) => s.selectSlot);
  const selectKeyframe = useEditor((s) => s.selectKeyframe);
  const moveKeyframeAtTime = useEditor((s) => s.moveKeyframeAtTime);

  const [lanesOpen, setLanesOpen] = useState(true);
  const duration = play.duration;

  return (
    <div className="border-t border-border bg-card">
      {/* Master row */}
      <div className="flex items-center gap-3 px-4 py-2">
        <button
          type="button"
          onClick={() => setPlaying(!isPlaying)}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="rounded-full bg-primary p-2 text-primary-foreground"
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86a1 1 0 00-1.5.86z" />
            </svg>
          )}
        </button>

        <span className="w-12 text-xs tabular-nums text-muted-foreground">
          {(cursor / 1000).toFixed(1)}s
        </span>

        <input
          type="range"
          min={0}
          max={duration}
          step={16}
          value={Math.min(cursor, duration)}
          onChange={(e) => setCursor(Number(e.target.value))}
          aria-label="Timeline scrubber"
          className="flex-1 accent-[var(--primary)]"
        />

        <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
          {(duration / 1000).toFixed(1)}s
        </span>

        <button
          type="button"
          onClick={() => setLanesOpen((open) => !open)}
          aria-expanded={lanesOpen}
          className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
          aria-label={lanesOpen ? "Collapse lanes" : "Expand lanes"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className={cn("transition-transform", lanesOpen ? "rotate-180" : "")}
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Per-slot lanes */}
      {lanesOpen && (
        <div className="max-h-44 space-y-0.5 overflow-y-auto px-4 pb-3">
          {play.players.map((player) => (
            <Lane
              key={player.id}
              slot={player.slot}
              label={player.label}
              duration={duration}
              keyframes={player.path.keyframes}
              selected={player.slot === selectedSlot}
              onSelectSlot={() => selectSlot(player.slot)}
              onSelectKeyframe={(index) => selectKeyframe({ slot: player.slot, index })}
              onMoveKeyframe={(index, time) => moveKeyframeAtTime(player.slot, index, time)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Lane({
  slot,
  label,
  duration,
  keyframes,
  selected,
  onSelectSlot,
  onSelectKeyframe,
  onMoveKeyframe,
}: {
  slot: number;
  label: string;
  duration: number;
  keyframes: ReadonlyArray<{ time: number }>;
  selected: boolean;
  onSelectSlot: () => void;
  onSelectKeyframe: (index: number) => void;
  onMoveKeyframe: (index: number, time: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const timeFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      return Math.min(Math.max(ratio, 0), 1) * duration;
    },
    [duration],
  );

  const onDotPointerDown = useCallback(
    (index: number) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSelectKeyframe(index);
      const target = e.currentTarget as Element;
      target.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => onMoveKeyframe(index, timeFromClientX(ev.clientX));
      const up = () => {
        target.releasePointerCapture(e.pointerId);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [onMoveKeyframe, onSelectKeyframe, timeFromClientX],
  );

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onSelectSlot}
        className={cn(
          "w-10 shrink-0 rounded px-1 py-1 text-left text-[11px] font-medium",
          selected ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </button>
      <div
        ref={trackRef}
        className={cn("relative h-6 flex-1 rounded", selected ? "bg-accent/40" : "bg-secondary/60")}
      >
        {keyframes.map((kf, index) => (
          <button
            // Keyframe times are unique within a path, so slot+time is stable.
            key={`${slot}-${kf.time}`}
            type="button"
            onPointerDown={onDotPointerDown(index)}
            aria-label={`Keyframe at ${(kf.time / 1000).toFixed(1)}s`}
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-[var(--court-surface)]"
            style={{
              left: `${(kf.time / duration) * 100}%`,
              backgroundColor: `var(--slot-${slot})`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
