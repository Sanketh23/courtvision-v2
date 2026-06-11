import { describe, expect, it } from "vitest";
import { ballPositionAt } from "@/features/play/engine/ball";
import { regenerateBallStates } from "@/features/play/engine/ball-regen";
import { positionAt } from "@/features/play/engine/position";
import { giveAndGo, spreadPr, stationary } from "@/features/play/fixtures";
import { ballStateSchema } from "@/features/play/schemas";

describe("regenerateBallStates", () => {
  it("produces a schema-valid BallState from fixture actions", () => {
    for (const play of [spreadPr, giveAndGo, stationary]) {
      const regenerated = regenerateBallStates(play.actions, play.players, play.duration);
      expect(() => ballStateSchema.parse(regenerated)).not.toThrow();
      // Contract: spans the full play.
      expect(regenerated.keyframes[0]?.time).toBe(0);
      expect(regenerated.keyframes[regenerated.keyframes.length - 1]?.time).toBe(play.duration);
    }
  });

  it("is deterministic: same input always yields the same output", () => {
    const a = regenerateBallStates(giveAndGo.actions, giveAndGo.players, giveAndGo.duration);
    const b = regenerateBallStates(giveAndGo.actions, giveAndGo.players, giveAndGo.duration);
    expect(a).toEqual(b);
  });

  it("starts the ball with the first ball-handler", () => {
    const regenerated = regenerateBallStates(
      giveAndGo.actions,
      giveAndGo.players,
      giveAndGo.duration,
    );
    // PG initiates the first pass, so the ball starts at PG's t=0 position.
    expect(regenerated.keyframes[0]).toMatchObject({ time: 0, x: 30, y: 40, inFlight: false });
  });

  it("flies the ball between players on a pass and glues it to the receiver after", () => {
    const regenerated = regenerateBallStates(
      giveAndGo.actions,
      giveAndGo.players,
      giveAndGo.duration,
    );
    // Mid-flight during the first pass (1000 → 1400): between PG and SG.
    const midFlight = ballPositionAt(regenerated, 1200);
    expect(midFlight.inFlight).toBe(true);
    expect(midFlight.x).toBeGreaterThan(30);
    expect(midFlight.x).toBeLessThan(70);
    // At arrival the ball is exactly at the receiver's position.
    const arrival = ballPositionAt(regenerated, 1400);
    const receiver = giveAndGo.players.find((p) => p.id === "player_1");
    if (!receiver) throw new Error("fixture missing receiver");
    expect(arrival.x).toBeCloseTo(positionAt(receiver.path, 1400).x, 5);
    expect(arrival.y).toBeCloseTo(positionAt(receiver.path, 1400).y, 5);
    // Held by the receiver between the passes.
    expect(ballPositionAt(regenerated, 2000).inFlight).toBe(false);
  });

  it("stays glued to a moving holder between transfers", () => {
    const regenerated = regenerateBallStates(
      giveAndGo.actions,
      giveAndGo.players,
      giveAndGo.duration,
    );
    // After the return pass (arrives t=3000) PG is cutting; until the shot
    // at t=3200 the ball must track PG's moving position the whole way.
    const pg = giveAndGo.players.find((p) => p.id === "player_0");
    if (!pg) throw new Error("fixture missing PG");
    let maxDrift = 0;
    for (let t = 3000; t <= 3200; t += 25) {
      const ball = ballPositionAt(regenerated, t);
      const holder = positionAt(pg.path, t);
      maxDrift = Math.max(maxDrift, Math.hypot(ball.x - holder.x, ball.y - holder.y));
    }
    expect(maxDrift).toBeLessThan(0.5);
  });

  it("sends a shot to the basket and leaves the ball resting there", () => {
    const regenerated = regenerateBallStates(
      giveAndGo.actions,
      giveAndGo.players,
      giveAndGo.duration,
    );
    const atRim = ballPositionAt(regenerated, 3800);
    expect(atRim.x).toBeCloseTo(50, 5);
    expect(atRim.y).toBeCloseTo(89, 5);
    const end = ballPositionAt(regenerated, 4000);
    expect(end.x).toBeCloseTo(50, 5);
    expect(end.y).toBeCloseTo(89, 5);
    expect(end.inFlight).toBe(false);
  });

  it("defaults possession to the lowest slot when no actions exist", () => {
    const regenerated = regenerateBallStates([], stationary.players, stationary.duration);
    // Slot 0 (PG) holds at (25, 30) for the whole play.
    expect(regenerated.keyframes[0]).toMatchObject({ x: 25, y: 30, inFlight: false });
    const last = regenerated.keyframes[regenerated.keyframes.length - 1];
    expect(last).toMatchObject({ time: 2000, x: 25, y: 30, inFlight: false });
  });

  it("regenerates consistent states from the Spread P&R actions (snapshot)", () => {
    const regenerated = regenerateBallStates(spreadPr.actions, spreadPr.players, spreadPr.duration);
    expect(regenerated).toMatchSnapshot();
  });
});
