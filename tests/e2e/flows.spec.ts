import { expect, test } from "@playwright/test";

/**
 * The three canonical launch-acceptance flows (ARCHITECTURE.md §11.3 /
 * ROADMAP M10 DoD: "all three E2E flows pass"). Other specs exercise
 * finer-grained behavior; these are the end-to-end paths a real coach and
 * player must be able to complete.
 *
 * Requires the local Supabase stack (`supabase start`).
 */

function uniqueEmail(prefix: string): string {
  return `${prefix}+${Date.now()}-${Math.floor(Math.random() * 1e4)}@example.com`;
}

test.use({ viewport: { width: 1440, height: 900 } });

/** Sign up → create team → create a play → publish → view it. */
async function makeCoachWithPublishedPlay(
  page: import("@playwright/test").Page,
  teamName: string,
): Promise<string> {
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill("Flow Coach");
  await page.getByLabel("Email").fill(uniqueEmail("flow-coach"));
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/welcome/, { timeout: 15_000 });

  await page.getByRole("link", { name: /Create a team/ }).click();
  await page.getByLabel("Team name").fill(teamName);
  const inviteCode = (await page.locator("span.font-mono").first().textContent())?.trim() ?? "";
  await page.getByRole("button", { name: "Create team" }).click();
  await expect(page).toHaveURL(/\/playbook/);

  await page.getByRole("link", { name: "+ New play" }).first().click();
  const spread = page.getByRole("button", { name: /Spread/ });
  await expect(spread).toBeVisible({ timeout: 20_000 });
  await spread.click();
  await expect(page.getByLabel("Play name")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Play name").fill("Flow Play");
  await page.getByLabel("Status").selectOption("published");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/edit$/, { timeout: 10_000 });

  return inviteCode;
}

test("flow 1: sign up → create team → create play → publish → view", async ({ page }) => {
  await makeCoachWithPublishedPlay(page, "Flow One Team");

  // View the published play in the viewer (mobile-first layout, responsive).
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/playbook");
  await page
    .getByRole("link", { name: /Flow Play/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/play\//);
  await expect(page.getByRole("heading", { name: "Flow Play" })).toBeVisible();
  await expect(page.getByRole("img", { name: /half-court/i })).toBeVisible();
  // It animates.
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByText(/0\.[1-9]s|[1-9]\.\ds/)).toBeVisible();
});

test("flow 2: player joins via code → sees published play → marks studied", async ({ browser }) => {
  const coachCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const coachPage = await coachCtx.newPage();
  const code = await makeCoachWithPublishedPlay(coachPage, "Flow Two Team");

  const playerCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const player = await playerCtx.newPage();
  await player.goto("/join");
  await player.getByLabel("Team code").fill(code);
  await player.getByLabel("Full name").fill("Flow Player");
  await player.getByLabel("Email").fill(uniqueEmail("flow-player"));
  await player.getByLabel("Password").fill("password123");
  await player.getByRole("button", { name: "Join team" }).click();
  await expect(player).toHaveURL(/\/playbook/, { timeout: 15_000 });

  // Sees the published play, opens it, marks it studied.
  await player
    .getByRole("link", { name: /Flow Play/ })
    .first()
    .click();
  const checkbox = player.getByRole("checkbox", { name: "Mark studied" });
  await checkbox.check();
  await expect(checkbox).toBeChecked();

  await coachCtx.close();
  await playerCtx.close();
});

test("flow 3: edit play → undo → save → version history shows two versions", async ({ page }) => {
  await makeCoachWithPublishedPlay(page, "Flow Three Team"); // play saved = v1

  const scrubber = page.getByLabel("Timeline scrubber");
  const court = page.getByRole("img", { name: /half-court/i });
  const courtBox = await court.boundingBox();
  if (!courtBox) throw new Error("court not laid out");

  // Edit: drag PG to make a keyframe at 2s → 3 keyframes.
  await scrubber.fill("2000");
  let token = await page.getByTestId("player-token-0").boundingBox();
  if (!token) throw new Error("token not laid out");
  await page.mouse.move(token.x + token.width / 2, token.y + token.height / 2);
  await page.mouse.down();
  await page.mouse.move(courtBox.x + courtBox.width * 0.7, courtBox.y + courtBox.height * 0.45, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(page.getByTestId("player-rail-row-0")).toContainText("3 kf");

  // Undo: the whole drag is one undo step → back to 2 keyframes.
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByTestId("player-rail-row-0")).toContainText("2 kf");

  // Make a real edit and save → v2.
  await scrubber.fill("3000");
  token = await page.getByTestId("player-token-0").boundingBox();
  if (!token) throw new Error("token not laid out");
  await page.mouse.move(token.x + token.width / 2, token.y + token.height / 2);
  await page.mouse.down();
  await page.mouse.move(courtBox.x + courtBox.width * 0.3, courtBox.y + courtBox.height * 0.6, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(page.getByTestId("player-rail-row-0")).toContainText("3 kf");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  // Version history shows two versions.
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("button", { name: "Version history" }).click();
  await expect(
    page.getByRole("dialog", { name: "Version history" }).getByText("2 versions"),
  ).toBeVisible();
});
