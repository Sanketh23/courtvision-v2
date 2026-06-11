import { expect, test } from "@playwright/test";

/**
 * M6 actions flow (ROADMAP §9 DoD): a coach builds a full play —
 * pass → screen → cut → shot — via selection-drives-action, the steps list
 * reflects it, delete + undo work, and the play persists and animates in
 * the viewer with the regenerated ball.
 *
 * Requires the local Supabase stack (`supabase start`).
 */

function uniqueEmail(prefix: string): string {
  return `${prefix}+${Date.now()}@example.com`;
}

test.use({ viewport: { width: 1440, height: 900 } });

test("a coach builds a full play with actions and it animates", async ({ page }) => {
  // --- Coach + team ---
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill("Actions Coach");
  await page.getByLabel("Email").fill(uniqueEmail("actions"));
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  // Generous timeout: on a cold dev server the first compile is slow.
  await expect(page).toHaveURL(/\/welcome/, { timeout: 15_000 });
  await page.getByRole("link", { name: /Create a team/ }).click();
  await page.getByLabel("Team name").fill("Actions Team");
  await page.getByRole("button", { name: "Create team" }).click();
  await expect(page).toHaveURL(/\/playbook/);

  // --- New play (Spread) ---
  await page.getByRole("link", { name: "+ New play" }).click();
  await page.getByRole("button", { name: /Spread/ }).click();
  await expect(page.getByRole("img", { name: /half-court/i })).toBeVisible();

  const railRow = (slot: number) => page.getByTestId(`player-rail-row-${slot}`);
  const scrubber = page.getByLabel("Timeline scrubber");
  const passBtn = page.getByRole("button", { name: "pass", exact: true });

  // Action buttons start disabled (no selection).
  await expect(passBtn).toBeDisabled();

  // --- Pass: PG → SG (select PG, shift-select SG) at t=0 ---
  await railRow(0).click();
  await expect(passBtn).toBeDisabled(); // pass needs 2 players
  await railRow(1).click({ modifiers: ["Shift"] });
  await expect(passBtn).toBeEnabled();
  await passBtn.click();
  await expect(page.getByText("Pass: PG → SG")).toBeVisible();

  // --- Screen: PF for PG at t=1.0s ---
  await scrubber.fill("1000");
  await railRow(3).click();
  await railRow(0).click({ modifiers: ["Shift"] });
  await page.getByRole("button", { name: "screen", exact: true }).click();
  await expect(page.getByText("Screen: PF for PG")).toBeVisible();

  // --- Cut: PG at t=1.5s ---
  await scrubber.fill("1500");
  await railRow(0).click();
  await page.getByRole("button", { name: "cut", exact: true }).click();
  await expect(page.getByText("Cut: PG")).toBeVisible();

  // --- Shot: PG at t=2.5s ---
  await scrubber.fill("2500");
  await railRow(0).click();
  await page.getByRole("button", { name: "shot", exact: true }).click();
  await expect(page.getByText("Shot: PG")).toBeVisible();

  // Four action bars exist on the timeline lanes (pass/screen render on two
  // lanes each: 2+2+1+1 = 6 bars for 4 actions).
  await expect(page.locator('[data-testid^="action-bar-"]')).toHaveCount(6);

  // --- Delete the cut via the steps list + Delete key, then undo ---
  await page.getByRole("button", { name: /Cut: PG/ }).click();
  await page.keyboard.press("Backspace");
  await expect(page.getByText("Cut: PG")).toHaveCount(0);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.getByText("Cut: PG")).toBeVisible();

  // --- Save → persists ---
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/play\/[0-9a-f-]{36}\/edit$/, { timeout: 10_000 });

  // --- The viewer animates it with the regenerated ball ---
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page).toHaveURL(/\/play\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Pass: PG → SG")).toBeVisible();
  await expect(page.getByText("Shot: PG")).toBeVisible();

  const readout = page.getByText(/^\d+\.\ds \/ 4\.0s$/);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(readout).not.toHaveText("0.0s / 4.0s");
});
