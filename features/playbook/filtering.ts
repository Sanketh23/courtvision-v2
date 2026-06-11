/**
 * Pure filtering / sorting / surfacing logic for the playbook browse
 * (UI_WORKFLOWS §5.3–§5.7, §6.3–§6.4). All functions are pure so the
 * combination rules (statuses ORed, tags ANDed, search + category on top)
 * are unit-testable without UI.
 */

import type { PlaybookFilters, PlaybookItem, SortOption } from "@/features/playbook/types";

/** Apply category (single), statuses (OR), tags (AND), and name search. */
export function applyFilters(
  items: readonly PlaybookItem[],
  filters: PlaybookFilters,
): PlaybookItem[] {
  const query = filters.search.trim().toLowerCase();
  return items.filter((item) => {
    if (filters.category && item.category !== filters.category) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(item.status)) return false;
    if (filters.tags.length > 0 && !filters.tags.every((tag) => item.tags.includes(tag)))
      return false;
    if (query && !item.name.toLowerCase().includes(query)) return false;
    return true;
  });
}

/** Sort a copy of the list (never mutates). */
export function sortItems(items: readonly PlaybookItem[], sort: SortOption): PlaybookItem[] {
  const sorted = [...items];
  switch (sort) {
    case "recently-edited":
      return sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    case "recently-created":
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "alphabetical":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "most-actions":
      return sorted.sort((a, b) => b.actionCount - a.actionCount);
    case "duration":
      return sorted.sort((a, b) => b.durationSeconds - a.durationSeconds);
  }
}

/** The 4–6 most recently edited plays — independent of filters (§5.4). */
export function recentlyEdited(items: readonly PlaybookItem[], count = 5): PlaybookItem[] {
  return sortItems(items, "recently-edited").slice(0, count);
}

/** The 5 most recently added plays (§6.3). */
export function recentlyAdded(items: readonly PlaybookItem[], count = 5): PlaybookItem[] {
  return sortItems(items, "recently-created").slice(0, count);
}

/** "New" pill: added within the last 7 days of `now` (§6.3). */
export function isNew(createdAt: string, now: Date): boolean {
  const ageMs = now.getTime() - new Date(createdAt).getTime();
  return ageMs >= 0 && ageMs < 7 * 24 * 60 * 60 * 1000;
}

/** Distinct categories present in the list, for chips/rail (sorted). */
export function categoriesOf(items: readonly PlaybookItem[]): string[] {
  return [...new Set(items.map((item) => item.category))].sort();
}

/** Distinct tags present in the list, for the filter rail (sorted). */
export function tagsOf(items: readonly PlaybookItem[]): string[] {
  return [...new Set(items.flatMap((item) => item.tags))].sort();
}

/** Whether any filter is active (drives the "Clear all filters" link). */
export function hasActiveFilters(filters: PlaybookFilters): boolean {
  return (
    filters.category !== null ||
    filters.statuses.length > 0 ||
    filters.tags.length > 0 ||
    filters.search.trim() !== ""
  );
}
