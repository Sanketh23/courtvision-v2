import { expect, test } from "@playwright/test";

/**
 * M9 polish (ROADMAP §12 DoD): a player marks a play studied (the unstudied
 * dot clears), a coach manages the team (regenerate invite code, view roster)
 * and reaches account settings.
 *
 * Requires the local Supabase stack (`supabase start`).
 */

function uniqueEmail(prefix: string): string {
  return `${prefix}+${Date.now()}@example.com`;
}

test.use({ viewport: { width: 1440, height: 900 } });

test("coach manages team + account; player marks a play studied", async ({ browser }) => {
  const coachCtx = await browser.newContext();
  const page = await coachCtx.newPage();

  // --- Coach + team + a published play ---
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill("Polish Coach");
  await page.getByLabel("Email").fill(uniqueEmail("polish"));
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/welcome/, { timeout: 15_000 });
  await page.getByRole("link", { name: /Create a team/ }).click();
  await page.getByLabel("Team name").fill("Polish Team");
  const inviteCode = (await page.locator("span.font-mono").first().textContent())?.trim() ?? "";
  await page.getByRole("button", { name: "Create team" }).click();
  await expect(page).toHaveURL(/\/playbook/);

  await page.getByRole("link", { name: "+ New play" }).first().click();
  // Cold compile of /play/new + the lazy editor chunk can be slow under load.
  const spread = page.getByRole("button", { name: /Spread/ });
  await expect(spread).toBeVisible({ timeout: 20_000 });
  await spread.click();
  await expect(page.getByLabel("Play name")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Play name").fill("Studied Set");
  await page.getByLabel("Status").selectOption("published");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/edit$/, { timeout: 10_000 });

  // --- Team management: roster + regenerate invite code ---
  await page.goto("/team");
  await expect(page.getByText("Polish Coach")).toBeVisible();
  await expect(page.getByText("(you)")).toBeVisible();
  const codeEl = page.getByTestId("team-invite-code");
  await expect(codeEl).toHaveText(inviteCode);
  await page.getByRole("button", { name: "Regenerate" }).click();
  await expect(codeEl).not.toHaveText(inviteCode, { timeout: 10_000 });
  const newCode = (await codeEl.textContent())?.trim() ?? "";

  // --- Account settings reachable, profile shows ---
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
  await expect(page.getByText("Polish Coach")).toBeVisible();
  await expect(page.getByRole("button", { name: "Update password" })).toBeVisible();

  // --- Player joins (with the regenerated code) and marks the play studied ---
  const playerCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const player = await playerCtx.newPage();
  await player.goto("/join");
  await player.getByLabel("Team code").fill(newCode);
  await player.getByLabel("Full name").fill("Polish Player");
  await player.getByLabel("Email").fill(uniqueEmail("polish-player"));
  await player.getByLabel("Password").fill("password123");
  await player.getByRole("button", { name: "Join team" }).click();
  await expect(player).toHaveURL(/\/playbook/, { timeout: 15_000 });

  // Unstudied dot present, then open the play and mark studied.
  await expect(player.getByLabel("Not studied yet").first()).toBeVisible();
  await player
    .getByRole("link", { name: /Studied Set/ })
    .first()
    .click();
  await expect(player).toHaveURL(/\/play\//);
  const checkbox = player.getByRole("checkbox", { name: "Mark studied" });
  await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  // Let the server action + router.refresh settle before navigating away.
  await player.waitForTimeout(500);

  // Back on the playbook the unstudied dot is gone (retry across the
  // route-cache revalidation window).
  await expect(async () => {
    await player.goto("/playbook");
    await expect(player.getByLabel("Not studied yet")).toHaveCount(0, { timeout: 1000 });
  }).toPass({ timeout: 15_000 });

  await coachCtx.close();
  await playerCtx.close();
});
