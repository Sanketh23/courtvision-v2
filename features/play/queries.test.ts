import { describe, expect, it } from "vitest";
import { spreadPr } from "@/features/play/fixtures";
import { getPlay, listPlays } from "@/features/play/queries";

/**
 * Query-layer behavior that doesn't need a live database: the read path
 * validates the stored JSON against the play schema (M4 DoD), and a
 * database-loaded play round-trips identically to the fixture.
 *
 * The Supabase client is stubbed to the minimal chain each query uses.
 */

function clientReturning(row: unknown) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: row, error: null }),
          order: () => Promise.resolve({ data: row, error: null }),
        }),
      }),
    }),
    // biome-ignore lint/suspicious/noExplicitAny: minimal test stub
  } as any;
}

describe("getPlay", () => {
  it("parses the stored data into a schema-valid Play identical to the fixture", async () => {
    const client = clientReturning({ id: spreadPr.id, data: spreadPr });
    const play = await getPlay(client, spreadPr.id);
    expect(play).toEqual(spreadPr);
  });

  it("returns null when no row is found", async () => {
    const client = clientReturning(null);
    expect(await getPlay(client, "missing")).toBeNull();
  });

  it("throws when the stored data fails schema validation", async () => {
    const broken = { ...structuredClone(spreadPr), duration: -1 };
    const client = clientReturning({ id: spreadPr.id, data: broken });
    await expect(getPlay(client, spreadPr.id)).rejects.toThrow(/failed schema validation/);
  });
});

describe("listPlays", () => {
  it("maps rows to summaries with camelCased fields", async () => {
    const rows = [
      {
        id: "p1",
        team_id: "t1",
        name: "Set A",
        category: "offense",
        formation: "5-out",
        status: "published",
        tags: ["base"],
        duration_seconds: 5,
        updated_at: "2026-06-01T00:00:00Z",
        data: { actions: [{ id: "a1" }, { id: "a2" }] },
        description: null,
        created_at: "2026-06-01T00:00:00Z",
        created_by: "u1",
        published_at: null,
        published_by: null,
      },
    ];
    const client = clientReturning(rows);
    const summaries = await listPlays(client, "t1");
    expect(summaries).toEqual([
      {
        id: "p1",
        teamId: "t1",
        name: "Set A",
        category: "offense",
        formation: "5-out",
        status: "published",
        tags: ["base"],
        durationSeconds: 5,
        actionCount: 2,
        createdAt: "2026-06-01T00:00:00Z",
        updatedAt: "2026-06-01T00:00:00Z",
        data: { actions: [{ id: "a1" }, { id: "a2" }] },
      },
    ]);
  });

  it("propagates query errors", async () => {
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({ order: () => Promise.resolve({ data: null, error: { message: "boom" } }) }),
        }),
      }),
      // biome-ignore lint/suspicious/noExplicitAny: minimal test stub
    } as any;
    await expect(listPlays(client, "t1")).rejects.toThrow("boom");
  });
});
