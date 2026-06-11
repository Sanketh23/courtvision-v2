"use client";

import { useEditor } from "@/features/play/editor/store-context";

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
    </div>
  );
}
