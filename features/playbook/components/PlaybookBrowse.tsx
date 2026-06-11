"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { CoachBrowse } from "@/features/playbook/components/CoachBrowse";
import { PlayerBrowse } from "@/features/playbook/components/PlayerBrowse";
import {
  EMPTY_FILTERS,
  type PlaybookFilters,
  type PlaybookItem,
  type SortOption,
  type ViewMode,
} from "@/features/playbook/types";

/** localStorage keys for persisted UI state (UI_WORKFLOWS §13.9). */
const VIEW_KEY = "cv:playbook:view";
const SORT_KEY = "cv:playbook:sort";
const CATEGORY_KEY = "cv:playbook:category";

function readStored<T extends string>(key: string, valid: readonly T[]): T | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(key);
  return valid.includes(value as T) ? (value as T) : null;
}

/**
 * Client root for the playbook browse: picks the coach (§5) or player (§6)
 * experience by role and owns the coach's filter/sort/view state, synced to
 * the URL (`?category=`) and localStorage.
 */
export function PlaybookBrowse({
  role,
  items,
  thumbnails,
  initialCategory,
}: {
  role: "coach" | "player";
  items: PlaybookItem[];
  thumbnails: Record<string, ReactNode>;
  initialCategory: string | null;
}) {
  const [filters, setFilters] = useState<PlaybookFilters>({
    ...EMPTY_FILTERS,
    category: initialCategory,
  });
  const [sort, setSort] = useState<SortOption>("recently-edited");
  const [view, setView] = useState<ViewMode>("grid");

  // Hydrate persisted prefs after mount (localStorage isn't on the server).
  useEffect(() => {
    const storedSort = readStored(SORT_KEY, [
      "recently-edited",
      "recently-created",
      "alphabetical",
      "most-actions",
      "duration",
    ] as const);
    if (storedSort) setSort(storedSort);
    const storedView = readStored(VIEW_KEY, ["grid", "list"] as const);
    if (storedView) setView(storedView);
    if (initialCategory === null) {
      const storedCategory = window.localStorage.getItem(CATEGORY_KEY);
      if (storedCategory) setFilters((f) => ({ ...f, category: storedCategory }));
    }
  }, [initialCategory]);

  // Reflect the category in the URL (§5.7) without a server round-trip,
  // and persist prefs.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (filters.category) {
      url.searchParams.set("category", filters.category);
      window.localStorage.setItem(CATEGORY_KEY, filters.category);
    } else {
      url.searchParams.delete("category");
      window.localStorage.removeItem(CATEGORY_KEY);
    }
    window.history.replaceState(null, "", url);
  }, [filters.category]);

  useEffect(() => {
    window.localStorage.setItem(SORT_KEY, sort);
  }, [sort]);
  useEffect(() => {
    window.localStorage.setItem(VIEW_KEY, view);
  }, [view]);

  if (role === "player") {
    return <PlayerBrowse items={items} thumbnails={thumbnails} />;
  }

  return (
    <CoachBrowse
      items={items}
      thumbnails={thumbnails}
      filters={filters}
      onFiltersChange={setFilters}
      sort={sort}
      onSortChange={setSort}
      view={view}
      onViewChange={setView}
    />
  );
}
