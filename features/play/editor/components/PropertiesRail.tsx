"use client";

import { useMemo } from "react";
import { useEditor } from "@/features/play/editor/store-context";
import { formatSeconds, stepsFromActions } from "@/features/play/viewer/steps";

/**
 * Right rail (UI_WORKFLOWS §7.5): play properties. Edits flow straight into
 * the store buffer; Save persists them. Duration is read-only here — it
 * auto-extends from keyframes, and the timeline is where timing is edited.
 */
const CATEGORIES = ["offense", "defense", "blob", "slob", "transition"] as const;

export function PropertiesRail() {
  const play = useEditor((s) => s.play);
  const patchMeta = useEditor((s) => s.patchMeta);

  return (
    <div className="flex flex-col gap-4 text-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Properties
      </h2>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Name</span>
        <input
          value={play.name}
          onChange={(e) => patchMeta({ name: e.target.value })}
          className="rounded-md border border-input px-2 py-1.5"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Category</span>
        <select
          value={play.category}
          onChange={(e) => patchMeta({ category: e.target.value })}
          className="rounded-md border border-input px-2 py-1.5 capitalize"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="capitalize">
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Status</span>
        <select
          value={play.status}
          onChange={(e) => patchMeta({ status: e.target.value as typeof play.status })}
          className="rounded-md border border-input px-2 py-1.5 capitalize"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <span className="text-[10px] leading-snug text-muted-foreground">
          Players see published plays only. Save to apply.
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Formation</span>
        <input
          value={play.formation ?? ""}
          onChange={(e) => patchMeta({ formation: e.target.value || undefined })}
          placeholder="e.g. 5-out"
          className="rounded-md border border-input px-2 py-1.5"
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Duration</span>
        <span className="rounded-md bg-secondary px-2 py-1.5 text-secondary-foreground">
          {(play.duration / 1000).toFixed(1)}s
          <span className="ml-1 text-xs text-muted-foreground">(auto-extends)</span>
        </span>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Tags (comma-separated)</span>
        <input
          value={play.tags.join(", ")}
          onChange={(e) =>
            patchMeta({
              tags: e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
          className="rounded-md border border-input px-2 py-1.5"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Description</span>
        <textarea
          value={play.description ?? ""}
          onChange={(e) => patchMeta({ description: e.target.value || undefined })}
          rows={4}
          className="resize-none rounded-md border border-input px-2 py-1.5"
        />
      </label>

      <StepsSection />
    </div>
  );
}

/** The play's actions in time order (ROADMAP M6: "steps list reflects
 * actions"). Clicking a step jumps the cursor and selects the action. */
function StepsSection() {
  const play = useEditor((s) => s.play);
  const selectedActionId = useEditor((s) => s.selectedActionId);
  const setCursor = useEditor((s) => s.setCursor);
  const selectAction = useEditor((s) => s.selectAction);

  const steps = useMemo(
    () => stepsFromActions(play.actions, play.players),
    [play.actions, play.players],
  );

  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Steps
      </h2>
      {steps.length === 0 ? (
        <p className="text-xs text-muted-foreground">No actions yet.</p>
      ) : (
        <ol className="space-y-0.5">
          {steps.map((step) => (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => {
                  setCursor(step.time);
                  selectAction(step.id);
                }}
                className={
                  step.id === selectedActionId
                    ? "flex w-full items-baseline gap-2 rounded bg-accent px-2 py-1 text-left text-xs text-accent-foreground"
                    : "flex w-full items-baseline gap-2 rounded px-2 py-1 text-left text-xs hover:bg-secondary"
                }
              >
                <span className="w-8 shrink-0 tabular-nums text-[10px] text-muted-foreground">
                  {formatSeconds(step.time)}
                </span>
                <span>{step.description}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
