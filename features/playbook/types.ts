/**
 * The playbook's own view-model for a play row/tile.
 *
 * Deliberately not imported from features/play (features don't import
 * features — CONVENTIONS §13): the route adapts the play feature's query
 * result into this shape and supplies pre-rendered thumbnails.
 */

export type PlaybookItem = {
  id: string;
  name: string;
  category: string;
  formation: string | null;
  status: "draft" | "published" | "archived";
  tags: string[];
  durationSeconds: number;
  actionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SortOption =
  | "recently-edited"
  | "recently-created"
  | "alphabetical"
  | "most-actions"
  | "duration";

export type ViewMode = "grid" | "list";

export type PlaybookFilters = {
  /** Single-select category (null = all). */
  category: string | null;
  /** Multi-select statuses, ORed. */
  statuses: string[];
  /** Multi-select tags, ANDed. */
  tags: string[];
  /** Case-insensitive name search. */
  search: string;
};

export const EMPTY_FILTERS: PlaybookFilters = {
  category: null,
  statuses: [],
  tags: [],
  search: "",
};
