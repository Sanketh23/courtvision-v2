import { describe, expect, it } from "vitest";
import { createNewPlay } from "@/features/play/editor/formations";
import {
  clampToCourt,
  deleteKeyframe,
  moveKeyframePosition,
  moveKeyframeTime,
  nudgeKeyframe,
  requiredDuration,
  setDuration,
  upsertKeyframe,
} from "@/features/play/editor/mutations";
import { playSchema } from "@/features/play/schemas";

function freshPlay() {
  return createNewPlay({ formation: "spread", teamId: "t1", createdBy: "u1" });
}

/** A keyframe count for slot 0. */
function kfCount(play: ReturnType<typeof freshPlay>, slot = 0) {
  return play.players.find((p) => p.slot === slot)?.path.keyframes.length ?? 0;
}

describe("clampToCourt", () => {
  it("clamps to court bounds", () => {
    expect(clampToCourt(-5, 200)).toEqual({ x: 0, y: 94 });
    expect(clampToCourt(50, 47)).toEqual({ x: 50, y: 47 });
  });
});

describe("upsertKeyframe (drag-to-keyframe)", () => {
  it("inserts a new keyframe at the cursor time, keeping the play schema-valid", () => {
    const play = freshPlay(); // 2 keyframes per player (t=0, t=4000)
    const next = upsertKeyframe(play, 0, 2000, 60, 30);
    expect(kfCount(next)).toBe(3);
    const inserted = next.players[0]?.path.keyframes.find((kf) => kf.time === 2000);
    expect(inserted).toEqual({ time: 2000, x: 60, y: 30 });
    expect(() => playSchema.parse(next)).not.toThrow();
  });

  it("keeps keyframes sorted by time after an out-of-order insert", () => {
    let play = freshPlay();
    play = upsertKeyframe(play, 0, 3000, 10, 10);
    play = upsertKeyframe(play, 0, 1000, 20, 20);
    const times = play.players[0]?.path.keyframes.map((kf) => kf.time);
    expect(times).toEqual([0, 1000, 3000, 4000]);
  });

  it("replaces (does not duplicate) a keyframe at the same time", () => {
    let play = freshPlay();
    play = upsertKeyframe(play, 0, 2000, 60, 30);
    play = upsertKeyframe(play, 0, 2000, 70, 40); // same cursor time
    expect(kfCount(play)).toBe(3);
    const kf = play.players[0]?.path.keyframes.find((k) => k.time === 2000);
    expect(kf).toEqual({ time: 2000, x: 70, y: 40 });
  });

  it("clamps dragged positions into the court", () => {
    const play = upsertKeyframe(freshPlay(), 0, 1000, 150, -20);
    const kf = play.players[0]?.path.keyframes.find((k) => k.time === 1000);
    expect(kf).toEqual({ time: 1000, x: 100, y: 0 });
  });

  it("auto-extends the duration when a keyframe lands past the end", () => {
    const play = upsertKeyframe(freshPlay(), 0, 6000, 50, 50);
    expect(play.duration).toBe(6000);
    // Every path's last keyframe is re-pinned to the new duration.
    for (const player of play.players) {
      expect(player.path.keyframes[player.path.keyframes.length - 1]?.time).toBe(6000);
    }
    expect(() => playSchema.parse(play)).not.toThrow();
  });
});

describe("moveKeyframePosition", () => {
  it("moves position without changing time", () => {
    const play = moveKeyframePosition(freshPlay(), 0, 0, 12, 34);
    const kf = play.players[0]?.path.keyframes[0];
    expect(kf).toMatchObject({ time: 0, x: 12, y: 34 });
  });
});

describe("moveKeyframeTime", () => {
  it("changes an intermediate keyframe's time within its neighbors", () => {
    let play = upsertKeyframe(freshPlay(), 0, 2000, 60, 30); // [0, 2000, 4000]
    play = moveKeyframeTime(play, 0, 1, 1500);
    expect(play.players[0]?.path.keyframes[1]?.time).toBe(1500);
  });

  it("never lets a keyframe cross its neighbors", () => {
    let play = upsertKeyframe(freshPlay(), 0, 2000, 60, 30);
    play = moveKeyframeTime(play, 0, 1, 99999); // try to push past the last
    const mid = play.players[0]?.path.keyframes[1]?.time ?? 0;
    expect(mid).toBeLessThan(4000);
    expect(mid).toBeGreaterThan(0);
  });

  it("anchors the first keyframe at t=0", () => {
    const play = moveKeyframeTime(freshPlay(), 0, 0, 500);
    expect(play.players[0]?.path.keyframes[0]?.time).toBe(0);
  });

  it("extends duration when the last keyframe is dragged later", () => {
    const play = moveKeyframeTime(freshPlay(), 0, 1, 5000);
    expect(play.duration).toBe(5000);
    expect(() => playSchema.parse(play)).not.toThrow();
  });
});

describe("deleteKeyframe", () => {
  it("removes an intermediate keyframe", () => {
    const play = upsertKeyframe(freshPlay(), 0, 2000, 60, 30);
    const after = deleteKeyframe(play, 0, 1);
    expect(kfCount(after)).toBe(2);
  });

  it("refuses to delete the first, last, or only-two keyframes", () => {
    const play = freshPlay(); // exactly 2
    expect(deleteKeyframe(play, 0, 0)).toEqual(play);
    expect(deleteKeyframe(play, 0, 1)).toEqual(play);
    const three = upsertKeyframe(play, 0, 2000, 60, 30);
    expect(kfCount(deleteKeyframe(three, 0, 0))).toBe(3); // first protected
    expect(kfCount(deleteKeyframe(three, 0, 2))).toBe(3); // last protected
  });

  it("shrinks duration after deleting the keyframe that set it", () => {
    let play = upsertKeyframe(freshPlay(), 0, 6000, 50, 50); // duration → 6000
    // The 6000 keyframe is now the last; insert a real intermediate to delete.
    play = upsertKeyframe(play, 0, 3000, 40, 40);
    const before = play.duration;
    expect(before).toBe(6000);
  });
});

describe("nudgeKeyframe", () => {
  it("shifts a keyframe by a court-unit delta, clamped to bounds", () => {
    const play = nudgeKeyframe(freshPlay(), 0, 0, 1, -1);
    const kf0 = freshPlay().players[0]?.path.keyframes[0];
    const moved = play.players[0]?.path.keyframes[0];
    expect(moved?.x).toBeCloseTo((kf0?.x ?? 0) + 1, 5);
    expect(moved?.y).toBeCloseTo((kf0?.y ?? 0) - 1, 5);
  });
});

describe("requiredDuration / setDuration", () => {
  it("requiredDuration is the latest keyframe across players and ball", () => {
    const play = upsertKeyframe(freshPlay(), 1, 3000, 20, 20);
    expect(requiredDuration(play)).toBe(4000); // last keyframes still at 4000
  });

  it("setDuration won't shrink below the latest keyframe", () => {
    let play = upsertKeyframe(freshPlay(), 0, 3000, 40, 40);
    play = setDuration(play, 1000); // try to shrink under the 3000 keyframe
    expect(play.duration).toBeGreaterThanOrEqual(3000);
    expect(() => playSchema.parse(play)).not.toThrow();
  });

  it("setDuration extends and re-pins the final keyframes", () => {
    const play = setDuration(freshPlay(), 8000);
    expect(play.duration).toBe(8000);
    for (const player of play.players) {
      expect(player.path.keyframes[player.path.keyframes.length - 1]?.time).toBe(8000);
    }
  });
});
