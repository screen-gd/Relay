import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, type Page } from "@playwright/test";
import { cloudE2EAvailable } from "./env";

export async function openApp(page: Page, path: string) {
  if (cloudE2EAvailable()) {
    await setupClerkTestingToken({ page });
  }
  await page.goto(path);
  await expect(
    page.getByText("Loading workspace", { exact: true })
  ).toBeHidden();
}

export async function waitForClerk(page: Page) {
  await page.waitForFunction(() => {
    const clerkWindow = window as typeof window & {
      Clerk?: { loaded?: boolean };
    };
    return clerkWindow.Clerk?.loaded === true;
  });
}

export async function chooseLocalMode(page: Page) {
  await page.addInitScript(() => {
    // Compatibility identifier used by the app for existing local workspaces.
    window.localStorage.setItem("cutlab-studio:auth-mode:v1", "local");
    window.localStorage.setItem(
      "relay:development-disclaimer:v1",
      "acknowledged"
    );
  });
}

export async function createProject(
  page: Page,
  title: string,
  client = "E2E Client"
) {
  await page.getByRole("button", { name: "Quick create project" }).click();
  const dialog = page.getByRole("dialog", { name: "New Project" });
  await dialog.getByLabel("Project name").fill(title);
  await dialog.getByRole("button", { name: "Create new Client" }).click();
  await dialog.getByLabel("New Client name").fill(client);
  await dialog.getByRole("button", { name: "Add Client", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Create Project", exact: true })
    .click();
  await expect(projectRow(page, title)).toBeVisible();
}

export function projectRow(page: Page, title: string) {
  return page.locator('[data-testid="project-row"]').filter({ hasText: title });
}

export async function openProject(page: Page, title: string) {
  await projectRow(page, title).click();
  await page
    .getByRole("region", { name: "Selected project details" })
    .getByRole("button", { name: "Open", exact: true })
    .click();
  const detail = page.locator("main#main-content");
  await expect(
    detail.getByRole("heading", { name: title, exact: true, level: 1 })
  ).toHaveClass(/sr-only/);
  const breadcrumb = page.getByRole("navigation", {
    name: `Current location: Projects / ${title}`,
    exact: true,
  });
  await expect(breadcrumb).toBeVisible();
  await expect(breadcrumb).toContainText(title);
  return detail;
}
