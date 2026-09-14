import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, type Locator, type Page } from "@playwright/test";
import { cloudE2EAvailable } from "./env";

export async function openApp(page: Page, path: string) {
  if (cloudE2EAvailable()) {
    await setupClerkTestingToken({ page });
  }
  await page.goto(path);
  await expect(page.getByText("Loading workspace", { exact: true })).toBeHidden();
}

export async function waitForClerk(page: Page) {
  await page.waitForFunction(() => {
    const clerkWindow = window as typeof window & { Clerk?: { loaded?: boolean } };
    return clerkWindow.Clerk?.loaded === true;
  });
}

export async function chooseLocalMode(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("cutlab-studio:auth-mode:v1", "local");
  });
}

export async function createProject(page: Page, title: string, client = "E2E Client") {
  await page.getByRole("button", { name: /New (?:Personal |Team )?Project/ }).first().click();
  await page.getByRole("button", { name: "Blank project" }).click();
  const dialog = page.getByRole("dialog", { name: "New Project" });
  await dialog.getByLabel("Project name").fill(title);
  await dialog.getByLabel("Client").click();
  await page.getByPlaceholder("Search or type a client...").fill(client);
  await page.keyboard.press("Escape");
  await selectOption(dialog.getByLabel("Tag"), page, "Freelance");
  await dialog.getByLabel("Earnings").fill("1250");
  await dialog.getByLabel("Notes").fill("Created by the Playwright core workflow.");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(projectRow(page, title)).toBeVisible();
}

export function projectRow(page: Page, title: string) {
  return page.locator('[data-testid="project-row"]').filter({ hasText: title });
}

export async function openProject(page: Page, title: string) {
  await projectRow(page, title).click();
  await page
    .getByRole("complementary")
    .filter({ hasText: title })
    .getByRole("button", { name: "Open", exact: true })
    .click();
  const detail = page.getByTestId("project-detail-dialog");
  await expect(detail.getByText(title, { exact: true }).first()).toBeVisible();
  return detail;
}

export async function selectOption(select: Locator, page: Page, option: string) {
  await select.click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
