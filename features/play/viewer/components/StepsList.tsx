"use client";

import { activeStepId, formatSeconds, type Step } from "@/features/play/viewer/steps";
import { cn } from "@/lib/utils";

/**
 * The steps list (UI_WORKFLOWS.md §8.5): each action as a row, the
 * current one highlighted; tapping a row jumps the scrubber there.
 */
export function StepsList({
  steps,
  currentTime,
  onSeek,
}: {
  steps: readonly Step[];
  currentTime: number;
  onSeek: (time: number) => void;
}) {
  const active = activeStepId(steps, currentTime);

  if (steps.length === 0) {
    return <p className="text-sm text-muted-foreground">No actions in this play yet.</p>;
  }

  return (
    <ol className="space-y-1">
      {steps.map((step) => (
        <li key={step.id}>
          <button
            type="button"
            onClick={() => onSeek(step.time)}
            className={cn(
              "flex w-full items-baseline gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
              step.id === active
                ? "bg-accent text-accent-foreground"
                : "text-foreground hover:bg-secondary",
            )}
          >
            <span className="w-10 shrink-0 tabular-nums text-xs text-muted-foreground">
              {formatSeconds(step.time)}
            </span>
            <span>{step.description}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
