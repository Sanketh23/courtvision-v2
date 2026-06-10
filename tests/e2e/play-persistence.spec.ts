import { expect, test } from "@playwright/test";

/**
 * M4 persistence flow (ROADMAP §7 DoD): a coach creates a play, it persists
 * to the database, appears in the playbook, and the viewer renders the
 * database-loaded play (a real UUID route, not a fixture).
 *
 * Requires the local Supabase stack (`supabase start`).
 */

function uniqueEmail(prefix: string): string {
  return `${prefix}+${Date.now()}@example.com`;
}

test("a coach creates a play that persists and animates from the database", async ({ page }) => {
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

  // No database plays yet.
  await expect(page.getByText("No plays yet", { exact: false })).toBeVisible();

  // --- Create a play (server action inserts into the database) ---
  await page.getByRole("button", { name: "+ Add sample play" }).click();

  // Lands on the viewer at a real UUID route (not a fixture id).
  await expect(page).toHaveURL(/\/play\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Spread P&R (sample)" })).toBeVisible();
  await expect(page.getByText("Pass: PG → SG")).toBeVisible();

  // It animates (DB-loaded play is identical to a fixture).
  const readout = page.getByText(/^\d+\.\ds \/ 5\.0s$/);
  await expect(readout).toHaveText("0.0s / 5.0s");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(readout).not.toHaveText("0.0s / 5.0s");

  // --- It persists: back in the playbook it shows as a draft ---
  await page.getByRole("link", { name: "Playbook" }).click();
  await expect(page).toHaveURL(/\/playbook/);
  const card = page.getByRole("link", { name: /Spread P&R \(sample\)/ });
  await expect(card).toBeVisible();
  await expect(card.getByText("draft")).toBeVisible();

  // --- Survives a reload (it's in the database, not memory) ---
  await page.reload();
  await expect(page.getByRole("link", { name: /Spread P&R \(sample\)/ })).toBeVisible();
});
