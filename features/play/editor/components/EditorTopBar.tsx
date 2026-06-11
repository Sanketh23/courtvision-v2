"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { VersionHistoryModal } from "@/features/play/editor/components/VersionHistoryModal";
import { useEditor } from "@/features/play/editor/store-context";
import { cn } from "@/lib/utils";

/**
 * Editor top bar (UI_WORKFLOWS §7.2): inline name, status pill, save state,
 * and the undo / redo / show-paths / preview / save controls. Save is the
 * only primary button; the save handler is owned by the editor shell so the
 * Save button and Cmd+S share one path.
 */
export function EditorTopBar({ onSave }: { onSave: () => void }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const play = useEditor((s) => s.play);
  const playId = useEditor((s) => s.playId);
  const isDirty = useEditor((s) => s.isDirty);
  const showPaths = useEditor((s) => s.showPaths);
  const setShowPaths = useEditor((s) => s.setShowPaths);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const canUndo = useEditor((s) => s.canUndo());
  const canRedo = useEditor((s) => s.canRedo());
  const patchMeta = useEditor((s) => s.patchMeta);

  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/playbook")}
          aria-label="Back to playbook"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M19 12H5m0 0l7 7m-7-7l7-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <input
          value={play.name}
          onChange={(e) => patchMeta({ name: e.target.value })}
          aria-label="Play name"
          className="w-56 rounded-md border border-transparent px-2 py-1 text-base font-semibold hover:border-input focus:border-input focus:outline-none"
        />

        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium capitalize text-amber-800">
          {play.status}
        </span>

        <span className="text-xs text-muted-foreground">
          {isDirty ? "Unsaved changes" : "Saved"}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <SecondaryButton onClick={undo} disabled={!canUndo} label="Undo">
          ↶
        </SecondaryButton>
        <SecondaryButton onClick={redo} disabled={!canRedo} label="Redo">
          ↷
        </SecondaryButton>
        <button
          type="button"
          onClick={() => setShowPaths(!showPaths)}
          aria-pressed={showPaths}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
            showPaths
              ? "bg-accent text-accent-foreground"
              : "bg-secondary text-secondary-foreground",
          )}
        >
          Show paths
        </button>
        <button
          type="button"
          onClick={() => playId && router.push(`/play/${playId}`)}
          disabled={!playId}
          className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground disabled:opacity-50"
        >
          Preview
        </button>
        <button
          type="button"
          onClick={onSave}
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Save
        </button>

        {/* Kebab menu (UI_WORKFLOWS §10: version history entry point) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="More options"
            aria-expanded={menuOpen}
            className="rounded-md px-2 py-1.5 text-muted-foreground hover:bg-secondary"
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-border bg-card py-1 shadow-md">
              <button
                type="button"
                disabled={!playId}
                title={playId ? undefined : "Save the play first"}
                onClick={() => {
                  setMenuOpen(false);
                  setHistoryOpen(true);
                }}
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-secondary disabled:opacity-50"
              >
                Version history
              </button>
            </div>
          )}
        </div>

        {historyOpen && playId && (
          <VersionHistoryModal playId={playId} onClose={() => setHistoryOpen(false)} />
        )}
      </div>
    </header>
  );
}

function SecondaryButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-md bg-secondary px-2.5 py-1.5 text-sm text-secondary-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}
