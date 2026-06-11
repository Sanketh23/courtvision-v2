import { describe, expect, it } from "vitest";
import {
  createNewPlay,
  DEFAULT_PLAY_DURATION,
  FORMATION_OPTIONS,
  type FormationId,
} from "@/features/play/editor/formations";
import { playSchema } from "@/features/play/schemas";

const ALL_IDS = FORMATION_OPTIONS.map((o) => o.id);

describe("createNewPlay", () => {
  it("produces a schema-valid draft for every formation", () => {
    for (const formation of ALL_IDS) {
      const play = createNewPlay({ formation, teamId: "t1", createdBy: "u1" });
      expect(() => playSchema.parse(play)).not.toThrow();
    }
  });

  it("places exactly 5 players, each with a t=0 keyframe", () => {
    const play = createNewPlay({ formation: "spread", teamId: "t1", createdBy: "u1" });
    expect(play.players).toHaveLength(5);
    for (const player of play.players) {
      expect(player.path.keyframes[0]?.time).toBe(0);
    }
    expect(play.players.map((p) => p.slot)).toEqual([0, 1, 2, 3, 4]);
    expect(play.players.map((p) => p.label)).toEqual(["PG", "SG", "SF", "PF", "C"]);
  });

  it("defaults duration to 4s and name to 'Untitled play'", () => {
    const play = createNewPlay({ formation: "horns", teamId: "t1", createdBy: "u1" });
    expect(play.duration).toBe(DEFAULT_PLAY_DURATION);
    expect(play.name).toBe("Untitled play");
    expect(play.status).toBe("draft");
  });

  it("records the formation id except for custom (left blank)", () => {
    expect(createNewPlay({ formation: "box", teamId: "t", createdBy: "u" }).formation).toBe("box");
    expect(
      createNewPlay({ formation: "custom", teamId: "t", createdBy: "u" }).formation,
    ).toBeUndefined();
  });

  it("starts the ball with the PG and keeps all positions in-bounds", () => {
    for (const formation of ALL_IDS) {
      const play = createNewPlay({ formation, teamId: "t", createdBy: "u" });
      const pg = play.players[0];
      expect(play.ball.keyframes[0]).toMatchObject({ x: pg?.path.keyframes[0]?.x });
      for (const player of play.players) {
        for (const kf of player.path.keyframes) {
          expect(kf.x).toBeGreaterThanOrEqual(0);
          expect(kf.x).toBeLessThanOrEqual(100);
          expect(kf.y).toBeGreaterThanOrEqual(0);
          expect(kf.y).toBeLessThanOrEqual(94);
        }
      }
    }
  });

  it("keeps formations distinct (no two place players identically)", () => {
    const signatures = new Set<string>();
    for (const formation of ALL_IDS as FormationId[]) {
      const play = createNewPlay({ formation, teamId: "t", createdBy: "u" });
      const sig = play.players
        .map((p) => `${p.path.keyframes[0]?.x},${p.path.keyframes[0]?.y}`)
        .join("|");
      signatures.add(sig);
    }
    expect(signatures.size).toBe(ALL_IDS.length);
  });
});
