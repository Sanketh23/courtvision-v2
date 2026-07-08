"use client";

import { useCallback, useRef, useState } from "react";
import { actionSlots } from "@/features/play/editor/action-mutations";
import { useEditor } from "@/features/play/editor/store-context";
import type { Action } from "@/features/play/schemas";
import { cn } from "@/lib/utils";

/**
 * Bottom timeline (UI_WORKFLOWS §7.6): a master scrubber row with play/pause
 * and time readout, plus collapsible per-slot lanes. Each lane shows the
 * player's keyframes as draggable dots (drag = change time) and the actions
 * they're involved in as labeled bars (drag = move start time, drag the
 * right edge = resize duration, click = select; Delete removes it).
 */
export function Timeline() {
  const play = useEditor((s) => s.play);
  const cursor = useEditor((s) => s.cursor);
  const isPlaying = useEditor((s) => s.isPlaying);
  const setCursor = useEditor((s) => s.setCursor);
  const setPlaying = useEditor((s) => s.setPlaying);
  const selectedSlots = useEditor((s) => s.selectedSlots);
  const selectedActionId = useEditor((s) => s.selectedActionId);
  const selectSlot = useEditor((s) => s.selectSlot);
  const selectKeyframe = useEditor((s) => s.selectKeyframe);
  const selectAction = useEditor((s) => s.selectAction);
  const moveKeyframeAtTime = useEditor((s) => s.moveKeyframeAtTime);
  const moveAction = useEditor((s) => s.moveAction);
  const resizeActionTo = useEditor((s) => s.resizeActionTo);
  const beginGesture = useEditor((s) => s.beginGesture);
  const endGesture = useEditor((s) => s.endGesture);

  const [lanesOpen, setLanesOpen] = useState(true);
  const duration = play.duration;
  const primarySlot = selectedSlots[0] ?? null;

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
          step={1}
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
        <div className="max-h-48 space-y-0.5 overflow-y-auto px-4 pb-3">
          {play.players.map((player) => {
            const laneActions = play.actions.filter((action) =>
              actionSlots(play, action).includes(player.slot),
            );
            return (
              <Lane
                key={player.id}
                slot={player.slot}
                label={player.label}
                duration={duration}
                keyframes={player.path.keyframes}
                actions={laneActions}
                selectedActionId={selectedActionId}
                selected={player.slot === primarySlot}
                onSelectSlot={() => selectSlot(player.slot)}
                onSelectKeyframe={(index) => selectKeyframe({ slot: player.slot, index })}
                onMoveKeyframe={(index, time) => moveKeyframeAtTime(player.slot, index, time)}
                onSelectAction={selectAction}
                onMoveAction={moveAction}
                onResizeAction={resizeActionTo}
                onGestureStart={beginGesture}
                onGestureEnd={endGesture}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Pixel zone at a bar's right edge that triggers resize instead of move. */
const RESIZE_HANDLE_PX = 8;

function Lane({
  slot,
  label,
  duration,
  keyframes,
  actions,
  selectedActionId,
  selected,
  onSelectSlot,
  onSelectKeyframe,
  onMoveKeyframe,
  onSelectAction,
  onMoveAction,
  onResizeAction,
  onGestureStart,
  onGestureEnd,
}: {
  slot: number;
  label: string;
  duration: number;
  keyframes: ReadonlyArray<{ time: number }>;
  actions: ReadonlyArray<Action>;
  selectedActionId: string | null;
  selected: boolean;
  onSelectSlot: () => void;
  onSelectKeyframe: (index: number) => void;
  onMoveKeyframe: (index: number, time: number) => void;
  onSelectAction: (id: string) => void;
  onMoveAction: (id: string, time: number) => void;
  onResizeAction: (id: string, duration: number) => void;
  onGestureStart: () => void;
  onGestureEnd: () => void;
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
      onGestureStart();
      const move = (ev: PointerEvent) => onMoveKeyframe(index, timeFromClientX(ev.clientX));
      const up = () => {
        onGestureEnd();
        target.releasePointerCapture(e.pointerId);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [onMoveKeyframe, onSelectKeyframe, timeFromClientX, onGestureStart, onGestureEnd],
  );

  const onBarPointerDown = useCallback(
    (action: Action) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSelectAction(action.id);

      const bar = e.currentTarget as HTMLElement;
      const barRect = bar.getBoundingClientRect();
      const isResize = e.clientX > barRect.right - RESIZE_HANDLE_PX;
      // For a move, keep the grab offset so the bar doesn't jump.
      const grabOffsetMs = timeFromClientX(e.clientX) - action.time;

      bar.setPointerCapture(e.pointerId);
      onGestureStart();
      const move = (ev: PointerEvent) => {
        const t = timeFromClientX(ev.clientX);
        if (isResize) {
          onResizeAction(action.id, t - action.time);
        } else {
          onMoveAction(action.id, t - grabOffsetMs);
        }
      };
      const up = () => {
        onGestureEnd();
        bar.releasePointerCapture(e.pointerId);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [onMoveAction, onResizeAction, onSelectAction, timeFromClientX, onGestureStart, onGestureEnd],
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
        className={cn("relative h-7 flex-1 rounded", selected ? "bg-accent/40" : "bg-secondary/60")}
      >
        {/* Action bars (behind the keyframe dots) */}
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            data-testid={`action-bar-${action.id}`}
            onPointerDown={onBarPointerDown(action)}
            aria-label={`${action.type} at ${(action.time / 1000).toFixed(1)}s`}
            className={cn(
              "absolute top-1 bottom-1 cursor-grab overflow-hidden rounded border px-1 text-left text-[9px] font-medium capitalize leading-5",
              action.id === selectedActionId
                ? "border-primary bg-primary/25 text-primary"
                : "border-transparent text-muted-foreground",
            )}
            style={{
              left: `${(action.time / duration) * 100}%`,
              width: `${Math.max((action.duration / duration) * 100, 2)}%`,
              ...(action.id !== selectedActionId && {
                backgroundColor: `color-mix(in srgb, var(--slot-${slot}) 22%, transparent)`,
              }),
            }}
          >
            {action.type}
          </button>
        ))}

        {/* Keyframe dots */}
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
