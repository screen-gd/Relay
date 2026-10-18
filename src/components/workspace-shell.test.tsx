import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "@/test/render-with-router";
import { sampleStudioSettings } from "@/lib/sample-studio";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceShell, workspacePageForPath } from "./workspace-shell";

vi.mock("@/lib/data-context", () => ({
  useData: () => ({ isAuthEnabled: false }),
}));
vi.mock("@/lib/optional-auth", () => ({
  useOptionalAuth: () => ({ isSignedIn: false }),
}));
vi.mock("@/components/ui/dialog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/ui/dialog")>()),
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div data-test="command-dialog">{children}</div>
  ),
}));
// Menus render their contents inline so the links inside can be read.
vi.mock("@/components/ui/dropdown-menu", async (importOriginal) => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
  return {
    ...(await importOriginal<typeof import("@/components/ui/dropdown-menu")>()),
    DropdownMenuContent: Pass,
    DropdownMenuItem: Pass,
    DropdownMenuLabel: Pass,
    DropdownMenuSeparator: () => null,
    DropdownMenuSub: Pass,
    DropdownMenuSubTrigger: Pass,
    DropdownMenuSubContent: Pass,
    DropdownMenuRadioGroup: Pass,
    DropdownMenuRadioItem: Pass,
  };
});

// Renders the shell inside a memory router opened at `pathname`, so links
// resolve and mark themselves active the same way they do in the app.
function shell(pathname: string) {
  return renderWithRouter(
    <TooltipProvider>
      <WorkspaceShell
        page={workspacePageForPath(pathname.split("?")[0] ?? pathname)}
        settings={sampleStudioSettings}
        onNewProject={() => undefined}
        canCreateProject
        pageTitle={pathname === "/sample-studio" ? "Sample studio" : undefined}
      >
        <p>Route content</p>
      </WorkspaceShell>
    </TooltipProvider>,
    pathname
  );
}

function navigation(html: string, label: string) {
  return (
    html.match(
      new RegExp(`<nav[^>]*aria-label="${label}"[^>]*>([\\s\\S]*?)</nav>`)
    )?.[1] ?? ""
  );
}

function hrefs(html: string) {
  return [...html.matchAll(/href="([^"]*)"/g)].map(([, href]) => href);
}

function currentLinks(html: string) {
  return [...html.matchAll(/<a[^>]*aria-current="page"[^>]*>/g)].map(
    ([link]) => link.match(/href="([^"]*)"/)?.[1]
  );
}

const productRoutes = [
  "/",
  "/projects",
  "/feedback",
  "/clients",
  "/files",
  "/media",
  "/templates",
  "/resources",
  "/reports",
  "/team",
  "/team-chat",
];

describe("Workspace sidebar", () => {
  it("lists every product page once, with daily pages first", async () => {
    const html = await shell("/");
    const sidebar = navigation(html, "Primary navigation");
    // Page items carry their name as a label; AI and recent links do not.
    const pageLinks = [
      ...sidebar.matchAll(/<a[^>]*aria-label="[^"]*"[^>]*>/g),
    ].map(([tag]) => tag.match(/href="([^"]*)"/)?.[1]);
    expect(pageLinks).toEqual(productRoutes);
    expect(sidebar).not.toContain('href="/settings"');
  });

  it.each([
    ["/", "/"],
    ["/clients", "/clients"],
    ["/feedback", "/feedback"],
    ["/reports", "/reports"],
    ["/team-chat", "/team-chat"],
    ["/projects/example", "/projects"],
    ["/calendar", "/projects"],
    ["/timeline", "/projects"],
  ])("marks %s under %s", async (pathname, active) => {
    const html = await shell(pathname);
    expect(currentLinks(navigation(html, "Primary navigation"))).toEqual([
      active,
    ]);
  });

  it("offers the project views in the top bar on the list, calendar and timeline", async () => {
    for (const pathname of ["/projects", "/calendar", "/timeline"]) {
      const views = navigation(await shell(pathname), "Projects views");
      expect(hrefs(views)).toEqual(["/projects", "/calendar", "/timeline"]);
      expect(currentLinks(views)).toEqual([pathname]);
    }
    // A single project is a record, not a view of the list.
    expect(await shell("/projects/example")).not.toContain(
      'aria-label="Projects views"'
    );
  });

  it("swaps to settings navigation on settings pages, with a way back", async () => {
    const html = await shell("/integrations");
    const settings = navigation(html, "Settings navigation");
    for (const href of [
      "/settings?section=workflow",
      "/integrations",
      "/settings?section=data",
      "/profile/edit",
      "/account",
      "/subscription",
    ])
      expect(settings).toContain(`href="${href}"`);
    expect(currentLinks(settings)).toEqual(["/integrations"]);
    expect(html).toContain("Back to workspace");
    expect(html).not.toContain('aria-label="Primary navigation"');
  });

  it("marks the open settings section", async () => {
    const html = await shell("/settings?section=appearance");
    expect(currentLinks(navigation(html, "Settings navigation"))).toEqual([
      "/settings?section=appearance",
    ]);
    expect(html).toContain("Current location: Settings / Appearance");
  });

  it("keeps support and legal links in the help menu", async () => {
    const support = navigation(await shell("/"), "Support and legal");
    for (const href of [
      "/contact",
      "/privacy",
      "/terms",
      "/accessibility",
      "https://web.relay-app.cc.cd/about",
      "https://web.relay-app.cc.cd/privacy-and-data",
    ])
      expect(support).toContain(`href="${href}"`);
  });

  it("names the sample studio without moving its dashboard item", async () => {
    const html = await shell("/sample-studio");
    expect(html).toContain("Current location: Sample studio");
    expect(currentLinks(navigation(html, "Primary navigation"))).toEqual(["/"]);
    expect(workspacePageForPath("/sample-studio/projects/demo")).toBe(
      "projects"
    );
  });

  it("offers the sidebar toggle with its shortcut", async () => {
    const html = await shell("/");
    expect(html).toContain('aria-label="Close sidebar"');
    expect(html).toContain('aria-label="Search"');
    expect(html).toContain('aria-label="New project"');
  });
});

describe("Command menu", () => {
  it("reaches every product and settings page, with the G chords", async () => {
    const html = await shell("/");
    const command = html.slice(html.indexOf('data-test="command-dialog"'));
    for (const href of [
      ...productRoutes,
      "/calendar",
      "/timeline",
      "/settings",
      "/integrations",
      "/account",
      "/subscription",
    ])
      expect(command).toContain(`href="${href}"`);
    for (const chord of ["G D", "G C", "G P", "G R", "G S"])
      expect(command).toContain(chord);
  });

  it("lists every AI action, saying what unlocks it", async () => {
    const html = await shell("/projects/relay-launch");
    const command = html.slice(html.indexOf('data-test="command-dialog"'));
    for (const label of [
      "Turn feedback into revisions",
      "Draft a client status update",
      "Import a brief",
      "Match comments in a transcript",
      "Draft a version changelog",
      "Draft a change order",
      "Ask about your earnings",
      "Flag deadline risk",
    ])
      expect(command).toContain(label);
    // Signed out, every AI action names the step that unlocks it.
    expect(command.match(/Sign in to use AI/g)).toHaveLength(8);
  });
});
