"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { PlayTile } from "@/features/playbook/components/PlayTile";
import {
  applyFilters,
  categoriesOf,
  isNew,
  recentlyAdded,
  sortItems,
} from "@/features/playbook/filtering";
import { EMPTY_FILTERS, type PlaybookItem } from "@/features/playbook/types";
import { cn } from "@/lib/utils";

/**
 * Mobile-first player browse (UI_WORKFLOWS §6): search, category chips,
 * "Recently added" (newest 1–2 elevated, "New" pill within 7 days), and the
 * "All plays" list. The unstudied indicator and "Most-studied" sort need
 * play_progress and arrive with M9.
 */
export function PlayerBrowse({
  items,
  thumbnails,
}: {
  items: PlaybookItem[];
  thumbnails: Record<string, ReactNode>;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<"recently-created" | "alphabetical">("recently-created");

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Your coach hasn't added any plays yet. Check back soon.
        </p>
      </div>
    );
  }

  const categories = categoriesOf(items);
  const filtered = applyFilters(items, { ...EMPTY_FILTERS, search, category });
  const recent = recentlyAdded(items, 5);
  const all = sortItems(filtered, sort);
  const now = new Date();

  return (
    <div className="space-y-6">
      <input
        type="search"
        placeholder="Search plays…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-md border border-input px-3 py-2 text-sm"
      />

      {/* Category chips (§6.2) */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip active={category === null} onClick={() => setCategory(null)}>
          All
        </Chip>
        {categories.map((c) => (
          <Chip
            key={c}
            active={category === c}
            onClick={() => setCategory(category === c ? null : c)}
          >
            {c}
          </Chip>
        ))}
      </div>

      {/* Recently added (§6.3) */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recently added
        </h2>
        <ul className="space-y-2">
          {recent.map((item, index) => {
            const elevated = index < 2;
            return (
              <li key={item.id}>
                <Link
                  href={`/play/${item.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-2.5 transition-colors",
                    elevated
                      ? "border-primary/40 bg-accent/60"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <div className="w-12 shrink-0 overflow-hidden rounded border border-border">
                    {thumbnails[item.id]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{item.name}</span>
                      {isNew(item.createdAt, now) && (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.category} · {item.durationSeconds.toFixed(1)}s
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* All plays (§6.4) */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            All plays
          </h2>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            aria-label="Sort plays"
            className="rounded-md border border-input px-2 py-1 text-xs"
          >
            <option value="recently-created">Recent</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </div>
        {all.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No plays match.</p>
        ) : (
          <ul className="space-y-2">
            {all.map((item) => (
              <li key={item.id}>
                <PlayTile
                  item={item}
                  thumbnail={thumbnails[item.id]}
                  variant="list"
                  showStatus={false}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Chip({
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
        "shrink-0 rounded-full px-3 py-1 text-xs capitalize transition-colors",
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
      )}
    >
      {children}
    </button>
  );
}
