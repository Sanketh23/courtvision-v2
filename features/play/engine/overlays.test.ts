import { describe, expect, it } from "vitest";
import { overlaysFromActions } from "@/features/play/engine/overlays";
import { giveAndGo, spreadPr } from "@/features/play/fixtures";
import type { Action } from "@/features/play/schemas";

describe("overlaysFromActions", () => {
  it("creates a pass_arrow from passer position to receiver position", () => {
    const overlays = overlaysFromActions(spreadPr.actions, spreadPr.players);
    const arrow = overlays.find((o) => o.type === "pass_arrow");
    if (arrow?.type !== "pass_arrow") throw new Error("expected a pass_arrow overlay");

    // Pass: player_0 → player_1 at t=3000, duration 500.
    expect(arrow.time).toBe(3000);
    expect(arrow.duration).toBe(500);
    expect(arrow.data.fromSlot).toBe(0);
    expect(arrow.data.toSlot).toBe(1);
    // Passer is exactly at their t=3000 keyframe.
    expect(arrow.data.from).toEqual({ x: 45, y: 47 });
    // Receiver position is taken at arrival time (t=3500), mid-path for SG.
    expect(arrow.data.to.x).toBeCloseTo(76.5, 1);
  });

  it("creates a screen_mark at the screener's position", () => {
    const overlays = overlaysFromActions(spreadPr.actions, spreadPr.players);
    const mark = overlays.find((o) => o.type === "screen_mark");
    if (mark?.type !== "screen_mark") throw new Error("expected a screen_mark overlay");
    expect(mark.time).toBe(2000);
    expect(mark.data.slot).toBe(3); // PF sets the screen
  });

  it("creates a cut_marker with a sampled polyline along the cutter's path", () => {
    const overlays = overlaysFromActions(giveAndGo.actions, giveAndGo.players);
    const cut = overlays.find((o) => o.type === "cut_marker");
    if (cut?.type !== "cut_marker") throw new Error("expected a cut_marker overlay");
    expect(cut.data.slot).toBe(0);
    expect(cut.data.points.length).toBeGreaterThanOrEqual(2);
    expect(cut.data.points.length).toBeLessThanOrEqual(32);
    // Polyline starts where the cut starts and ends where it ends.
    expect(cut.data.points[0]).toEqual({ x: 30, y: 40 });
    expect(cut.data.points[cut.data.points.length - 1]).toEqual({ x: 48, y: 75 });
  });

  it("creates a shot_arc from the shot location to the basket", () => {
    const overlays = overlaysFromActions(giveAndGo.actions, giveAndGo.players);
    const arc = overlays.find((o) => o.type === "shot_arc");
    if (arc?.type !== "shot_arc") throw new Error("expected a shot_arc overlay");
    expect(arc.data.from).toEqual({ x: 48, y: 76 });
    expect(arc.data.to).toEqual({ x: 50, y: 89 });
    expect(arc.data.slot).toBe(0);
  });

  it("creates no overlays for dribble, catch, or handoff actions", () => {
    const actions: Action[] = [
      { id: "a1", type: "dribble", player: "player_0", time: 0, duration: 1000 },
      { id: "a2", type: "catch", player: "player_1", time: 1000, duration: 100 },
      { id: "a3", type: "handoff", from: "player_0", to: "player_1", time: 2000, duration: 200 },
    ];
    expect(overlaysFromActions(actions, spreadPr.players)).toEqual([]);
  });

  it("skips actions that reference unknown players instead of throwing", () => {
    const actions: Action[] = [
      { id: "bad", type: "pass", from: "player_0", to: "ghost", time: 0, duration: 500 },
      {
        id: "ok",
        type: "screen",
        screener: "player_3",
        target: "player_0",
        time: 0,
        duration: 500,
      },
    ];
    const overlays = overlaysFromActions(actions, spreadPr.players);
    expect(overlays).toHaveLength(1);
    expect(overlays[0]?.type).toBe("screen_mark");
  });

  it("is deterministic and stable for a fixture play (snapshot)", () => {
    expect(overlaysFromActions(spreadPr.actions, spreadPr.players)).toMatchSnapshot();
  });
});
