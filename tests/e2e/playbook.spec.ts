import { expect, test } from "@playwright/test";

/**
 * M7 playbook flow (ROADMAP §10 DoD): a coach with a published and a draft
 * play gets the full browse experience — thumbnails, search, category URL
 * filter, status filter, sort, grid/list toggle, recently-edited strip —
 * and a player who joins sees only the published play in the mobile view.
 *
 * Requires the local Supabase stack (`supabase start`).
 */

function uniqueEmail(prefix: string): string {
  return `${prefix}+${Date.now()}@example.com`;
}

test.use({ viewport: { width: 1440, height: 900 } });

test("coach browses, filters, and sorts; player sees published plays only", async ({ browser }) => {
  const coachContext = await browser.newContext();
  const page = await coachContext.newPage();

  // --- Coach + team ---
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill("Browse Coach");
  await page.getByLabel("Email").fill(uniqueEmail("browse"));
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/welcome/, { timeout: 15_000 });
  await page.getByRole("link", { name: /Create a team/ }).click();
  await page.getByLabel("Team name").fill("Browse Team");
  const inviteCode = (await page.locator("span.font-mono").first().textContent())?.trim() ?? "";
  await page.getByRole("button", { name: "Create team" }).click();
  await expect(page).toHaveURL(/\/playbook/);

  // Empty state first (§5.8).
  await expect(page.getByText("Your playbook is empty")).toBeVisible();

  // --- Create play 1: published "Spread Attack" ---
  await page.getByRole("link", { name: "+ New play" }).first().click();
  await page.getByRole("button", { name: /Spread/ }).click();
  await page.getByLabel("Play name").fill("Spread Attack");
  await page.getByLabel("Status").selectOption("published");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/edit$/, { timeout: 10_000 });

  // --- Create play 2: draft "Box Special" ---
  await page.goto("/play/new");
  await page.getByRole("button", { name: /Box/ }).click();
  await page.getByLabel("Play name").fill("Box Special");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/edit$/, { timeout: 10_000 });

  // --- Coach browse ---
  await page.goto("/playbook");
  // Both plays visible with SVG thumbnails (court title present per tile).
  await expect(page.getByRole("link", { name: /Spread Attack/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Box Special/ }).first()).toBeVisible();
  expect(await page.getByRole("img", { name: /half-court/i }).count()).toBeGreaterThanOrEqual(2);

  // Recently edited strip exists.
  await expect(page.getByRole("heading", { name: "Recently edited" })).toBeVisible();

  // Search narrows.
  await page.getByPlaceholder("Search plays…").fill("box");
  await expect(page.getByRole("link", { name: /Spread Attack/ })).toHaveCount(1); // strip only
  await page.getByPlaceholder("Search plays…").fill("");

  // Status filter: draft only.
  await page.getByLabel("draft").check();
  await expect(page.locator("li", { has: page.getByText("Box Special") }).first()).toBeVisible();
  await page.getByRole("button", { name: "Clear all filters" }).click();

  // Sort: alphabetical (Box Special before Spread Attack in the grid).
  await page.getByLabel("Sort plays").selectOption("alphabetical");

  // View toggle: list.
  await page.getByRole("button", { name: "list", exact: true }).click();
  await expect(page.getByRole("button", { name: "list", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // Category chip → URL (§5.7): pick the offense category in the rail.
  await page.getByRole("button", { name: "offense", exact: true }).first().click();
  await expect(page).toHaveURL(/category=offense/);

  // --- Player joins and sees only the published play (mobile view) ---
  const playerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const playerPage = await playerContext.newPage();
  await playerPage.goto("/join");
  await playerPage.getByLabel("Team code").fill(inviteCode);
  await playerPage.getByLabel("Full name").fill("Browse Player");
  await playerPage.getByLabel("Email").fill(uniqueEmail("browse-player"));
  await playerPage.getByLabel("Password").fill("password123");
  await playerPage.getByRole("button", { name: "Join team" }).click();
  await expect(playerPage).toHaveURL(/\/playbook/, { timeout: 15_000 });

  // Player browse (§6): recently added + all plays, published only, New pill.
  await expect(playerPage.getByText("Recently added")).toBeVisible();
  await expect(playerPage.getByRole("link", { name: /Spread Attack/ }).first()).toBeVisible();
  await expect(playerPage.getByText("Box Special")).toHaveCount(0); // draft hidden by RLS
  await expect(playerPage.getByText("New", { exact: true }).first()).toBeVisible();

  await coachContext.close();
  await playerContext.close();
});
