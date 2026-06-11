import { describe, expect, it } from "vitest";
import {
  actionPlayerRefs,
  collectActionIssues,
  collectKeyframeIssues,
  collectPlaySemanticIssues,
  firstKeyframeAtZero,
  lastKeyframeAtDuration,
  timesStrictlyIncreasing,
} from "@/features/play/engine/validate";
import { spreadPr } from "@/features/play/fixtures";

describe("timesStrictlyIncreasing", () => {
  it("accepts strictly increasing times", () => {
    expect(timesStrictlyIncreasing([{ time: 0 }, { time: 100 }, { time: 200 }])).toBe(true);
  });
  it("rejects duplicates and reversals", () => {
    expect(timesStrictlyIncreasing([{ time: 0 }, { time: 100 }, { time: 100 }])).toBe(false);
    expect(timesStrictlyIncreasing([{ time: 0 }, { time: 200 }, { time: 100 }])).toBe(false);
  });
  it("accepts empty and single-element sequences", () => {
    expect(timesStrictlyIncreasing([])).toBe(true);
    expect(timesStrictlyIncreasing([{ time: 5 }])).toBe(true);
  });
});

describe("firstKeyframeAtZero / lastKeyframeAtDuration", () => {
  it("checks the boundary keyframes", () => {
    const kfs = [{ time: 0 }, { time: 5000 }];
    expect(firstKeyframeAtZero(kfs)).toBe(true);
    expect(lastKeyframeAtDuration(kfs, 5000)).toBe(true);
    expect(firstKeyframeAtZero([{ time: 10 }, { time: 5000 }])).toBe(false);
    expect(lastKeyframeAtDuration(kfs, 4000)).toBe(false);
  });
});

describe("collectKeyframeIssues", () => {
  it("returns no issues for a valid sequence", () => {
    expect(collectKeyframeIssues([{ time: 0 }, { time: 5000 }], 5000, ["x"])).toEqual([]);
  });
  it("reports each violated rule", () => {
    const issues = collectKeyframeIssues([{ time: 10 }, { time: 10 }], 5000, ["x"]);
    expect(issues.map((i) => i.message)).toEqual([
      "Keyframe times must be strictly increasing",
      "First keyframe must be at time 0",
      "Last keyframe must be at the play duration (5000ms)",
    ]);
  });
});

describe("actionPlayerRefs", () => {
  it("extracts refs per action type", () => {
    expect(actionPlayerRefs({ type: "pass", time: 0, duration: 1, from: "a", to: "b" })).toEqual([
      "a",
      "b",
    ]);
    expect(
      actionPlayerRefs({ type: "screen", time: 0, duration: 1, screener: "s", target: "t" }),
    ).toEqual(["s", "t"]);
    expect(actionPlayerRefs({ type: "shot", time: 0, duration: 1, player: "p" })).toEqual(["p"]);
    expect(actionPlayerRefs({ type: "unknown", time: 0, duration: 1 })).toEqual([]);
  });
});

describe("collectActionIssues", () => {
  const players = new Set(["player_0", "player_1"]);
  it("flags unknown player references", () => {
    const issues = collectActionIssues(
      [{ type: "pass", time: 0, duration: 100, from: "player_0", to: "ghost" }],
      players,
      5000,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('"ghost"');
  });
  it("flags out-of-bounds action times", () => {
    const issues = collectActionIssues(
      [{ type: "dribble", time: 6000, duration: 100, player: "player_0" }],
      players,
      5000,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("within [0, 5000]");
  });
});

describe("collectPlaySemanticIssues", () => {
  it("returns no issues for a valid fixture play", () => {
    expect(collectPlaySemanticIssues(spreadPr)).toEqual([]);
  });

  it("flags duplicate slots and duplicate player ids", () => {
    const play = structuredClone(spreadPr);
    const p1 = play.players[1];
    const p0 = play.players[0];
    if (!p0 || !p1) throw new Error("fixture players missing");
    p1.slot = p0.slot;
    p1.id = p0.id;
    const messages = collectPlaySemanticIssues(play).map((i) => i.message);
    expect(messages.some((m) => m.includes("Duplicate slot"))).toBe(true);
    expect(messages.some((m) => m.includes("Duplicate player id"))).toBe(true);
  });

  it("flags a non-positive duration", () => {
    const play = structuredClone(spreadPr);
    play.duration = 0;
    const messages = collectPlaySemanticIssues(play).map((i) => i.message);
    expect(messages.some((m) => m.includes("Duration must be greater than 0"))).toBe(true);
  });
});
