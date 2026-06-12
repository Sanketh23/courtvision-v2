"use client";

import { useCallback, useEffect, useState } from "react";
import { restorePlayAction } from "@/features/play/actions";
import { Court } from "@/features/play/court/Court";
import {
  getPlayVersionData,
  listPlayVersions,
  type PlayVersionSummary,
} from "@/features/play/queries";
import type { Play } from "@/features/play/schemas";
import { BallMarker } from "@/features/play/viewer/components/BallMarker";
import { PlayerToken } from "@/features/play/viewer/components/PlayerToken";
import { usePlayEngine } from "@/features/play/viewer/use-play-engine";
import { createClient } from "@/lib/supabase/client";
import { cn, formatRelativeTime } from "@/lib/utils";

/**
 * Version history (UI_WORKFLOWS §10): versions newest-first with the current
 * one highlighted, a read-only scrubable preview when a row is clicked
 * (§10.3), and a confirm-then-restore flow (§10.2). After a restore the
 * editor reloads with the restored state.
 */
export function VersionHistoryModal({ playId, onClose }: { playId: string; onClose: () => void }) {
  const [versions, setVersions] = useState<PlayVersionSummary[] | null>(null);
  const [previewVersion, setPreviewVersion] = useState<number | null>(null);
  const [previewPlay, setPreviewPlay] = useState<Play | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    listPlayVersions(supabase, playId)
      .then(setVersions)
      .catch((e: Error) => setError(e.message));
  }, [playId]);

  const openPreview = useCallback(
    (versionNumber: number) => {
      setPreviewVersion(versionNumber);
      setPreviewPlay(null);
      const supabase = createClient();
      getPlayVersionData(supabase, playId, versionNumber)
        .then(setPreviewPlay)
        .catch((e: Error) => setError(e.message));
    },
    [playId],
  );

  const restore = useCallback(
    async (versionNumber: number) => {
      setIsRestoring(true);
      setError(null);
      try {
        await restorePlayAction({ playId, versionNumber });
        // Full reload remounts the editor store with the restored play
        // ("editor reloads with the restored play", §10.2).
        window.location.reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Restore failed");
        setIsRestoring(false);
      }
    },
    [playId],
  );

  const current = versions?.[0]?.versionNumber;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Version history"
    >
      <div className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="font-semibold">Version history</h2>
            <p className="text-xs text-muted-foreground">
              {versions ? `${versions.length} versions` : "Loading…"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close version history"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
          >
            ✕
          </button>
        </div>

        {error && <p className="px-5 py-2 text-sm text-destructive">{error}</p>}

        <div className="flex min-h-0 flex-1">
          {/* Version list */}
          <ul className="w-1/2 overflow-y-auto border-r border-border p-3">
            {versions?.map((version) => {
              const isCurrent = version.versionNumber === current;
              return (
                <li key={version.versionNumber}>
                  <div
                    className={cn(
                      "mb-1 rounded-md border px-3 py-2",
                      previewVersion === version.versionNumber
                        ? "border-primary bg-accent/60"
                        : "border-transparent hover:bg-secondary",
                      isCurrent && "bg-accent/40",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => openPreview(version.versionNumber)}
                      className="block w-full text-left"
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <span className="font-medium">v{version.versionNumber}</span>
                        <span className="truncate">{version.changeSummary}</span>
                        {isCurrent && (
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
                            Current
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {formatRelativeTime(version.createdAt)} · {version.changeSource}
                      </span>
                    </button>

                    {!isCurrent &&
                      (confirming === version.versionNumber ? (
                        <div className="mt-2 rounded-md bg-secondary/70 p-2 text-xs">
                          <p className="mb-2">
                            Restoring will create a new version (v{(current ?? 0) + 1}). Earlier
                            versions are kept. Proceed?
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isRestoring}
                              onClick={() => restore(version.versionNumber)}
                              className="rounded bg-primary px-2 py-1 font-medium text-primary-foreground disabled:opacity-60"
                            >
                              {isRestoring ? "Restoring…" : "Proceed"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirming(null)}
                              className="rounded bg-card px-2 py-1"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirming(version.versionNumber)}
                          className="mt-1 text-xs font-medium text-primary hover:underline"
                        >
                          Restore
                        </button>
                      ))}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Preview pane (§10.3) */}
          <div className="flex w-1/2 items-center justify-center p-4">
            {previewVersion === null ? (
              <p className="text-sm text-muted-foreground">
                Click a version to preview it before restoring.
              </p>
            ) : previewPlay === null ? (
              <p className="text-sm text-muted-foreground">Loading preview…</p>
            ) : (
              <VersionPreview key={previewVersion} play={previewPlay} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** A compact, read-only scrubable preview of a past version. */
function VersionPreview({ play }: { play: Play }) {
  const engine = usePlayEngine(play);
  const ball = engine.ballAt(engine.currentTime);

  return (
    <div className="w-full space-y-2">
      <Court className="w-full rounded-md border border-border">
        {play.players.map((player) => {
          const pos = engine.positionOf(player.slot, engine.currentTime);
          return (
            <PlayerToken
              key={player.id}
              x={pos.x}
              y={pos.y}
              slot={player.slot}
              label={player.label}
            />
          );
        })}
        <BallMarker x={ball.x} y={ball.y} inFlight={ball.inFlight} />
      </Court>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={engine.isPlaying ? engine.pause : engine.play}
          aria-label={engine.isPlaying ? "Pause preview" : "Play preview"}
          className="rounded-full bg-primary p-1.5 text-primary-foreground"
        >
          {engine.isPlaying ? "⏸" : "▶"}
        </button>
        <input
          type="range"
          min={0}
          max={engine.duration}
          step={1}
          value={engine.currentTime}
          onChange={(e) => engine.seek(Number(e.target.value))}
          aria-label="Preview timeline"
          className="flex-1 accent-[var(--primary)]"
        />
        <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
          {(engine.currentTime / 1000).toFixed(1)}s / {(engine.duration / 1000).toFixed(1)}s
        </span>
      </div>
    </div>
  );
}
