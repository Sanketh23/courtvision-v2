/**
 * Action → render-ready overlay specs (ANIMATION_DESIGN.md §3.3, §8).
 *
 * Computed once per play load, not per frame: overlays don't change while
 * a play animates, so the renderer just filters this list by current time.
 * Actions referencing unknown players are skipped — schema validation
 * upstream is responsible for rejecting them; the engine stays graceful.
 */

import type { CourtPoint } from "@/features/play/engine/interpolate";
import { positionAt } from "@/features/play/engine/position";
import { type Action, BASKET, type Player } from "@/features/play/schemas";

type OverlayBase = {
  id: string;
  /** When the overlay becomes visible, in milliseconds. */
  time: number;
  /** How long it stays visible, in milliseconds. */
  duration: number;
};

export type PassArrowOverlay = OverlayBase & {
  type: "pass_arrow";
  data: { from: CourtPoint; to: CourtPoint; fromSlot: number; toSlot: number };
};

export type ScreenMarkOverlay = OverlayBase & {
  type: "screen_mark";
  data: { at: CourtPoint; slot: number };
};

export type CutMarkerOverlay = OverlayBase & {
  type: "cut_marker";
  data: { slot: number; points: CourtPoint[] };
};

export type ShotArcOverlay = OverlayBase & {
  type: "shot_arc";
  data: { from: CourtPoint; to: CourtPoint; slot: number };
};

export type Overlay = PassArrowOverlay | ScreenMarkOverlay | CutMarkerOverlay | ShotArcOverlay;

/** Sampling step for cut-marker polylines, in milliseconds. */
const CUT_SAMPLE_MS = 100;
/** Upper bound on cut polyline points, to keep overlays small. */
const CUT_MAX_POINTS = 32;

/**
 * Build the overlay list for a play's actions.
 *
 * pass → arrow from the passer (at action start) to the receiver (at action
 * end); screen → mark at the screener; cut → polyline sampled along the
 * cutter's path; shot → arc from the shot location to the basket.
 * Dribble, catch, and handoff produce no overlay (per the design doc).
 */
export function overlaysFromActions(
  actions: readonly Action[],
  players: readonly Player[],
): Overlay[] {
  const byId = new Map(players.map((player) => [player.id, player]));
  const overlays: Overlay[] = [];

  for (const action of actions) {
    switch (action.type) {
      case "pass": {
        const from = byId.get(action.from);
        const to = byId.get(action.to);
        if (!from || !to) break;
        overlays.push({
          id: `overlay_${action.id}`,
          type: "pass_arrow",
          time: action.time,
          duration: action.duration,
          data: {
            from: positionAt(from.path, action.time),
            to: positionAt(to.path, action.time + action.duration),
            fromSlot: from.slot,
            toSlot: to.slot,
          },
        });
        break;
      }
      case "screen": {
        const screener = byId.get(action.screener);
        if (!screener) break;
        overlays.push({
          id: `overlay_${action.id}`,
          type: "screen_mark",
          time: action.time,
          duration: action.duration,
          data: { at: positionAt(screener.path, action.time), slot: screener.slot },
        });
        break;
      }
      case "cut": {
        const cutter = byId.get(action.player);
        if (!cutter) break;
        const steps = Math.min(
          CUT_MAX_POINTS - 1,
          Math.max(1, Math.ceil(action.duration / CUT_SAMPLE_MS)),
        );
        const points: CourtPoint[] = [];
        for (let s = 0; s <= steps; s++) {
          points.push(positionAt(cutter.path, action.time + (action.duration * s) / steps));
        }
        overlays.push({
          id: `overlay_${action.id}`,
          type: "cut_marker",
          time: action.time,
          duration: action.duration,
          data: { slot: cutter.slot, points },
        });
        break;
      }
      case "shot": {
        const shooter = byId.get(action.player);
        if (!shooter) break;
        overlays.push({
          id: `overlay_${action.id}`,
          type: "shot_arc",
          time: action.time,
          duration: action.duration,
          data: { from: { ...action.location }, to: { ...BASKET }, slot: shooter.slot },
        });
        break;
      }
      // No overlay for these (ANIMATION_DESIGN.md §3.3).
      case "dribble":
      case "handoff":
      case "catch":
        break;
    }
  }

  return overlays;
}
