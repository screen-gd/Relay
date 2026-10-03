import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";
import { cloudE2EAvailable, loadE2EEnvironment } from "./env";
import { openApp, projectRow, waitForClerk } from "./helpers";

loadE2EEnvironment();
const cloudReady = cloudE2EAvailable();

async function deleteCloudE2EProjects(page: Parameters<typeof projectRow>[0]) {
  while (true) {
    const row = page
      .locator(
        '[data-testid="project-row"][data-project-title^="Cloud E2E Project "]'
      )
      .first();
    if (!(await row.isVisible().catch(() => false))) return;
    const title = await row.getAttribute("data-project-title");
    if (!title) return;
    await row.getByRole("button", { name: `Actions for ${title}` }).click();
    await page.getByRole("menuitem", { name: /Permanently delete/ }).click();
    await page
      .getByRole("alertdialog", { name: "Delete project?" })
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(projectRow(page, title)).toBeHidden();
  }
}

async function createCloudProject(
  page: Parameters<typeof projectRow>[0],
  title: string
) {
  await page
    .getByRole("button", {
      name: /New (?:Personal |Team )?Project|Create project|Quick create project/,
    })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "New Project" });
  await dialog.getByLabel("Project name").fill(title);
  await dialog.getByRole("button", { name: "Client", exact: true }).click();
  await page.getByRole("menuitem", { name: "E2E Client", exact: true }).click();
  await dialog.getByRole("button", { name: "Create Project" }).click();
  const row = projectRow(page, title);
  await expect(row).toBeVisible();
  const projectId = await row.getAttribute("data-project-id");
  if (!projectId) throw new Error("Created Project row is missing its ID.");
  await page.goto(`/projects/${projectId}`);
}

test.describe("authenticated editor to client workflow", () => {
  test.skip(
    !cloudReady,
    "Clerk and Convex E2E credentials are not configured."
  );
  test.describe.configure({ mode: "serial" });

  test("reviews Media Versions with comments across editor and Client contexts", async ({
    browser,
    page,
  }) => {
    test.setTimeout(180_000);
    page.setDefaultTimeout(15_000);
    const suffix = Date.now();
    const projectTitle = `Cloud E2E Project ${suffix}`;
    const outputTitle = `Client Cut ${suffix}`;
    const commentBody = `Tighten the opening shot ${suffix}`;
    const portalPin = "1234";
    let clientContext:
      Awaited<ReturnType<typeof browser.newContext>> | undefined;

    try {
      await openApp(page, "/");
      await waitForClerk(page);
      await clerk.signIn({
        page,
        emailAddress: process.env.E2E_CLERK_USER_EMAIL!,
      });
      await openApp(page, "/projects");
      await expect(
        page
          .getByRole("button", {
            name: /New (?:Personal |Team )?Project|Create project|Quick create project/,
          })
          .first()
      ).toBeVisible();
      await deleteCloudE2EProjects(page);

      await createCloudProject(page, projectTitle);
      await expect(page).toHaveURL(/\/projects\/.+/);
      await expect(
        page.getByRole("heading", { name: projectTitle })
      ).toHaveClass(/sr-only/);
      await expect(
        page.getByRole("navigation", {
          name: `Current location: Projects / ${projectTitle}`,
          exact: true,
        })
      ).toBeVisible();

      await page.getByRole("button", { name: "Outputs and Versions" }).click();
      await page
        .getByRole("button", { name: "Add Output", exact: true })
        .click();
      const outputDialog = page.getByRole("dialog", {
        name: "Add Project Output",
      });
      await outputDialog.getByLabel("Title").fill(outputTitle);
      await outputDialog.getByRole("button", { name: "Save Output" }).click();

      const output = page.getByRole("article").filter({ hasText: outputTitle });
      await output.getByRole("button", { name: "Media Version" }).click();
      let versionDialog = page.getByRole("dialog", {
        name: "Add Media Version",
      });
      await versionDialog
        .getByLabel("YouTube, Vimeo, or link")
        .fill("https://example.com/client-cut-v1");
      await versionDialog.getByLabel("Version label").fill("Client cut v1");
      await versionDialog
        .getByRole("button", { name: "Add Media Version" })
        .click();
      await output
        .getByRole("combobox", { name: `Review state for ${outputTitle}` })
        .click();
      await page
        .getByRole("option", { name: "Sent to Client", exact: true })
        .click();

      await page.getByRole("button", { name: "Client Review" }).click();
      const portal = page.getByTestId("project-portal-panel");
      await portal
        .getByRole("checkbox", { name: new RegExp(outputTitle) })
        .check();
      await portal.getByRole("checkbox", { name: "Protect with PIN" }).check();
      // The portal settings PIN currently has no associated accessible label.
      await portal.locator('input[type="password"]').fill(portalPin);
      await page.getByRole("button", { name: "Publish portal" }).click();
      await expect(page.getByLabel("Client Portal link")).toBeVisible();
      await page.getByRole("button", { name: "Open portal" }).click();
      await expect(portal).toContainText("Open");
      const preview = portal.getByRole("button", {
        name: "Preview",
        exact: true,
      });
      await expect(preview).toHaveAttribute("aria-expanded", "false");
      await preview.click();
      await expect(preview).toHaveAttribute("aria-expanded", "true");
      await expect(
        portal.getByText("1 output selected", { exact: true })
      ).toBeVisible();
      const portalHref = await page
        .getByLabel("Client Portal link")
        .inputValue();

      clientContext = await browser.newContext();
      const clientPage = await clientContext.newPage();
      await clientPage.goto(portalHref);
      await expect(
        clientPage.getByRole("heading", { name: "This portal is protected" })
      ).toBeVisible();
      await clientPage.getByLabel("Portal PIN").fill("9999");
      await clientPage.getByRole("button", { name: "Unlock portal" }).click();
      await expect(
        clientPage.getByText("That PIN did not unlock this portal. Try again.")
      ).toBeVisible();
      await clientPage.getByLabel("Portal PIN").fill(portalPin);
      await clientPage.getByRole("button", { name: "Unlock portal" }).click();
      await expect(
        clientPage.getByRole("heading", { name: projectTitle })
      ).toBeVisible();
      await expect(
        clientPage.getByRole("button", { name: "Add comment" })
      ).toBeDisabled();

      await clientPage.getByLabel("Display name").fill("E2E Client");
      await clientPage
        .getByRole("textbox", { name: "Comment", exact: true })
        .fill(commentBody);
      await clientPage.getByRole("button", { name: "Add comment" }).click();
      await expect(
        clientPage.getByText(commentBody, { exact: true })
      ).toBeVisible();
      await clientPage.reload();
      await clientPage.getByLabel("Portal PIN").fill(portalPin);
      await clientPage.getByRole("button", { name: "Unlock portal" }).click();
      await expect(clientPage.getByLabel("Display name")).toHaveValue(
        "E2E Client"
      );

      await page.getByRole("button", { name: "Outputs and Versions" }).click();
      const reviewHistory = page.getByTestId("media-version-review-history");
      const editorComment = reviewHistory
        .getByRole("article")
        .filter({ hasText: commentBody });
      await expect(editorComment).toContainText("Open");
      await editorComment.getByRole("button", { name: "Resolve" }).click();
      await expect(editorComment).toContainText("Resolved");

      const clientComment = clientPage
        .getByRole("article")
        .filter({ hasText: commentBody })
        .last();
      await expect(clientComment).toContainText("Resolved");
      await clientComment.getByRole("button", { name: "Reopen" }).click();
      await expect(clientComment).toContainText("Open");
      await expect(editorComment).toContainText("Open");

      await output.getByRole("button", { name: "Media Version" }).click();
      versionDialog = page.getByRole("dialog", { name: "Add Media Version" });
      await versionDialog
        .getByLabel("YouTube, Vimeo, or link")
        .fill("https://example.com/client-cut-v2");
      await versionDialog.getByLabel("Version label").fill("Client cut v2");
      await versionDialog
        .getByRole("button", { name: "Add Media Version" })
        .click();
      await expect(
        reviewHistory.getByRole("button", { name: /v1 · Client cut v1/ })
      ).toHaveAttribute("aria-expanded", "true");
      await expect(editorComment).toContainText(commentBody);

      await page.getByRole("button", { name: "Client Review" }).click();
      await page.getByRole("button", { name: "Close portal" }).click();
      await clientPage.reload();
      await expect(
        clientPage.getByRole("heading", { name: "This portal is closed" })
      ).toBeVisible();

      await page.getByRole("button", { name: "Outputs and Versions" }).click();
      await expect(page.getByText(commentBody, { exact: true })).toBeVisible();
    } finally {
      await clientContext?.close().catch(() => undefined);
      if (!page.isClosed()) {
        await page.goto("/projects").catch(() => undefined);
        const row = projectRow(page, projectTitle);
        if (await row.isVisible().catch(() => false)) {
          await page
            .getByRole("button", { name: `Actions for ${projectTitle}` })
            .click();
          await page
            .getByRole("menuitem", { name: /Permanently delete/ })
            .click();
          await page
            .getByRole("alertdialog", { name: "Delete project?" })
            .getByRole("button", { name: "Delete", exact: true })
            .click();
          await expect(row).toBeHidden();
        }
      }
    }
  });
});
