import { expect, test } from "@playwright/test";

/**
 * M4 persistence flow (ROADMAP §7 DoD): a play created in the editor
 * persists to the database, appears in the playbook, and the viewer renders
 * the database-loaded play (a real UUID route) — animating identically to a
 * fixture.
 *
 * Requires the local Supabase stack (`supabase start`). Runs at desktop
 * width since play creation goes through the desktop-only editor.
 */

function uniqueEmail(prefix: string): string {
  return `${prefix}+${Date.now()}@example.com`;
}

test.use({ viewport: { width: 1440, height: 900 } });

test("a database-loaded play animates in the viewer", async ({ page }) => {
  // --- Coach + team ---
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill("Persist Coach");
  await page.getByLabel("Email").fill(uniqueEmail("persist"));
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/welcome/);

  await page.getByRole("link", { name: /Create a team/ }).click();
  await page.getByLabel("Team name").fill("Persist Team");
  await page.getByRole("button", { name: "Create team" }).click();
  await expect(page).toHaveURL(/\/playbook/);

  // No database plays yet (M7 coach empty state).
  await expect(page.getByText("Your playbook is empty")).toBeVisible();

  // --- Create a play in the editor and save it to the database ---
  await page.getByRole("link", { name: "+ New play" }).click();
  await page.getByRole("button", { name: /Spread/ }).click();
  await page.getByLabel("Play name").fill("Persisted Set");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/play\/[0-9a-f-]{36}\/edit$/, { timeout: 10_000 });

  // --- It shows in the playbook (the back control is a button) ---
  await page.getByRole("button", { name: "Back to playbook" }).click();
  await expect(page).toHaveURL(/\/playbook/);
  const card = page.getByRole("link", { name: /Persisted Set/ }).first();
  await expect(card).toBeVisible();

  // --- Open it in the viewer: a real UUID route, animating from the DB ---
  await card.click();
  await expect(page).toHaveURL(/\/play\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Persisted Set" })).toBeVisible();
  await expect(page.getByRole("img", { name: /half-court/i })).toBeVisible();

  const readout = page.getByText(/^\d+\.\ds \/ 4\.0s$/);
  await expect(readout).toHaveText("0.0s / 4.0s");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(readout).not.toHaveText("0.0s / 4.0s");

  // --- Survives a reload (it's in the database, not memory) ---
  await page.goto("/playbook");
  await expect(page.getByRole("link", { name: /Persisted Set/ }).first()).toBeVisible();
});
