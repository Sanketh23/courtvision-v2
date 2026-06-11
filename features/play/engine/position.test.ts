import { describe, expect, it } from "vitest";
import { positionAt } from "@/features/play/engine/position";
import { spreadPr } from "@/features/play/fixtures";
import type { Path } from "@/features/play/schemas";

const linearPath: Path = {
  type: "linear",
  keyframes: [
    { time: 0, x: 10, y: 10 },
    { time: 1000, x: 30, y: 10 },
    { time: 2000, x: 30, y: 50 },
  ],
};

const cubicPath: Path = {
  type: "cubic",
  keyframes: [
    { time: 0, x: 20, y: 47 },
    { time: 3000, x: 45, y: 47 },
    { time: 5000, x: 50, y: 47 },
  ],
};

describe("positionAt", () => {
  it("returns the exact position at every keyframe time (linear and cubic)", () => {
    for (const path of [linearPath, cubicPath]) {
      for (const kf of path.keyframes) {
        expect(positionAt(path, kf.time)).toEqual({ x: kf.x, y: kf.y });
      }
    }
  });

  it("interpolates linearly between keyframes for linear paths", () => {
    expect(positionAt(linearPath, 500)).toEqual({ x: 20, y: 10 });
    expect(positionAt(linearPath, 1500)).toEqual({ x: 30, y: 30 });
    expect(positionAt(linearPath, 250)).toEqual({ x: 15, y: 10 });
  });

  it("clamps to the first keyframe before the path starts", () => {
    expect(positionAt(linearPath, -100)).toEqual({ x: 10, y: 10 });
    expect(positionAt(cubicPath, -1)).toEqual({ x: 20, y: 47 });
  });

  it("clamps to the last keyframe after the path ends", () => {
    expect(positionAt(linearPath, 999999)).toEqual({ x: 30, y: 50 });
    expect(positionAt(cubicPath, 5001)).toEqual({ x: 50, y: 47 });
  });

  it("returns the single keyframe's position for any t on a one-keyframe path", () => {
    const single: Path = { type: "cubic", keyframes: [{ time: 1000, x: 25, y: 30 }] };
    expect(positionAt(single, 0)).toEqual({ x: 25, y: 30 });
    expect(positionAt(single, 1000)).toEqual({ x: 25, y: 30 });
    expect(positionAt(single, 5000)).toEqual({ x: 25, y: 30 });
  });

  it("throws on an empty keyframe sequence", () => {
    const empty: Path = { type: "linear", keyframes: [] };
    expect(() => positionAt(empty, 0)).toThrow(/empty/);
  });

  it("produces continuous cubic motion (no teleporting between frames)", () => {
    // Sample at 60fps granularity; consecutive positions must stay close.
    let prev = positionAt(cubicPath, 0);
    for (let t = 16; t <= 5000; t += 16) {
      const next = positionAt(cubicPath, t);
      const dist = Math.hypot(next.x - prev.x, next.y - prev.y);
      expect(dist).toBeLessThan(1);
      prev = next;
    }
  });

  it("stays exactly in place on a stationary cubic path (no spline wobble)", () => {
    const still: Path = {
      type: "cubic",
      keyframes: [
        { time: 0, x: 50, y: 75 },
        { time: 2000, x: 50, y: 75 },
      ],
    };
    for (const t of [0, 333, 1000, 1667, 2000]) {
      expect(positionAt(still, t)).toEqual({ x: 50, y: 75 });
    }
  });

  it("matches known cubic curve positions (regression snapshot)", () => {
    const samples = [500, 1000, 1500, 2000, 2500, 3500, 4000, 4500].map((t) =>
      positionAt(cubicPath, t),
    );
    expect(samples).toMatchSnapshot();
  });

  it("interpolates the fixture play's PG path through its keyframes", () => {
    const pg = spreadPr.players[0];
    if (!pg) throw new Error("fixture missing PG");
    expect(positionAt(pg.path, 0)).toEqual({ x: 20, y: 47 });
    expect(positionAt(pg.path, 3000)).toEqual({ x: 45, y: 47 });
    expect(positionAt(pg.path, 5000)).toEqual({ x: 50, y: 47 });
    // Between keyframes the PG is strictly between start and screen point.
    const mid = positionAt(pg.path, 1500);
    expect(mid.x).toBeGreaterThan(20);
    expect(mid.x).toBeLessThan(45);
  });
});
