import { describe, expect, it } from "vitest";
import { catmullRom, lerp } from "@/features/play/engine/catmull";

describe("catmullRom", () => {
  it("returns exactly p1 at t=0 and exactly p2 at t=1", () => {
    expect(catmullRom(0, 10, 20, 30, 0)).toBe(10);
    expect(catmullRom(0, 10, 20, 30, 1)).toBe(20);
    // Also with irregular neighbors — endpoints must not be affected.
    expect(catmullRom(-50, 10, 20, 100, 0)).toBe(10);
    expect(catmullRom(-50, 10, 20, 100, 1)).toBe(20);
  });

  it("interpolates the midpoint of evenly spaced points exactly halfway", () => {
    // For equidistant collinear points the spline degenerates to a line.
    expect(catmullRom(0, 10, 20, 30, 0.5)).toBe(15);
  });

  it("stays put when all control points are identical (zero motion)", () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(catmullRom(42, 42, 42, 42, t)).toBe(42);
    }
  });

  it("produces a smooth, continuous curve (no jumps between close samples)", () => {
    let prev = catmullRom(0, 10, 50, 60, 0);
    for (let t = 0.01; t <= 1; t += 0.01) {
      const next = catmullRom(0, 10, 50, 60, t);
      expect(Math.abs(next - prev)).toBeLessThan(1.5);
      prev = next;
    }
  });

  it("matches known curve values (regression snapshot)", () => {
    const samples = [0.1, 0.25, 0.5, 0.75, 0.9].map((t) => catmullRom(0, 10, 50, 60, t));
    expect(samples).toMatchSnapshot();
  });
});

describe("lerp", () => {
  it("returns endpoints at t=0 and t=1", () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it("interpolates linearly", () => {
    expect(lerp(10, 20, 0.5)).toBe(15);
    expect(lerp(0, 100, 0.3)).toBe(30);
    expect(lerp(20, 10, 0.5)).toBe(15);
  });
});
