"use client";

import { useMemo } from "react";
import { Court } from "@/features/play/court/Court";
import type { Play } from "@/features/play/schemas";
import { ActionOverlays } from "@/features/play/viewer/components/ActionOverlays";
import { BallMarker } from "@/features/play/viewer/components/BallMarker";
import { PlayerPaths } from "@/features/play/viewer/components/PlayerPaths";
import { PlayerToken } from "@/features/play/viewer/components/PlayerToken";
import { StepsList } from "@/features/play/viewer/components/StepsList";
import { TransportControls } from "@/features/play/viewer/components/TransportControls";
import { stepsFromActions } from "@/features/play/viewer/steps";
import { usePlayEngine } from "@/features/play/viewer/use-play-engine";

/**
 * The play viewer (UI_WORKFLOWS.md §8 mobile, §9 desktop).
 *
 * Single component for both layouts: a vertical stack that becomes a
 * 60/40 two-column grid at ≥800px — court + transport left, steps right,
 * coach's notes full-width below.
 */
export function PlayViewer({ play }: { play: Play }) {
  const engine = usePlayEngine(play);

  const steps = useMemo(() => stepsFromActions(play.actions, play.players), [play]);
  const actionTimes = useMemo(() => steps.map((step) => step.time), [steps]);

  const ball = engine.ballAt(engine.currentTime);

  return (
    <div className="space-y-5">
      {/* Title block */}
      <div>
        <h1 className="text-xl font-semibold">{play.name}</h1>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <MetaPill>{play.category}</MetaPill>
          {play.formation && <MetaPill>{play.formation}</MetaPill>}
          {play.tags.map((tag) => (
            <MetaPill key={tag}>{tag}</MetaPill>
          ))}
        </div>
      </div>

      <div className="grid gap-6 min-[800px]:grid-cols-[3fr_2fr]">
        {/* Court + transport */}
        <div className="space-y-4">
          <Court className="w-full rounded-lg border border-border">
            <PlayerPaths play={play} currentTime={engine.currentTime} />
            <ActionOverlays overlays={engine.overlays} currentTime={engine.currentTime} />
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
          <TransportControls engine={engine} actionTimes={actionTimes} />
        </div>

        {/* Steps */}
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Steps</h2>
          <StepsList steps={steps} currentTime={engine.currentTime} onSeek={engine.seek} />
        </div>
      </div>

      {/* Notes from coach — hidden entirely if empty (UI_WORKFLOWS.md §8.6) */}
      {play.description && (
        <div className="border-t border-border pt-4">
          <h2 className="mb-1 text-sm font-medium text-muted-foreground">Notes from coach</h2>
          <p className="text-sm leading-relaxed">{play.description}</p>
        </div>
      )}
    </div>
  );
}

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs capitalize text-secondary-foreground">
      {children}
    </span>
  );
}
