/**
 * Ball-state regeneration from actions (ANIMATION_DESIGN.md §9,
 * AI_INTEGRATION.md §14).
 *
 * The ball's motion is *derived* data: passes, handoffs, and shots fully
 * determine where the ball must be. This pure, deterministic function turns
 * an action list into ball keyframes, so the editor (M6) and the future AI
 * pipeline never hand-author ball positions. Same input → same output.
 *
 * Model: the ball is always either (a) possessed — glued to the holder's
 * interpolated position — or (b) in transit between players (pass/handoff)
 * or toward the basket (shot). Possession intervals are sampled at a fixed
 * step so the ball tracks a moving holder between transfer events.
 *
 * Output is `type: "linear"`, deviating from the `'cubic'` sketched in
 * ANIMATION_DESIGN.md §9 — deliberately. Uniform Catmull-Rom (per-segment
 * normalized t, §3.4) overshoots wildly when a short possession segment
 * neighbors a long flight segment: the far flight keyframe acts as the
 * spline neighbor and drags the ball off the holder's hands after every
 * catch. Linear is also semantically right here: flights are straight
 * lines, and dense possession samples inherit the smoothness of the
 * holder's (cubic) path. Flagged as a doc amendment.
 */

import { positionAt } from "@/features/play/engine/position";
import {
  type Action,
  BASKET,
  type BallKeyframe,
  type BallState,
  type Player,
} from "@/features/play/schemas";

/**
 * Sample step while the ball follows its holder, in milliseconds.
 * Dense enough that linear segments between samples track a curving
 * holder with sub-pixel error at render scale.
 */
const POSSESSION_SAMPLE_MS = 100;

type TransferEvent = {
  time: number;
  end: number;
  fromId: string;
  /** null = ball heads to the basket (shot). */
  toId: string | null;
  /** Shots/passes fly; handoffs are handed over, never airborne. */
  inFlight: boolean;
  /** Fixed origin (shot location); otherwise the holder's position is used. */
  origin?: { x: number; y: number };
};

/** The player who has the ball when the play starts, per the action list. */
function initialHolderId(actions: readonly Action[], players: readonly Player[]): string | null {
  for (const action of actions) {
    switch (action.type) {
      case "pass":
      case "handoff":
        return action.from;
      case "dribble":
      case "shot":
      case "catch":
        return action.player;
      case "screen":
        break;
    }
  }
  // No ball-relevant actions: default to the lowest slot, deterministically.
  const sorted = [...players].sort((a, b) => a.slot - b.slot);
  return sorted[0]?.id ?? null;
}

export function regenerateBallStates(
  actions: readonly Action[],
  players: readonly Player[],
  duration: number,
): BallState {
  const byId = new Map(players.map((player) => [player.id, player]));
  const keyframes: BallKeyframe[] = [];

  const push = (time: number, x: number, y: number, inFlight: boolean) => {
    const t = Math.min(Math.max(time, 0), duration);
    const lastKf = keyframes[keyframes.length - 1];
    // Keyframe times must be strictly increasing; the first write at a
    // given time wins (it's the possession sample the transfer departs from).
    if (lastKf && t <= lastKf.time) return;
    keyframes.push({ time: t, x, y, inFlight });
  };

  /** Glue the ball to `holder` from `fromT` to `toT`, sampling as it moves. */
  const followHolder = (holderId: string | null, fromT: number, toT: number) => {
    if (toT <= fromT) return;
    const holder = holderId ? byId.get(holderId) : undefined;
    if (!holder) {
      // No holder (after a shot, or unknown ref): the ball rests in place.
      const rest = keyframes[keyframes.length - 1];
      if (rest) push(toT, rest.x, rest.y, false);
      return;
    }
    for (let t = fromT; t < toT; t += POSSESSION_SAMPLE_MS) {
      const pos = positionAt(holder.path, t);
      push(t, pos.x, pos.y, false);
    }
    const end = positionAt(holder.path, toT);
    push(toT, end.x, end.y, false);
  };

  // Transfer events in time order (ties broken by id for determinism).
  const transfers: TransferEvent[] = actions
    .filter(
      (a): a is Action & { type: "pass" | "handoff" | "shot" } =>
        a.type === "pass" || a.type === "handoff" || a.type === "shot",
    )
    .map((a) =>
      a.type === "shot"
        ? {
            time: a.time,
            end: a.time + a.duration,
            fromId: a.player,
            toId: null,
            inFlight: true,
            origin: a.location,
          }
        : {
            time: a.time,
            end: a.time + a.duration,
            fromId: a.from,
            toId: a.to,
            inFlight: a.type === "pass",
          },
    )
    .sort((a, b) => a.time - b.time || a.end - b.end);

  let holderId = initialHolderId(actions, players);
  let cursor = 0;

  // Seed the ball at t=0 with the initial holder (or court center as a
  // deterministic fallback for a play with no players — schema forbids it,
  // but the engine never throws on odd data).
  const seedHolder = holderId ? byId.get(holderId) : undefined;
  const seed = seedHolder ? positionAt(seedHolder.path, 0) : { x: 50, y: 47 };
  push(0, seed.x, seed.y, false);

  for (const transfer of transfers) {
    if (transfer.time >= duration) break;
    // Ball rides with the current holder up to the moment of transfer.
    followHolder(holderId, cursor, transfer.time);

    const from = byId.get(transfer.fromId);
    const origin = transfer.origin ?? (from ? positionAt(from.path, transfer.time) : undefined);
    if (!origin) {
      // Unknown source player: skip the transfer gracefully.
      continue;
    }
    push(transfer.time, origin.x, origin.y, false);

    const arrivalT = Math.min(transfer.end, duration);
    if (transfer.toId === null) {
      // Shot: ball flies to the basket and rests there.
      push(arrivalT, BASKET.x, BASKET.y, transfer.inFlight);
      holderId = null;
    } else {
      const receiver = byId.get(transfer.toId);
      if (receiver) {
        const arrival = positionAt(receiver.path, arrivalT);
        push(arrivalT, arrival.x, arrival.y, transfer.inFlight);
        holderId = transfer.toId;
      }
    }
    cursor = arrivalT;
  }

  // Ride out the rest of the play with the final holder.
  followHolder(holderId, cursor, duration);

  // Guarantee the contract: a final keyframe exactly at `duration`…
  const lastKf = keyframes[keyframes.length - 1];
  if (lastKf && lastKf.time < duration) {
    push(duration, lastKf.x, lastKf.y, false);
  }
  // …and at least two keyframes overall (schema minimum).
  const only = keyframes[0];
  if (keyframes.length === 1 && only) {
    keyframes.push({ ...only, time: duration });
  }

  // Linear, not cubic — see the module doc for why.
  return { keyframes, type: "linear" };
}
