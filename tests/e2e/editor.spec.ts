import { expect, test } from "@playwright/test";

/**
 * M5 editor flow (ROADMAP §8 DoD): a coach creates a new play, picks a
 * formation, drags a player to create keyframed motion, saves, and the
 * motion persists across a reload.
 *
 * Requires the local Supabase stack (`supabase start`). Runs at desktop
 * width (the editor is desktop-only).
 */

function uniqueEmail(prefix: string): string {
  return `${prefix}+${Date.now()}@example.com`;
}

test.use({ viewport: { width: 1440, height: 900 } });

test("a coach builds keyframed motion in the editor and it persists", async ({ page }) => {
  // --- Coach + team ---
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill("Editor Coach");
  await page.getByLabel("Email").fill(uniqueEmail("editor"));
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/welcome/);

  await page.getByRole("link", { name: /Create a team/ }).click();
  await page.getByLabel("Team name").fill("Editor Team");
  await page.getByRole("button", { name: "Create team" }).click();
  await expect(page).toHaveURL(/\/playbook/);

  // --- New play → formation picker ---
  await page.getByRole("link", { name: "+ New play" }).click();
  await expect(page).toHaveURL(/\/play\/new/);
  await expect(page.getByRole("heading", { name: /starting formation/i })).toBeVisible();
  await page.getByRole("button", { name: /Spread/ }).click();

  // Editor opens with five players placed and the timeline visible.
  await expect(page.getByRole("img", { name: /half-court/i })).toBeVisible();
  await expect(page.getByLabel("Play name")).toHaveValue("Untitled play");

  // --- Scrub to 2s, then drag the PG token to make a keyframe there ---
  const scrubber = page.getByLabel("Timeline scrubber");
  await scrubber.fill("2000");

  // Start the drag on the PG token itself (slot 0), so onPointerDown fires.
  const pgToken = page.getByTestId("player-token-0");
  const tokenBox = await pgToken.boundingBox();
  const court = page.getByRole("img", { name: /half-court/i });
  const courtBox = await court.boundingBox();
  if (!tokenBox || !courtBox) throw new Error("editor not laid out");

  await page.mouse.move(tokenBox.x + tokenBox.width / 2, tokenBox.y + tokenBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(courtBox.x + courtBox.width * 0.7, courtBox.y + courtBox.height * 0.5, {
    steps: 10,
  });
  await page.mouse.up();

  // PG (rail button) now shows 3 keyframes: start, the new one, end.
  await expect(page.getByTestId("player-rail-row-0")).toContainText("3 kf");

  // --- Save → URL becomes a real UUID edit route ---
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/play\/[0-9a-f-]{36}\/edit$/, { timeout: 10_000 });
  await expect(page.getByText("Saved")).toBeVisible();

  // --- Reload: the third keyframe persisted ---
  await page.reload();
  await expect(page.getByTestId("player-rail-row-0")).toContainText("3 kf");
});
