import { describe, expect, it } from "vitest";
import { ballPositionAt } from "@/features/play/engine/ball";
import { giveAndGo, spreadPr } from "@/features/play/fixtures";
import type { BallState } from "@/features/play/schemas";

const ballWithPass: BallState = {
  type: "linear",
  keyframes: [
    { time: 0, x: 30, y: 40, inFlight: false },
    { time: 2500, x: 30, y: 40, inFlight: false },
    { time: 3500, x: 70, y: 40, inFlight: true },
    { time: 5000, x: 70, y: 40, inFlight: false },
  ],
};

describe("ballPositionAt", () => {
  it("returns exact positions and flags at keyframe times", () => {
    expect(ballPositionAt(ballWithPass, 0)).toEqual({ x: 30, y: 40, inFlight: false });
    expect(ballPositionAt(ballWithPass, 2500)).toEqual({ x: 30, y: 40, inFlight: false });
    expect(ballPositionAt(ballWithPass, 3500)).toEqual({ x: 70, y: 40, inFlight: true });
    expect(ballPositionAt(ballWithPass, 5000)).toEqual({ x: 70, y: 40, inFlight: false });
  });

  it("marks in-flight balls correctly mid-pass", () => {
    const duringPass = ballPositionAt(ballWithPass, 3000);
    expect(duringPass.inFlight).toBe(true);
    expect(duringPass.x).toBe(50); // linear midpoint of 30 → 70
    expect(duringPass.y).toBe(40);
  });

  it("reports held (not in flight) while possessed between keyframes", () => {
    expect(ballPositionAt(ballWithPass, 1000).inFlight).toBe(false);
    expect(ballPositionAt(ballWithPass, 4000).inFlight).toBe(false);
  });

  it("clamps position and flag outside the keyframe range", () => {
    expect(ballPositionAt(ballWithPass, -50)).toEqual({ x: 30, y: 40, inFlight: false });
    expect(ballPositionAt(ballWithPass, 99999)).toEqual({ x: 70, y: 40, inFlight: false });
  });

  it("tracks the give-and-go fixture: held, first pass, return pass, shot", () => {
    // Held by PG before anything happens.
    expect(ballPositionAt(giveAndGo.ball, 500).inFlight).toBe(false);
    // First pass in the air (1000 → 1400).
    const firstPass = ballPositionAt(giveAndGo.ball, 1200);
    expect(firstPass.inFlight).toBe(true);
    expect(firstPass.x).toBe(50); // halfway between PG (30) and SG (70)
    // Held by SG between passes.
    expect(ballPositionAt(giveAndGo.ball, 2000).inFlight).toBe(false);
    // Return pass in the air (2600 → 3000).
    expect(ballPositionAt(giveAndGo.ball, 2800).inFlight).toBe(true);
    // Shot in the air (3200 → 3800), ending at the basket.
    expect(ballPositionAt(giveAndGo.ball, 3500).inFlight).toBe(true);
    expect(ballPositionAt(giveAndGo.ball, 3800)).toEqual({ x: 50, y: 89, inFlight: true });
    // At rest after the play.
    expect(ballPositionAt(giveAndGo.ball, 4000).inFlight).toBe(false);
  });

  it("matches known ball positions for the Spread P&R fixture (snapshot)", () => {
    const samples = [0, 1000, 2000, 3000, 4000, 5000].map((t) => ballPositionAt(spreadPr.ball, t));
    expect(samples).toMatchSnapshot();
  });
});
