import { expect, test } from "@playwright/test";

/**
 * M1 core flow (ROADMAP §4 DoD):
 *   coach signs up -> creates team -> sees invite code
 *   -> second user joins via that code as a player -> lands on playbook.
 *
 * Requires the local Supabase stack running (`supabase start`) and a fresh-ish
 * DB. Emails are unique per run to avoid collisions.
 */

function uniqueEmail(prefix: string): string {
  return `${prefix}+${Date.now()}@example.com`;
}

test("coach creates a team and a player joins via code", async ({ browser }) => {
  const coachContext = await browser.newContext();
  const coachPage = await coachContext.newPage();

  // --- Coach signs up ---
  await coachPage.goto("/sign-up");
  await coachPage.getByLabel("Full name").fill("Coach Carter");
  await coachPage.getByLabel("Email").fill(uniqueEmail("coach"));
  await coachPage.getByLabel("Password").fill("password123");
  await coachPage.getByRole("button", { name: "Create account" }).click();

  // Routed to welcome.
  await expect(coachPage).toHaveURL(/\/welcome/);

  // --- Coach creates a team ---
  await coachPage.getByRole("link", { name: /Create a team/ }).click();
  await expect(coachPage).toHaveURL(/\/team\/new/);

  await coachPage.getByLabel("Team name").fill("Lincoln Eagles");
  const inviteCode = (await coachPage.locator("span.font-mono").first().textContent())?.trim();
  expect(inviteCode).toBeTruthy();

  await coachPage.getByRole("button", { name: "Create team" }).click();

  // Lands on playbook, invite code visible in the onboarding strip.
  await expect(coachPage).toHaveURL(/\/playbook/);
  await expect(coachPage.getByTestId("invite-code")).toHaveText(inviteCode as string);

  // --- Player joins via the code ---
  const playerContext = await browser.newContext();
  const playerPage = await playerContext.newPage();

  await playerPage.goto("/join");
  await playerPage.getByLabel("Team code").fill(inviteCode as string);

  // Code validates -> confirmation + stage 2 reveal.
  await expect(playerPage.getByText("Joining Lincoln Eagles")).toBeVisible();

  await playerPage.getByLabel("Full name").fill("Player One");
  await playerPage.getByLabel("Email").fill(uniqueEmail("player"));
  await playerPage.getByLabel("Password").fill("password123");
  await playerPage.getByRole("button", { name: "Join team" }).click();

  // Player lands on playbook (player view — no invite strip).
  await expect(playerPage).toHaveURL(/\/playbook/);
  await expect(playerPage.getByTestId("invite-strip")).toHaveCount(0);

  await coachContext.close();
  await playerContext.close();
});
