import { expect, test, type ElementHandle, type Page } from "@playwright/test";
import { chooseLocalMode, openApp, projectRow } from "./helpers";

const PROJECTS_STORAGE_KEY = "video-editing-work-tracker:v1";
const SETTINGS_STORAGE_KEY = "video-editing-work-tracker:settings:v1";

const layoutClient = {
  id: "workspace-layout-client",
  name: "Workspace Layout Client",
  company: "",
  contactName: "",
  email: "",
  phone: "",
  notes: "",
  archived: false,
};

const layoutProject = {
  id: "workspace-layout-project",
  profileId: "video-editor",
  createdAt: "2026-09-16T08:00:00.000Z",
  title: "Workspace Layout Fixture",
  client: layoutClient.name,
  clientId: layoutClient.id,
  status: "Planned",
  workType: "Freelance",
  startDate: "2026-09-16",
  dueDate: "2026-09-24",
  earnings: 500,
  notes: "A local-only fixture for workspace layout coverage.",
};

async function seedLocalWorkspace(
  page: Page,
  options: {
    projects?: readonly (typeof layoutProject)[];
    clients?: readonly (typeof layoutClient)[];
  } = {}
) {
  await chooseLocalMode(page);
  await page.addInitScript(
    ({ projects, clients, projectsKey, settingsKey }) => {
      window.localStorage.setItem(projectsKey, JSON.stringify(projects));
      window.localStorage.setItem(
        settingsKey,
        JSON.stringify({
          clients,
          customClients: clients.map((client) => client.name),
        })
      );
    },
    {
      projects: options.projects ?? [],
      clients: options.clients ?? [],
      projectsKey: PROJECTS_STORAGE_KEY,
      settingsKey: SETTINGS_STORAGE_KEY,
    }
  );
}

function primaryNavigation(page: Page) {
  return page.getByRole("navigation", { name: "Primary navigation" });
}

async function expectSameShell(
  page: Page,
  shellHandle: ElementHandle<SVGElement | HTMLElement>
) {
  await expect(page.getByTestId("workspace-shell")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        (shell) =>
          shell === document.querySelector('[data-testid="workspace-shell"]'),
        shellHandle
      )
    )
    .toBe(true);
}

test("keeps the shared shell DOM node across client navigation", async ({
  page,
}) => {
  await seedLocalWorkspace(page);
  await openApp(page, "/");

  const shellHandle = await page.getByTestId("workspace-shell").elementHandle();
  if (!shellHandle) throw new Error("Workspace shell did not render.");

  const navigate = async (label: string, href: RegExp) => {
    const link = primaryNavigation(page).getByRole("link", {
      name: label,
      exact: true,
    });
    await link.click();
    await expect(page).toHaveURL(href);
    await expect(link).toHaveAttribute("aria-current", "page");
    await expectSameShell(page, shellHandle);
  };

  await navigate("Projects", /\/projects$/);
  await navigate("Settings", /\/settings$/);
  await navigate("Dashboard", /\/$/);
});

test("opens and filters the command menu by keyboard after navigation", async ({
  page,
}) => {
  await seedLocalWorkspace(page);
  await openApp(page, "/");

  const projectsLink = primaryNavigation(page).getByRole("link", {
    name: "Projects",
    exact: true,
  });
  await projectsLink.click();
  await expect(page).toHaveURL(/\/projects$/);

  const trigger = page.getByRole("button", {
    name: "Quick Search (Ctrl K)",
  });
  await trigger.focus();
  await page.keyboard.press("Control+k");

  const commandDialog = page.getByRole("dialog").filter({
    has: page.getByRole("combobox", { name: "Search workspace commands" }),
  });
  await expect(commandDialog).toBeVisible();
  const input = commandDialog.getByRole("combobox", {
    name: "Search workspace commands",
  });
  await expect(input).toBeFocused();

  await input.fill("settings");
  await expect(
    commandDialog.getByRole("option", { name: /^Settings(?:\s|$)/ })
  ).toBeVisible();
  await expect(
    commandDialog.getByRole("option", { name: /^Dashboard(?:\s|$)/ })
  ).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(commandDialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("loads a direct nested project URL and returns with browser back", async ({
  page,
}) => {
  await seedLocalWorkspace(page, {
    projects: [layoutProject],
    clients: [layoutClient],
  });
  await openApp(page, "/projects");
  await expect(projectRow(page, layoutProject.title)).toBeVisible();

  await page.goto(`/projects/${layoutProject.id}`);
  await expect(page).toHaveURL(new RegExp(`/projects/${layoutProject.id}$`));
  await expect(
    page.getByRole("heading", { name: layoutProject.title, exact: true })
  ).toBeVisible();
  await expect(
    primaryNavigation(page).getByRole("link", { name: "Projects", exact: true })
  ).toHaveAttribute("aria-current", "page");

  await page.goBack();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(projectRow(page, layoutProject.title)).toBeVisible();
});

test("keeps sample dashboard and detail read-only and isolated from local data", async ({
  page,
}) => {
  await seedLocalWorkspace(page, {
    projects: [layoutProject],
    clients: [layoutClient],
  });
  await openApp(page, "/");
  const localProjectsBefore = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    PROJECTS_STORAGE_KEY
  );

  await page.goto("/sample-studio");
  const sampleMode = page.getByRole("complementary", {
    name: "Sample studio mode",
  });
  await expect(sampleMode).toContainText("Read-only production data");
  const sampleProject = page
    .getByTestId("project-row")
    .filter({ hasText: "Summer launch film" });
  await expect(sampleProject).toHaveCount(1);
  await expect(sampleProject).toBeVisible();
  await expect(
    page.getByText(layoutProject.title, { exact: true })
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Quick create project" })
  ).toBeDisabled();

  await sampleProject.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(
    /\/sample-studio\/projects\/sample-launch-film$/
  );
  await expect(
    page.getByRole("heading", { name: "Summer launch film", exact: true })
  ).toBeVisible();
  await expect(sampleMode).toContainText("Read-only production data");
  await expect(
    page.getByRole("button", { name: "Quick create project" })
  ).toBeDisabled();
  await expect(
    page.getByText(layoutProject.title, { exact: true })
  ).toHaveCount(0);

  const localProjectsAfter = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    PROJECTS_STORAGE_KEY
  );
  expect(localProjectsAfter).toBe(localProjectsBefore);
});

test("creates a local project from the shared header launcher on another route", async ({
  page,
}) => {
  await seedLocalWorkspace(page, { clients: [layoutClient] });
  await openApp(page, "/");

  await primaryNavigation(page)
    .getByRole("link", { name: "Settings", exact: true })
    .click();
  await expect(page).toHaveURL(/\/settings$/);

  const launcher = page.getByRole("button", {
    name: "Quick create project",
  });
  await launcher.click();
  const dialog = page.getByRole("dialog", { name: "New Project" });
  await expect(dialog).toBeVisible();

  const title = `Shared launcher project ${Date.now()}`;
  await dialog.getByLabel("Project name").fill(title);
  await dialog.getByRole("button", { name: "Client", exact: true }).click();
  await page
    .getByRole("menuitem", { name: layoutClient.name, exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Create Project", exact: true })
    .click();

  await primaryNavigation(page)
    .getByRole("link", { name: "Projects", exact: true })
    .click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(projectRow(page, title)).toBeVisible();
});
