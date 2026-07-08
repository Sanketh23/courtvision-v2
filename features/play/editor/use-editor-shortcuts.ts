"use client";

import { useEffect } from "react";
import { ACTION_SHORTCUTS, isActionValidForSelection } from "@/features/play/editor/action-rules";
import { useEditorStoreApi } from "@/features/play/editor/store-context";

/**
 * Editor keyboard shortcuts (UI_WORKFLOWS §7.9), incl. the quick-add action
 * letters (P/S/D/C/H/T) when the selection makes the action valid. onSave is
 * provided by the editor (it owns the save transition).
 *
 * Shortcuts are ignored while typing in an input/textarea/select so the
 * properties rail and name field behave normally.
 */
export function useEditorShortcuts(onSave: () => void) {
  const store = useEditorStoreApi();

  useEffect(() => {
    // Non-text controls (range scrubber, checkboxes, buttons) have nothing to
    // text-undo, so they must NOT swallow editor shortcuts — only true
    // text-entry fields should.
    const NON_TEXT_INPUT_TYPES = new Set(["range", "checkbox", "radio", "button", "submit"]);

    function isTyping(target: EventTarget | null): boolean {
      const el = target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT") {
        const type = (el as HTMLInputElement).type;
        return !NON_TEXT_INPUT_TYPES.has(type);
      }
      return tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable === true;
    }

    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      const state = store.getState();

      // Save works even while typing.
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        onSave();
        return;
      }

      if (isTyping(e.target)) return;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) state.redo();
        else state.undo();
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          state.setPlaying(!state.isPlaying);
          return;
        case "Delete":
        case "Backspace":
          // Selected action first, then selected keyframe (UI §7.9).
          if (state.selectedActionId) {
            e.preventDefault();
            state.removeAction(state.selectedActionId);
          } else if (state.selectedKeyframe) {
            e.preventDefault();
            state.removeKeyframe(state.selectedKeyframe.slot, state.selectedKeyframe.index);
          }
          return;
        case "ArrowUp":
          e.preventDefault();
          state.nudgeSelected(0, -1);
          return;
        case "ArrowDown":
          e.preventDefault();
          state.nudgeSelected(0, 1);
          return;
        case "ArrowLeft":
          e.preventDefault();
          state.nudgeSelected(-1, 0);
          return;
        case "ArrowRight":
          e.preventDefault();
          state.nudgeSelected(1, 0);
          return;
      }

      // 1–5 quick-select a player by slot index.
      if (e.key >= "1" && e.key <= "5") {
        state.selectSlot(Number(e.key) - 1);
        return;
      }

      // P/S/D/C/H/T quick-add an action when the selection is valid.
      const actionType = ACTION_SHORTCUTS[e.key.toLowerCase()];
      if (actionType && !mod && isActionValidForSelection(actionType, state.selectedSlots)) {
        e.preventDefault();
        state.createAction(actionType);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [store, onSave]);
}
