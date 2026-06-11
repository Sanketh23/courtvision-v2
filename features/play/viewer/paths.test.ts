import { describe, expect, it } from "vitest";
import { giveAndGo } from "@/features/play/fixtures";
import { samplePath, splitPathAt, toPolylinePoints } from "@/features/play/viewer/paths";

const pgPath = giveAndGo.players[0]?.path;
if (!pgPath) throw new Error("fixture missing PG path");

describe("samplePath", () => {
  it("samples inclusive endpoints across the play duration", () => {
    const sampled = samplePath(pgPath, giveAndGo.duration, 10);
    expect(sampled).toHaveLength(11);
    expect(sampled[0]).toMatchObject({ time: 0, x: 30, y: 40 });
    expect(sampled[10]).toMatchObject({ time: 4000, x: 50, y: 80 });
  });
});

describe("splitPathAt", () => {
  it("splits into traveled and remaining, both meeting at the current point", () => {
    const sampled = samplePath(pgPath, giveAndGo.duration, 8); // every 500ms
    const { traveled, remaining } = splitPathAt(sampled, pgPath, 2250);
    // Current position: halfway through the cut (1500 → 3000) = (39, 57.5).
    const seam = { x: 39, y: 57.5 };
    expect(traveled[traveled.length - 1]).toEqual(seam);
    expect(remaining[0]).toEqual(seam);
    // 5 samples at t ≤ 2250 (0..2000) + the seam.
    expect(traveled).toHaveLength(6);
    // Seam + 4 samples after (2500..4000).
    expect(remaining).toHaveLength(5);
  });

  it("puts everything in traveled at the end of the play", () => {
    const sampled = samplePath(pgPath, giveAndGo.duration, 8);
    const { traveled, remaining } = splitPathAt(sampled, pgPath, 4000);
    expect(traveled).toHaveLength(10);
    expect(remaining).toHaveLength(1); // just the seam point
  });
});

describe("toPolylinePoints", () => {
  it("formats points for the SVG points attribute", () => {
    expect(
      toPolylinePoints([
        { x: 30, y: 40 },
        { x: 39.123, y: 57.456 },
      ]),
    ).toBe("30.00,40.00 39.12,57.46");
    expect(toPolylinePoints([])).toBe("");
  });
});
