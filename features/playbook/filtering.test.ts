import { describe, expect, it } from "vitest";
import {
  applyFilters,
  categoriesOf,
  hasActiveFilters,
  isNew,
  recentlyAdded,
  recentlyEdited,
  sortItems,
  tagsOf,
} from "@/features/playbook/filtering";
import { EMPTY_FILTERS, type PlaybookItem } from "@/features/playbook/types";

function item(overrides: Partial<PlaybookItem> & { id: string }): PlaybookItem {
  return {
    name: overrides.id,
    category: "offense",
    formation: null,
    status: "published",
    tags: [],
    durationSeconds: 5,
    actionCount: 0,
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

const items: PlaybookItem[] = [
  item({
    id: "a",
    name: "Spread P&R",
    category: "offense",
    tags: ["pnr", "base"],
    status: "published",
    actionCount: 3,
    durationSeconds: 5,
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-09T00:00:00Z",
  }),
  item({
    id: "b",
    name: "Box BLOB",
    category: "blob",
    tags: ["inbound"],
    status: "draft",
    actionCount: 5,
    durationSeconds: 4,
    createdAt: "2026-06-05T00:00:00Z",
    updatedAt: "2026-06-08T00:00:00Z",
  }),
  item({
    id: "c",
    name: "Horns Flare",
    category: "offense",
    tags: ["pnr"],
    status: "archived",
    actionCount: 1,
    durationSeconds: 8,
    createdAt: "2026-06-03T00:00:00Z",
    updatedAt: "2026-06-10T00:00:00Z",
  }),
];

describe("applyFilters", () => {
  it("returns everything with empty filters", () => {
    expect(applyFilters(items, EMPTY_FILTERS)).toHaveLength(3);
  });

  it("filters by single category", () => {
    const out = applyFilters(items, { ...EMPTY_FILTERS, category: "blob" });
    expect(out.map((i) => i.id)).toEqual(["b"]);
  });

  it("ORs statuses", () => {
    const out = applyFilters(items, { ...EMPTY_FILTERS, statuses: ["draft", "archived"] });
    expect(out.map((i) => i.id)).toEqual(["b", "c"]);
  });

  it("ANDs tags", () => {
    const out = applyFilters(items, { ...EMPTY_FILTERS, tags: ["pnr", "base"] });
    expect(out.map((i) => i.id)).toEqual(["a"]);
  });

  it("searches by name, case-insensitive", () => {
    const out = applyFilters(items, { ...EMPTY_FILTERS, search: "horns" });
    expect(out.map((i) => i.id)).toEqual(["c"]);
  });

  it("combines all filter dimensions", () => {
    const out = applyFilters(items, {
      category: "offense",
      statuses: ["published", "archived"],
      tags: ["pnr"],
      search: "spread",
    });
    expect(out.map((i) => i.id)).toEqual(["a"]);
  });
});

describe("sortItems", () => {
  it("sorts by each option", () => {
    expect(sortItems(items, "recently-edited").map((i) => i.id)).toEqual(["c", "a", "b"]);
    expect(sortItems(items, "recently-created").map((i) => i.id)).toEqual(["b", "c", "a"]);
    expect(sortItems(items, "alphabetical").map((i) => i.id)).toEqual(["b", "c", "a"]);
    expect(sortItems(items, "most-actions").map((i) => i.id)).toEqual(["b", "a", "c"]);
    expect(sortItems(items, "duration").map((i) => i.id)).toEqual(["c", "a", "b"]);
  });

  it("does not mutate the input", () => {
    const before = items.map((i) => i.id);
    sortItems(items, "alphabetical");
    expect(items.map((i) => i.id)).toEqual(before);
  });
});

describe("surfaces", () => {
  it("recentlyEdited is filter-independent and capped", () => {
    expect(recentlyEdited(items, 2).map((i) => i.id)).toEqual(["c", "a"]);
  });
  it("recentlyAdded uses creation time", () => {
    expect(recentlyAdded(items, 2).map((i) => i.id)).toEqual(["b", "c"]);
  });
});

describe("isNew", () => {
  const now = new Date("2026-06-10T00:00:00Z");
  it("is true within 7 days, false after (or for future timestamps)", () => {
    expect(isNew("2026-06-05T00:00:00Z", now)).toBe(true);
    expect(isNew("2026-06-01T00:00:00Z", now)).toBe(false);
    expect(isNew("2026-06-11T00:00:00Z", now)).toBe(false);
  });
});

describe("facets + active filters", () => {
  it("collects distinct categories and tags", () => {
    expect(categoriesOf(items)).toEqual(["blob", "offense"]);
    expect(tagsOf(items)).toEqual(["base", "inbound", "pnr"]);
  });
  it("detects active filters", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, search: "x" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, category: "offense" })).toBe(true);
  });
});
