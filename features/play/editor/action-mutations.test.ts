import { describe, expect, it } from "vitest";
import {
  actionSlots,
  addAction,
  deleteAction,
  moveActionTime,
  resizeAction,
} from "@/features/play/editor/action-mutations";
import { isActionValidForSelection } from "@/features/play/editor/action-rules";
import { createNewPlay } from "@/features/play/editor/formations";
import { upsertKeyframe } from "@/features/play/editor/mutations";
import { ballPositionAt } from "@/features/play/engine/ball";
import { playSchema } from "@/features/play/schemas";

function freshPlay() {
  return createNewPlay({ formation: "spread", teamId: "t1", createdBy: "u1" });
}

describe("isActionValidForSelection", () => {
  it("requires 2 players for pass/screen/handoff and 1 for cut/dribble/shot", () => {
    expect(isActionValidForSelection("pass", [0, 1])).toBe(true);
    expect(isActionValidForSelection("pass", [0])).toBe(false);
    expect(isActionValidForSelection("screen", [3, 0])).toBe(true);
    expect(isActionValidForSelection("shot", [0])).toBe(true);
    expect(isActionValidForSelection("shot", [0, 1])).toBe(false);
    expect(isActionValidForSelection("cut", [])).toBe(false);
  });
});

describe("addAction", () => {
  it("creates a pass from first selected to second, schema-valid", () => {
    const play = addAction(freshPlay(), "pass", [0, 1], 1000, "a1");
    const pass = play.actions.find((a) => a.id === "a1");
    expect(pass).toMatchObject({ type: "pass", from: "player_0", to: "player_1", time: 1000 });
    expect(() => playSchema.parse(play)).not.toThrow();
  });

  it("creates a screen with screener = first selected, target = second", () => {
    const play = addAction(freshPlay(), "screen", [3, 0], 500, "a1");
    expect(play.actions[0]).toMatchObject({
      type: "screen",
      screener: "player_3",
      target: "player_0",
    });
  });

  it("records the shooter's interpolated position as the shot location", () => {
    let play = freshPlay();
    // Give PG motion so the location at t=2000 isn't the start point.
    play = upsertKeyframe(play, 0, 2000, 60, 50);
    play = addAction(play, "shot", [0], 2000, "a1");
    const shot = play.actions.find((a) => a.id === "a1");
    expect(shot).toMatchObject({ type: "shot", player: "player_0", location: { x: 60, y: 50 } });
  });

  it("regenerates the ball: it flies between players during a pass", () => {
    const play = addAction(freshPlay(), "pass", [0, 1], 1000, "a1");
    // Pass runs 1000 → 1500 (default 500ms). Midway the ball is in flight
    // between PG (spread: 50,22) and SG (16,42).
    const mid = ballPositionAt(play.ball, 1250);
    expect(mid.inFlight).toBe(true);
    // After arrival the ball is held by SG.
    const after = ballPositionAt(play.ball, 2000);
    expect(after.inFlight).toBe(false);
    expect(after.x).toBeCloseTo(16, 0);
  });

  it("keeps actions sorted by time", () => {
    let play = freshPlay();
    play = addAction(play, "dribble", [0], 2000, "late");
    play = addAction(play, "cut", [1], 500, "early");
    expect(play.actions.map((a) => a.id)).toEqual(["early", "late"]);
  });

  it("is a graceful no-op for an invalid selection", () => {
    const play = freshPlay();
    expect(addAction(play, "pass", [0], 1000)).toEqual(play);
    expect(addAction(play, "shot", [], 1000)).toEqual(play);
  });
});

describe("moveActionTime / resizeAction / deleteAction", () => {
  it("moves an action's time, clamped to the play, and re-derives the ball", () => {
    let play = addAction(freshPlay(), "pass", [0, 1], 1000, "a1");
    play = moveActionTime(play, "a1", 2500);
    expect(play.actions[0]?.time).toBe(2500);
    // Ball now flies later: still held at 1250, in flight at 2700.
    expect(ballPositionAt(play.ball, 1250).inFlight).toBe(false);
    expect(ballPositionAt(play.ball, 2700).inFlight).toBe(true);
    expect(() => playSchema.parse(play)).not.toThrow();
  });

  it("resizes duration within [100ms, end of play]", () => {
    let play = addAction(freshPlay(), "screen", [3, 0], 1000, "a1");
    play = resizeAction(play, "a1", 50);
    expect(play.actions[0]?.duration).toBe(100);
    play = resizeAction(play, "a1", 99999);
    expect(play.actions[0]?.duration).toBe(3000); // clamped to play end (4000 - 1000)
  });

  it("deletes an action and the ball settles back with the holder", () => {
    let play = addAction(freshPlay(), "pass", [0, 1], 1000, "a1");
    play = deleteAction(play, "a1");
    expect(play.actions).toHaveLength(0);
    // No actions → ball stays with slot 0 the whole play.
    expect(ballPositionAt(play.ball, 3000).inFlight).toBe(false);
  });
});

describe("actionSlots", () => {
  it("maps an action's player refs to slots for lane rendering", () => {
    const play = addAction(freshPlay(), "pass", [0, 1], 1000, "a1");
    const action = play.actions[0];
    if (!action) throw new Error("missing action");
    expect(actionSlots(play, action)).toEqual([0, 1]);
  });
});
