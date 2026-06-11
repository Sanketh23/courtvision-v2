"use client";

import { formatSeconds } from "@/features/play/viewer/steps";
import type { PlaybackSpeed, PlayEngine } from "@/features/play/viewer/use-play-engine";
import { cn } from "@/lib/utils";

const SPEEDS: PlaybackSpeed[] = [0.5, 1, 2];

/**
 * Playback controls (UI_WORKFLOWS.md §8.4): time readout + speed pills,
 * scrubber with action tick marks, loop toggle, and the play/pause button.
 */
export function TransportControls({
  engine,
  actionTimes,
}: {
  engine: PlayEngine;
  actionTimes: readonly number[];
}) {
  return (
    <div className="space-y-3">
      {/* Time readout + speed pills */}
      <div className="flex items-center justify-between">
        <span className="text-sm tabular-nums text-muted-foreground">
          {formatSeconds(engine.currentTime)} / {formatSeconds(engine.duration)}
        </span>
        <fieldset className="flex gap-1">
          <legend className="sr-only">Playback speed</legend>
          {SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => engine.setSpeed(speed)}
              aria-pressed={engine.speed === speed}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                engine.speed === speed
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent",
              )}
            >
              {speed}×
            </button>
          ))}
        </fieldset>
      </div>

      {/* Scrubber with action tick marks */}
      <div className="relative">
        <input
          type="range"
          min={0}
          max={engine.duration}
          step={16}
          value={engine.currentTime}
          onChange={(e) => engine.seek(Number(e.target.value))}
          aria-label="Play timeline"
          className="w-full accent-[var(--primary)]"
        />
        <div className="pointer-events-none absolute inset-x-0 top-full flex h-1.5">
          {actionTimes.map((time) => (
            <span
              key={time}
              className="absolute h-1.5 w-0.5 rounded bg-muted-foreground/60"
              style={{ left: `${(time / engine.duration) * 100}%` }}
            />
          ))}
        </div>
      </div>

      {/* Loop + play/pause */}
      <div className="flex items-center justify-center gap-6 pt-1">
        <button
          type="button"
          onClick={engine.toggleLoop}
          aria-pressed={engine.isLooping}
          aria-label="Loop playback"
          className={cn(
            "rounded-full p-2 transition-colors",
            engine.isLooping
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-secondary",
          )}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M17 2l4 4-4 4M7 22l-4-4 4-4M3 11v-1a4 4 0 014-4h14M21 13v1a4 4 0 01-4 4H3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={engine.isPlaying ? engine.pause : engine.play}
          aria-label={engine.isPlaying ? "Pause" : "Play"}
          className="rounded-full bg-primary p-4 text-primary-foreground shadow-sm transition-transform hover:scale-105"
        >
          {engine.isPlaying ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86a1 1 0 00-1.5.86z" />
            </svg>
          )}
        </button>

        {/* Spacer balancing the loop button so play/pause stays centered. */}
        <span className="w-[34px]" aria-hidden="true" />
      </div>
    </div>
  );
}
