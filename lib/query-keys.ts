/**
 * Centralized, typed TanStack Query keys (ARCHITECTURE.md §7.1).
 *
 * One source of truth for cache keys so invalidation stays consistent.
 */

export const queryKeys = {
  plays: {
    list: (teamId: string) => ["plays", teamId] as const,
    detail: (playId: string) => ["plays", "detail", playId] as const,
    versions: (playId: string) => ["plays", "versions", playId] as const,
  },
  team: {
    detail: (teamId: string) => ["team", teamId] as const,
    members: (teamId: string) => ["team", teamId, "members"] as const,
  },
} as const;
