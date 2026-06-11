import { describe, expect, it } from "vitest";
import { giveAndGo, spreadPr, stationary } from "@/features/play/fixtures";
import { type Play, playSchema } from "@/features/play/schemas";

/** A structurally fresh, known-valid play to mutate per test. */
function validPlay(): Play {
  return structuredClone(spreadPr);
}

describe("playSchema", () => {
  it("round-trips every fixture play (parse → serialize → parse)", () => {
    for (const play of [spreadPr, giveAndGo, stationary]) {
      const reparsed = playSchema.parse(JSON.parse(JSON.stringify(play)));
      expect(reparsed).toEqual(play);
    }
  });

  it("rejects a play with fewer than 5 players", () => {
    const play = validPlay();
    play.players.pop();
    expect(playSchema.safeParse(play).success).toBe(false);
  });

  it("rejects keyframes that are not strictly increasing", () => {
    const play = validPlay();
    const kfs = play.players[0]?.path.keyframes;
    if (!kfs?.[1] || !kfs[0]) throw new Error("fixture keyframes missing");
    kfs[1].time = kfs[0].time; // duplicate time
    expect(playSchema.safeParse(play).success).toBe(false);
  });

  it("rejects a path that doesn't start at t=0", () => {
    const play = validPlay();
    const first = play.players[0]?.path.keyframes[0];
    if (!first) throw new Error("fixture keyframe missing");
    first.time = 100;
    expect(playSchema.safeParse(play).success).toBe(false);
  });

  it("rejects a path whose last keyframe is not at the play duration", () => {
    const play = validPlay();
    const kfs = play.players[0]?.path.keyframes;
    const last = kfs?.[kfs.length - 1];
    if (!last) throw new Error("fixture keyframe missing");
    last.time = play.duration - 1;
    expect(playSchema.safeParse(play).success).toBe(false);
  });

  it("rejects out-of-bounds coordinates", () => {
    const play = validPlay();
    const first = play.players[0]?.path.keyframes[0];
    if (!first) throw new Error("fixture keyframe missing");
    first.x = 101;
    expect(playSchema.safeParse(play).success).toBe(false);

    const playY = validPlay();
    const firstY = playY.players[0]?.path.keyframes[0];
    if (!firstY) throw new Error("fixture keyframe missing");
    firstY.y = -1;
    expect(playSchema.safeParse(playY).success).toBe(false);
  });

  it("rejects an invalid slot", () => {
    const play = validPlay();
    const player = play.players[0];
    if (!player) throw new Error("fixture player missing");
    (player as { slot: number }).slot = 5;
    expect(playSchema.safeParse(play).success).toBe(false);
  });

  it("rejects duplicate slots", () => {
    const play = validPlay();
    const p1 = play.players[1];
    if (!p1) throw new Error("fixture player missing");
    p1.slot = 0;
    expect(playSchema.safeParse(play).success).toBe(false);
  });

  it("rejects actions referencing unknown players", () => {
    const play = validPlay();
    play.actions.push({
      id: "bad_action",
      type: "pass",
      from: "player_0",
      to: "nobody",
      time: 1000,
      duration: 300,
    });
    expect(playSchema.safeParse(play).success).toBe(false);
  });

  it("rejects an action whose time is outside the play", () => {
    const play = validPlay();
    play.actions.push({
      id: "late_action",
      type: "dribble",
      player: "player_0",
      time: play.duration + 1,
      duration: 100,
    });
    expect(playSchema.safeParse(play).success).toBe(false);
  });

  it("rejects an unknown action type", () => {
    const play = validPlay();
    (play.actions as unknown[]).push({
      id: "weird",
      type: "teleport",
      player: "player_0",
      time: 0,
      duration: 100,
    });
    expect(playSchema.safeParse(play).success).toBe(false);
  });

  it("rejects a non-positive duration", () => {
    const play = validPlay();
    play.duration = 0;
    expect(playSchema.safeParse(play).success).toBe(false);
  });

  it("rejects a ball with fewer than 2 keyframes", () => {
    const play = validPlay();
    play.ball.keyframes = play.ball.keyframes.slice(0, 1);
    expect(playSchema.safeParse(play).success).toBe(false);
  });

  it("accepts a draft play without published metadata", () => {
    expect(stationary.status).toBe("draft");
    expect(stationary.publishedAt).toBeUndefined();
    expect(playSchema.safeParse(stationary).success).toBe(true);
  });
});
