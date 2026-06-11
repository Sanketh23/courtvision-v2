"use client";

/**
 * The editor store (ARCHITECTURE.md §7.2): one Zustand store, scoped to an
 * editor instance and discarded on unmount. Holds the editable play buffer,
 * selection, the timeline cursor, playback flag, the dirty flag, and the
 * in-memory undo/redo stacks.
 *
 * All play edits route through the pure mutators in mutations.ts; the store's
 * job is history + selection + flags, not animation math. Each committing
 * action snapshots the previous play onto the undo stack (UI_WORKFLOWS §7.8;
 * cross-session rewind is versioning, M8, and lives elsewhere).
 */

import { createStore } from "zustand/vanilla";
import {
  deleteKeyframe,
  moveKeyframePosition,
  moveKeyframeTime,
  nudgeKeyframe,
  type PlayMeta,
  renamePlayer,
  setDuration,
  updateMeta,
  upsertKeyframe,
} from "@/features/play/editor/mutations";
import type { Play } from "@/features/play/schemas";

/** A keyframe selection: a player slot + the keyframe index in its path. */
export type KeyframeSelection = { slot: number; index: number };

export type EditorState = {
  /** The editable play. Always schema-valid (mutators preserve invariants). */
  play: Play;
  /** Database id once saved; null for an unsaved new play. */
  playId: string | null;
  selectedSlot: number | null;
  selectedKeyframe: KeyframeSelection | null;
  /** Timeline cursor, in milliseconds. */
  cursor: number;
  isPlaying: boolean;
  /** "Show paths" toggle (UI_WORKFLOWS §13.9, default ON, persisted). */
  showPaths: boolean;
  /** Unsaved-changes flag (UI_WORKFLOWS §7.7). */
  isDirty: boolean;
  past: Play[];
  future: Play[];

  // selection / transport (non-committing)
  selectSlot: (slot: number | null) => void;
  selectKeyframe: (selection: KeyframeSelection | null) => void;
  setCursor: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  setShowPaths: (show: boolean) => void;

  // committing edits (snapshot history)
  dragPlayerTo: (slot: number, x: number, y: number) => void;
  moveKeyframePos: (slot: number, index: number, x: number, y: number) => void;
  moveKeyframeAtTime: (slot: number, index: number, time: number) => void;
  removeKeyframe: (slot: number, index: number) => void;
  nudgeSelected: (dx: number, dy: number) => void;
  changeDuration: (duration: number) => void;
  rename: (slot: number, label: string) => void;
  patchMeta: (meta: PlayMeta) => void;

  // history
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // persistence bookkeeping
  markSaved: (playId: string) => void;
};

const MAX_HISTORY = 100;

export type EditorStore = ReturnType<typeof createEditorStore>;

/** localStorage key for the persisted "show paths" preference (§13.9). */
const SHOW_PATHS_KEY = "cv:editor:show-paths";

function readShowPaths(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(SHOW_PATHS_KEY) !== "false";
}

export function createEditorStore(initialPlay: Play, playId: string | null) {
  return createStore<EditorState>((set, get) => {
    /** Apply a pure mutator, pushing the prior play onto the undo stack. */
    const commit = (mutate: (play: Play) => Play) => {
      const { play, past } = get();
      const next = mutate(play);
      if (next === play) return; // no-op (e.g. protected delete) — skip history
      set({
        play: next,
        past: [...past, play].slice(-MAX_HISTORY),
        future: [],
        isDirty: true,
      });
    };

    return {
      play: initialPlay,
      playId,
      selectedSlot: null,
      selectedKeyframe: null,
      cursor: 0,
      isPlaying: false,
      showPaths: readShowPaths(),
      isDirty: false,
      past: [],
      future: [],

      selectSlot: (slot) => set({ selectedSlot: slot, selectedKeyframe: null }),
      selectKeyframe: (selection) =>
        set({
          selectedKeyframe: selection,
          selectedSlot: selection?.slot ?? get().selectedSlot,
        }),
      setCursor: (time) => set({ cursor: Math.max(0, time) }),
      setPlaying: (playing) => set({ isPlaying: playing }),
      setShowPaths: (show) => {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(SHOW_PATHS_KEY, String(show));
        }
        set({ showPaths: show });
      },

      dragPlayerTo: (slot, x, y) => {
        const { cursor } = get();
        commit((play) => upsertKeyframe(play, slot, cursor, x, y));
      },
      moveKeyframePos: (slot, index, x, y) =>
        commit((play) => moveKeyframePosition(play, slot, index, x, y)),
      moveKeyframeAtTime: (slot, index, time) =>
        commit((play) => moveKeyframeTime(play, slot, index, time)),
      removeKeyframe: (slot, index) => {
        commit((play) => deleteKeyframe(play, slot, index));
        set({ selectedKeyframe: null });
      },
      nudgeSelected: (dx, dy) => {
        const { selectedKeyframe } = get();
        if (!selectedKeyframe) return;
        commit((play) =>
          nudgeKeyframe(play, selectedKeyframe.slot, selectedKeyframe.index, dx, dy),
        );
      },
      changeDuration: (duration) => commit((play) => setDuration(play, duration)),
      rename: (slot, label) => commit((play) => renamePlayer(play, slot, label)),
      patchMeta: (meta) => commit((play) => updateMeta(play, meta)),

      undo: () => {
        const { past, future, play } = get();
        const previous = past[past.length - 1];
        if (!previous) return;
        set({
          play: previous,
          past: past.slice(0, -1),
          future: [play, ...future].slice(0, MAX_HISTORY),
          isDirty: true,
        });
      },
      redo: () => {
        const { past, future, play } = get();
        const next = future[0];
        if (!next) return;
        set({
          play: next,
          past: [...past, play].slice(-MAX_HISTORY),
          future: future.slice(1),
          isDirty: true,
        });
      },
      canUndo: () => get().past.length > 0,
      canRedo: () => get().future.length > 0,

      markSaved: (savedId) => set({ playId: savedId, isDirty: false }),
    };
  });
}
