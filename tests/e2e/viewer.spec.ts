import { expect, test } from "@playwright/test";

/**
 * M3 viewer smoke (ROADMAP §6 DoD, the mechanically verifiable parts):
 * a fixture play renders, animates when played, scrubs via the steps
 * list, and auto-pauses at the end.
 *
 * Requires the local Supabase stack (`supabase start`) — the viewer route
 * sits behind auth, so the test signs up a fresh coach with a team first.
 */

function uniqueEmail(prefix: string): string {
  return `${prefix}+${Date.now()}@example.com`;
}

test("a fixture play renders and animates in the viewer", async ({ page }) => {
  // --- Auth + team (viewer routes are gated) ---
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill("Viewer Coach");
  await page.getByLabel("Email").fill(uniqueEmail("viewer"));
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/welcome/);

  await page.getByRole("link", { name: /Create a team/ }).click();
  await page.getByLabel("Team name").fill("Viewer Test Team");
  await page.getByRole("button", { name: "Create team" }).click();
  await expect(page).toHaveURL(/\/playbook/);

  // --- Playbook links to the sample plays ---
  await page.getByRole("link", { name: /Spread P&R/ }).click();
  await expect(page).toHaveURL(/\/play\/play_001/);

  // Title, pills, steps, and notes render.
  await expect(page.getByRole("heading", { name: "Spread P&R" })).toBeVisible();
  await expect(page.getByText("Dribble: PG")).toBeVisible();
  await expect(page.getByText("Screen: PF for PG")).toBeVisible();
  await expect(page.getByText("Pass: PG → SG")).toBeVisible();
  await expect(page.getByText("Notes from coach")).toBeVisible();

  // The court SVG and five player tokens are on screen.
  await expect(page.getByRole("img", { name: /half-court/i })).toBeVisible();
  for (const label of ["PG", "SG", "SF", "PF", "C"]) {
    await expect(page.locator("svg text", { hasText: label }).first()).toBeVisible();
  }

  // --- Playback: time advances after pressing play ---
  const readout = page.getByText(/^\d+\.\ds \/ 5\.0s$/);
  await expect(readout).toHaveText("0.0s / 5.0s");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(readout).not.toHaveText("0.0s / 5.0s");

  // --- Auto-pause at the end (loop off): readout reaches 5.0s ---
  await expect(readout).toHaveText("5.0s / 5.0s", { timeout: 8000 });
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();

  // --- Tapping a step jumps the scrubber to that time ---
  await page.getByRole("button", { name: /Screen: PF for PG/ }).click();
  await expect(readout).toHaveText("2.0s / 5.0s");
});
