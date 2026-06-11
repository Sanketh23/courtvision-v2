import { describe, expect, it } from "vitest";
import { createNewPlay } from "@/features/play/editor/formations";
import { createEditorStore } from "@/features/play/editor/store";

function store() {
  const play = createNewPlay({ formation: "spread", teamId: "t1", createdBy: "u1" });
  return createEditorStore(play, null);
}

describe("editor store", () => {
  it("starts clean with no history", () => {
    const s = store();
    expect(s.getState().isDirty).toBe(false);
    expect(s.getState().canUndo()).toBe(false);
    expect(s.getState().canRedo()).toBe(false);
  });

  it("dragPlayerTo adds a keyframe at the cursor and marks dirty", () => {
    const s = store();
    s.getState().setCursor(2000);
    s.getState().dragPlayerTo(0, 60, 30);

    const kfs = s.getState().play.players[0]?.path.keyframes ?? [];
    expect(kfs.find((kf) => kf.time === 2000)).toEqual({ time: 2000, x: 60, y: 30 });
    expect(s.getState().isDirty).toBe(true);
    expect(s.getState().canUndo()).toBe(true);
  });

  it("undo and redo restore prior and next play states", () => {
    const s = store();
    const original = s.getState().play;
    s.getState().setCursor(2000);
    s.getState().dragPlayerTo(0, 60, 30);
    const edited = s.getState().play;

    s.getState().undo();
    expect(s.getState().play).toEqual(original);
    expect(s.getState().canRedo()).toBe(true);

    s.getState().redo();
    expect(s.getState().play).toEqual(edited);
  });

  it("a new edit clears the redo stack", () => {
    const s = store();
    s.getState().setCursor(1000);
    s.getState().dragPlayerTo(0, 10, 10);
    s.getState().undo();
    expect(s.getState().canRedo()).toBe(true);

    s.getState().setCursor(3000);
    s.getState().dragPlayerTo(1, 20, 20);
    expect(s.getState().canRedo()).toBe(false);
  });

  it("does not record history for a no-op edit (protected delete)", () => {
    const s = store();
    // Deleting the only-two keyframes is a protected no-op.
    s.getState().removeKeyframe(0, 0);
    expect(s.getState().canUndo()).toBe(false);
    expect(s.getState().isDirty).toBe(false);
  });

  it("nudgeSelected moves the selected keyframe", () => {
    const s = store();
    const before = s.getState().play.players[0]?.path.keyframes[0];
    s.getState().selectKeyframe({ slot: 0, index: 0 });
    s.getState().nudgeSelected(2, -3);
    const after = s.getState().play.players[0]?.path.keyframes[0];
    expect(after?.x).toBeCloseTo((before?.x ?? 0) + 2, 5);
    expect(after?.y).toBeCloseTo((before?.y ?? 0) - 3, 5);
  });

  it("selecting a keyframe also selects its slot", () => {
    const s = store();
    s.getState().selectKeyframe({ slot: 3, index: 0 });
    expect(s.getState().selectedSlots).toEqual([3]);
  });

  it("toggleSlot builds an ordered multi-selection", () => {
    const s = store();
    s.getState().selectSlot(0);
    s.getState().toggleSlot(1);
    expect(s.getState().selectedSlots).toEqual([0, 1]);
    s.getState().toggleSlot(0); // toggle off keeps order of the rest
    expect(s.getState().selectedSlots).toEqual([1]);
  });

  it("createAction adds an action at the cursor and regenerates the ball", () => {
    const s = store();
    s.getState().setCursor(1000);
    s.getState().selectSlot(0);
    s.getState().toggleSlot(1);
    s.getState().createAction("pass");

    const { play } = s.getState();
    expect(play.actions).toHaveLength(1);
    expect(play.actions[0]).toMatchObject({ type: "pass", from: "player_0", to: "player_1" });
    // The derived ball now contains an in-flight keyframe.
    expect(play.ball.keyframes.some((kf) => kf.inFlight)).toBe(true);
    expect(s.getState().canUndo()).toBe(true);
  });

  it("undo after createAction restores the previous ball too", () => {
    const s = store();
    s.getState().setCursor(1000);
    s.getState().selectSlot(0);
    s.getState().toggleSlot(1);
    s.getState().createAction("pass");
    s.getState().undo();
    const { play } = s.getState();
    expect(play.actions).toHaveLength(0);
    expect(play.ball.keyframes.some((kf) => kf.inFlight)).toBe(false);
  });

  it("removeAction deletes and clears the action selection", () => {
    const s = store();
    s.getState().setCursor(500);
    s.getState().selectSlot(0);
    s.getState().createAction("dribble");
    const id = s.getState().play.actions[0]?.id;
    if (!id) throw new Error("missing action id");
    s.getState().selectAction(id);
    s.getState().removeAction(id);
    expect(s.getState().play.actions).toHaveLength(0);
    expect(s.getState().selectedActionId).toBeNull();
  });

  it("markSaved records the id and clears the dirty flag", () => {
    const s = store();
    s.getState().setCursor(1000);
    s.getState().dragPlayerTo(0, 10, 10);
    expect(s.getState().isDirty).toBe(true);
    s.getState().markSaved("uuid-123");
    expect(s.getState().playId).toBe("uuid-123");
    expect(s.getState().isDirty).toBe(false);
  });

  it("patchMeta updates play metadata", () => {
    const s = store();
    s.getState().patchMeta({ name: "Renamed", tags: ["set"] });
    expect(s.getState().play.name).toBe("Renamed");
    expect(s.getState().play.tags).toEqual(["set"]);
  });
});
