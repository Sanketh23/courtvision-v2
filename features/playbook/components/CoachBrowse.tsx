"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { PlayTile } from "@/features/playbook/components/PlayTile";
import {
  applyFilters,
  categoriesOf,
  hasActiveFilters,
  recentlyEdited,
  sortItems,
  tagsOf,
} from "@/features/playbook/filtering";
import type {
  PlaybookFilters,
  PlaybookItem,
  SortOption,
  ViewMode,
} from "@/features/playbook/types";
import { cn } from "@/lib/utils";

const SORT_LABELS: Record<SortOption, string> = {
  "recently-edited": "Recently edited",
  "recently-created": "Recently created",
  alphabetical: "Alphabetical",
  "most-actions": "Most actions",
  duration: "Duration",
};

/**
 * Desktop coach browse (UI_WORKFLOWS §5): left filter rail, toolbar
 * (search / sort / view toggle / New play), filter chips, the
 * filter-independent "Recently edited" strip, and the grid or list.
 */
export function CoachBrowse({
  items,
  thumbnails,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  view,
  onViewChange,
}: {
  items: PlaybookItem[];
  thumbnails: Record<string, ReactNode>;
  filters: PlaybookFilters;
  onFiltersChange: (filters: PlaybookFilters) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}) {
  const categories = categoriesOf(items);
  const tags = tagsOf(items);
  const visible = sortItems(applyFilters(items, filters), sort);
  const strip = recentlyEdited(items, 6);
  const isEmpty = items.length === 0;

  const toggleStatus = (status: string) =>
    onFiltersChange({
      ...filters,
      statuses: filters.statuses.includes(status)
        ? filters.statuses.filter((s) => s !== status)
        : [...filters.statuses, status],
    });

  const toggleTag = (tag: string) =>
    onFiltersChange({
      ...filters,
      tags: filters.tags.includes(tag)
        ? filters.tags.filter((t) => t !== tag)
        : [...filters.tags, tag],
    });

  return (
    <div className="flex gap-6">
      {/* Left filter rail (§5.2) */}
      <aside className="hidden w-44 shrink-0 space-y-5 min-[800px]:block">
        <RailGroup title="Categories">
          <RailItem
            active={filters.category === null}
            onClick={() => onFiltersChange({ ...filters, category: null })}
          >
            All
          </RailItem>
          {categories.map((category) => (
            <RailItem
              key={category}
              active={filters.category === category}
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  category: filters.category === category ? null : category,
                })
              }
            >
              {category}
            </RailItem>
          ))}
        </RailGroup>

        <RailGroup title="Status">
          {(["draft", "published", "archived"] as const).map((status) => (
            <label key={status} className="flex items-center gap-2 px-2 py-1 text-sm capitalize">
              <input
                type="checkbox"
                checked={filters.statuses.includes(status)}
                onChange={() => toggleStatus(status)}
              />
              {status}
            </label>
          ))}
        </RailGroup>

        {tags.length > 0 && (
          <RailGroup title="Tags">
            <div className="flex flex-wrap gap-1 px-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs",
                    filters.tags.includes(tag)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </RailGroup>
        )}
      </aside>

      {/* Content area */}
      <div className="min-w-0 flex-1 space-y-5">
        {/* Toolbar (§5.3) */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            placeholder="Search plays…"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="w-full max-w-[300px] rounded-md border border-input px-3 py-1.5 text-sm"
          />
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            aria-label="Sort plays"
            className="rounded-md border border-input px-2 py-1.5 text-sm"
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <fieldset className="flex rounded-md border border-input">
            <legend className="sr-only">View mode</legend>
            {(["grid", "list"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewChange(mode)}
                aria-pressed={view === mode}
                className={cn(
                  "px-2.5 py-1.5 text-xs capitalize first:rounded-l-md last:rounded-r-md",
                  view === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {mode}
              </button>
            ))}
          </fieldset>
          <Link
            href="/play/new"
            className="ml-auto rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            + New play
          </Link>
        </div>

        {/* Active filter chips (§5.7) */}
        {hasActiveFilters(filters) && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {filters.category && (
              <FilterChip onRemove={() => onFiltersChange({ ...filters, category: null })}>
                {filters.category}
              </FilterChip>
            )}
            {filters.statuses.map((status) => (
              <FilterChip key={status} onRemove={() => toggleStatus(status)}>
                {status}
              </FilterChip>
            ))}
            {filters.tags.map((tag) => (
              <FilterChip key={tag} onRemove={() => toggleTag(tag)}>
                {tag}
              </FilterChip>
            ))}
            {filters.search.trim() && (
              <FilterChip onRemove={() => onFiltersChange({ ...filters, search: "" })}>
                “{filters.search.trim()}”
              </FilterChip>
            )}
            <button
              type="button"
              onClick={() =>
                onFiltersChange({ category: null, statuses: [], tags: [], search: "" })
              }
              className="text-primary hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}

        {isEmpty ? (
          /* Zero-play empty state (§5.8) */
          <div className="rounded-lg border border-dashed border-border py-20 text-center">
            <h2 className="mb-1 text-lg font-semibold">Your playbook is empty</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Create your first play to get started.
            </p>
            <Link
              href="/play/new"
              className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Create your first play
            </Link>
          </div>
        ) : (
          <>
            {/* Recently edited strip — independent of filters (§5.4) */}
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recently edited
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {strip.map((item) => (
                  <PlayTile
                    key={item.id}
                    item={item}
                    thumbnail={thumbnails[item.id]}
                    variant="strip"
                    showStatus
                  />
                ))}
              </div>
            </section>

            {/* Grid / list */}
            {visible.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No plays match these filters.
              </p>
            ) : view === "grid" ? (
              <ul className="grid grid-cols-1 gap-4 min-[800px]:grid-cols-2 min-[1100px]:grid-cols-3">
                {visible.map((item) => (
                  <li key={item.id}>
                    <PlayTile
                      item={item}
                      thumbnail={thumbnails[item.id]}
                      variant="grid"
                      showStatus
                    />
                  </li>
                ))}
                <li>
                  <Link
                    href="/play/new"
                    className="flex h-full min-h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    + Create play
                  </Link>
                </li>
              </ul>
            ) : (
              <ul className="space-y-2">
                {visible.map((item) => (
                  <li key={item.id}>
                    <PlayTile
                      item={item}
                      thumbnail={thumbnails[item.id]}
                      variant="list"
                      showStatus
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RailGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function RailItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block w-full rounded px-2 py-1 text-left text-sm capitalize",
        active ? "bg-accent font-medium text-accent-foreground" : "hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}

function FilterChip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 capitalize">
      {children}
      <button type="button" onClick={onRemove} aria-label="Remove filter" className="font-bold">
        ×
      </button>
    </span>
  );
}
