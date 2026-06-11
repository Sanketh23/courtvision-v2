"use client";

import { useEffect } from "react";
import { useEditorStoreApi } from "@/features/play/editor/store-context";

/**
 * Drives the editor cursor while playing (preview). A lightweight rAF loop
 * that advances `cursor` by real elapsed time and pauses at the end. Distinct
 * from the viewer's usePlayEngine — the editor reads/writes cursor in the
 * Zustand store, not local React state.
 *
 * Reads the live cursor via the store API (getState) inside the loop so it
 * always sees the latest value, including external scrubs.
 */
export function useEditorPlayback() {
  const store = useEditorStoreApi();
  const isPlaying = store.getState().isPlaying;

  useEffect(() => {
    if (!isPlaying) return;
    let frame: number;
    let last = performance.now();

    const tick = (now: number) => {
      const { cursor, play, setCursor, setPlaying } = store.getState();
      const next = cursor + (now - last);
      last = now;
      if (next >= play.duration) {
        setCursor(play.duration);
        setPlaying(false);
        return;
      }
      setCursor(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, store]);
}
