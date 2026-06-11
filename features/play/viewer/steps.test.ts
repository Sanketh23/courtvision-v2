import { describe, expect, it } from "vitest";
import { giveAndGo, spreadPr } from "@/features/play/fixtures";
import { activeStepId, formatSeconds, stepsFromActions } from "@/features/play/viewer/steps";

describe("stepsFromActions", () => {
  it("describes each action type with player labels, sorted by time", () => {
    const steps = stepsFromActions(spreadPr.actions, spreadPr.players);
    expect(steps.map((s) => s.description)).toEqual([
      "Dribble: PG",
      "Screen: PF for PG",
      "Pass: PG → SG",
    ]);
    expect(steps.map((s) => s.time)).toEqual([0, 2000, 3000]);
  });

  it("describes cuts, shots, and the give-and-go sequence", () => {
    const steps = stepsFromActions(giveAndGo.actions, giveAndGo.players);
    expect(steps.map((s) => s.description)).toEqual([
      "Pass: PG → SG",
      "Cut: PG toward basket",
      "Pass: SG → PG",
      "Shot: PG",
    ]);
  });

  it("falls back to the raw id for unknown player references", () => {
    const steps = stepsFromActions(
      [{ id: "a", type: "dribble", player: "ghost", time: 0, duration: 100 }],
      spreadPr.players,
    );
    expect(steps[0]?.description).toBe("Dribble: ghost");
  });
});

describe("activeStepId", () => {
  const steps = stepsFromActions(spreadPr.actions, spreadPr.players);

  it("is null before the first step starts", () => {
    expect(activeStepId(steps, -1)).toBeNull();
  });

  it("highlights the latest started step, sticky through gaps", () => {
    expect(activeStepId(steps, 0)).toBe("action_0");
    expect(activeStepId(steps, 1500)).toBe("action_0");
    expect(activeStepId(steps, 2000)).toBe("action_1");
    expect(activeStepId(steps, 2999)).toBe("action_1");
    expect(activeStepId(steps, 3000)).toBe("action_2");
    expect(activeStepId(steps, 5000)).toBe("action_2");
  });
});

describe("formatSeconds", () => {
  it("renders milliseconds as one-decimal seconds", () => {
    expect(formatSeconds(0)).toBe("0.0s");
    expect(formatSeconds(1200)).toBe("1.2s");
    expect(formatSeconds(5000)).toBe("5.0s");
  });
});
