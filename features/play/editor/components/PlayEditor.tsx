"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { savePlayAction } from "@/features/play/actions";
import { EditorCourt } from "@/features/play/editor/components/EditorCourt";
import { EditorTopBar } from "@/features/play/editor/components/EditorTopBar";
import { PlayerRail } from "@/features/play/editor/components/PlayerRail";
import { PropertiesRail } from "@/features/play/editor/components/PropertiesRail";
import { Timeline } from "@/features/play/editor/components/Timeline";
import { EditorStoreProvider, useEditorStoreApi } from "@/features/play/editor/store-context";
import { useEditorPlayback } from "@/features/play/editor/use-editor-playback";
import { useEditorShortcuts } from "@/features/play/editor/use-editor-shortcuts";
import type { Play } from "@/features/play/schemas";

/** Editor needs a desktop-class viewport (UI_WORKFLOWS §13.6). */
const MIN_EDITOR_WIDTH = 1024;

export function PlayEditor({ play, playId }: { play: Play; playId: string | null }) {
  return (
    <EditorStoreProvider initialPlay={play} playId={playId}>
      <DesktopGuard>
        <EditorShell />
      </DesktopGuard>
    </EditorStoreProvider>
  );
}

/** A single save handler shared by the top bar button and Cmd+S. */
function EditorShell() {
  const router = useRouter();
  const store = useEditorStoreApi();
  const [, startTransition] = useTransition();
  const savingRef = useRef(false);

  useEditorPlayback();

  const save = useCallback(() => {
    if (savingRef.current) return;
    savingRef.current = true;
    startTransition(async () => {
      const { playId, play } = store.getState();
      try {
        const { id } = await savePlayAction({ playId, play });
        store.getState().markSaved(id);
        if (!playId) router.replace(`/play/${id}/edit`);
      } finally {
        savingRef.current = false;
      }
    });
  }, [router, store]);

  useEditorShortcuts(save);

  // Warn on navigating away with unsaved changes (UI_WORKFLOWS §7.7).
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (store.getState().isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [store]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <EditorTopBar onSave={save} />
      <div className="flex min-h-0 flex-1">
        <aside className="w-56 shrink-0 overflow-y-auto border-r border-border p-3">
          <PlayerRail />
        </aside>
        <main className="flex min-w-0 flex-1 items-center justify-center p-6">
          <div className="w-full max-w-xl">
            <EditorCourt />
          </div>
        </main>
        <aside className="w-64 shrink-0 overflow-y-auto border-l border-border p-3">
          <PropertiesRail />
        </aside>
      </div>
      <Timeline />
    </div>
  );
}

/** Blocks the editor below desktop width with a friendly message. */
function DesktopGuard({ children }: { children: React.ReactNode }) {
  const [wide, setWide] = useState(true);

  useEffect(() => {
    const check = () => setWide(window.innerWidth >= MIN_EDITOR_WIDTH);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!wide) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 px-6 text-center">
        <h1 className="text-lg font-semibold">The editor needs a larger screen</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Open this on a laptop or tablet (at least {MIN_EDITOR_WIDTH}px wide) to build a play.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
