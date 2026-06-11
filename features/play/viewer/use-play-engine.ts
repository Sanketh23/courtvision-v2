"use client";

/**
 * The React renderer's bridge to the pure engine (ANIMATION_DESIGN.md §4).
 *
 * Owns playback state and the requestAnimationFrame loop; delegates all
 * math to features/play/engine/. Time advances by real elapsed
 * milliseconds × speed, so playback speed is monitor-independent.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type BallPoint, ballPositionAt } from "@/features/play/engine/ball";
import type { CourtPoint } from "@/features/play/engine/interpolate";
import { type Overlay, overlaysFromActions } from "@/features/play/engine/overlays";
import { positionAt } from "@/features/play/engine/position";
import type { Play } from "@/features/play/schemas";

export type PlaybackSpeed = 0.5 | 1 | 2;

export type PlayEngine = {
  isPlaying: boolean;
  /** Current position in the play, in milliseconds. */
  currentTime: number;
  speed: PlaybackSpeed;
  isLooping: boolean;
  duration: number;
  /** Precomputed once per play (ANIMATION_DESIGN.md §3.3). */
  overlays: Overlay[];

  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  toggleLoop: () => void;

  positionOf: (slot: number, t: number) => CourtPoint;
  ballAt: (t: number) => BallPoint;
};

export function usePlayEngine(play: Play): PlayEngine {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [isLooping, setIsLooping] = useState(false);

  // The rAF loop reads/writes this ref and mirrors it into state; reading
  // state inside the loop would close over a stale value.
  const timeRef = useRef(0);

  const overlays = useMemo(
    () => overlaysFromActions(play.actions, play.players),
    [play.actions, play.players],
  );

  const pathsBySlot = useMemo(() => {
    const paths = new Map(play.players.map((player) => [player.slot, player.path]));
    return paths;
  }, [play.players]);

  const duration = play.duration;

  useEffect(() => {
    if (!isPlaying) return;

    let frameId: number;
    let last = performance.now();

    const animate = (now: number) => {
      const delta = (now - last) * speed;
      last = now;
      let next = timeRef.current + delta;

      if (next >= duration) {
        if (isLooping) {
          next = next % duration;
        } else {
          // Auto-pause on the final frame (UI_WORKFLOWS.md §9.4).
          timeRef.current = duration;
          setCurrentTime(duration);
          setIsPlaying(false);
          return;
        }
      }

      timeRef.current = next;
      setCurrentTime(next);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, speed, isLooping, duration]);

  const playFn = useCallback(() => {
    // Play at the end restarts from the top (UI_WORKFLOWS.md §9.4).
    if (timeRef.current >= duration) {
      timeRef.current = 0;
      setCurrentTime(0);
    }
    setIsPlaying(true);
  }, [duration]);

  const pause = useCallback(() => setIsPlaying(false), []);

  const seek = useCallback(
    (time: number) => {
      const clamped = Math.min(Math.max(time, 0), duration);
      timeRef.current = clamped;
      setCurrentTime(clamped);
    },
    [duration],
  );

  const toggleLoop = useCallback(() => setIsLooping((looping) => !looping), []);

  const positionOf = useCallback(
    (slot: number, t: number): CourtPoint => {
      const path = pathsBySlot.get(slot);
      // Unknown slot: court center, never a crash (engine stays graceful).
      return path ? positionAt(path, t) : { x: 50, y: 47 };
    },
    [pathsBySlot],
  );

  const ballAt = useCallback((t: number) => ballPositionAt(play.ball, t), [play.ball]);

  return {
    isPlaying,
    currentTime,
    speed,
    isLooping,
    duration,
    overlays,
    play: playFn,
    pause,
    seek,
    setSpeed,
    toggleLoop,
    positionOf,
    ballAt,
  };
}
