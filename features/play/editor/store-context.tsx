"use client";

import { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";
import {
  createEditorStore,
  type EditorState,
  type EditorStore,
} from "@/features/play/editor/store";
import type { Play } from "@/features/play/schemas";

/**
 * Provides one editor store per editor instance (ARCHITECTURE.md §7.2) and a
 * selector hook. The store is created once via a ref so it survives re-renders
 * but is fresh per mount — and discarded when the editor unmounts.
 */
const EditorStoreContext = createContext<EditorStore | null>(null);

export function EditorStoreProvider({
  initialPlay,
  playId,
  children,
}: {
  initialPlay: Play;
  playId: string | null;
  children: React.ReactNode;
}) {
  const storeRef = useRef<EditorStore>(null);
  if (storeRef.current === null) {
    storeRef.current = createEditorStore(initialPlay, playId);
  }
  return (
    <EditorStoreContext.Provider value={storeRef.current}>{children}</EditorStoreContext.Provider>
  );
}

/** Subscribe to a slice of editor state. */
export function useEditor<T>(selector: (state: EditorState) => T): T {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error("useEditor must be used within an EditorStoreProvider");
  return useStore(store, selector);
}

/** The raw store API (getState/subscribe), for rAF loops and shortcuts. */
export function useEditorStoreApi(): EditorStore {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error("useEditorStoreApi must be used within an EditorStoreProvider");
  return store;
}
