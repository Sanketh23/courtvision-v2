import { expect, test } from "@playwright/test";

/**
 * M8 versioning flow (ROADMAP §11 DoD): every save creates a version, the
 * history modal lists them newest-first with the current highlighted, a past
 * version can be previewed, and restoring creates a NEW version that brings
 * the old state back into the editor.
 *
 * Requires the local Supabase stack (`supabase start`).
 */

function uniqueEmail(prefix: string): string {
  return `${prefix}+${Date.now()}@example.com`;
}

/** Open the kebab → Version history, retrying across the hydration window
 * (after a reload the button exists in server HTML before handlers attach). */
async function openHistory(page: import("@playwright/test").Page): Promise<void> {
  await expect(async () => {
    await page.getByRole("button", { name: "More options" }).click();
    await expect(page.getByRole("button", { name: "Version history" })).toBeVisible({
      timeout: 1000,
    });
  }).toPass({ timeout: 15_000 });
  await page.getByRole("button", { name: "Version history" }).click();
}

test.use({ viewport: { width: 1440, height: 900 } });

test("saves create versions; restore brings an old state back", async ({ page }) => {
  // --- Coach + team ---
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill("Version Coach");
  await page.getByLabel("Email").fill(uniqueEmail("version"));
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/welcome/, { timeout: 15_000 });
  await page.getByRole("link", { name: /Create a team/ }).click();
  await page.getByLabel("Team name").fill("Version Team");
  await page.getByRole("button", { name: "Create team" }).click();
  await expect(page).toHaveURL(/\/playbook/, { timeout: 15_000 });

  // --- v1: create + save ---
  await page.getByRole("link", { name: "+ New play" }).first().click();
  await page.getByRole("button", { name: /Spread/ }).click();
  await page.getByLabel("Play name").fill("Versioned Set");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/edit$/, { timeout: 10_000 });

  // --- v2: add motion (drag PG at t=2s) + save ---
  const scrubber = page.getByLabel("Timeline scrubber");
  await scrubber.fill("2000");
  const token = page.getByTestId("player-token-0");
  const tokenBox = await token.boundingBox();
  const court = page.getByRole("img", { name: /half-court/i });
  const courtBox = await court.boundingBox();
  if (!tokenBox || !courtBox) throw new Error("editor not laid out");
  await page.mouse.move(tokenBox.x + tokenBox.width / 2, tokenBox.y + tokenBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(courtBox.x + courtBox.width * 0.7, courtBox.y + courtBox.height * 0.45, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(page.getByTestId("player-rail-row-0")).toContainText("3 kf");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  // --- History modal: two versions, newest first, current highlighted ---
  await openHistory(page);
  const modal = page.getByRole("dialog", { name: "Version history" });
  await expect(modal.getByText("2 versions")).toBeVisible();
  await expect(modal.getByText("v2")).toBeVisible();
  await expect(modal.getByText("Current")).toBeVisible();
  await expect(modal.getByText("Created")).toBeVisible(); // v1 summary

  // --- Preview v1 (read-only, scrubable) ---
  await modal.getByRole("button", { name: /v1/ }).click();
  await expect(modal.getByLabel("Preview timeline")).toBeVisible();

  // --- Restore v1 with confirmation ---
  await modal.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(modal.getByText(/Restoring will create a new version/)).toBeVisible();
  await modal.getByRole("button", { name: "Proceed" }).click();

  // Editor reloads with the restored (v1) state: PG back to 2 keyframes.
  await expect(page.getByTestId("player-rail-row-0")).toContainText("2 kf", { timeout: 15_000 });

  // --- History now shows three versions; restore annotated ---
  await openHistory(page);
  const modal2 = page.getByRole("dialog", { name: "Version history" });
  await expect(modal2.getByText("3 versions")).toBeVisible();
  await expect(modal2.getByText("Restored from v1")).toBeVisible();
});
