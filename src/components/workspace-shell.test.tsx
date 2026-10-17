import { TooltipProvider } from "@/components/ui/tooltip";
import {
  sampleStudioProjects,
  sampleStudioSettings,
} from "@/lib/sample-studio";
import { renderWithRouter } from "@/test/render-with-router";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceShell, workspacePageForPath } from "./workspace-shell";

vi.mock("@/lib/data-context", () => ({
  useData: () => ({ isAuthEnabled: false }),
}));
vi.mock("@/lib/optional-auth", () => ({
  useOptionalAuth: () => ({ isSignedIn: false }),
}));
vi.mock("@/components/ui/sheet", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/ui/sheet")>()),
  SheetContent: ({ children }: { children: ReactNode }) => (
    <div data-test="mobile-sheet">{children}</div>
  ),
}));
vi.mock("@/components/ui/dialog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/ui/dialog")>()),
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div data-test="command-dialog">{children}</div>
  ),
}));

// Expose account content in this server-rendered navigation contract test.
vi.mock("@/components/ui/dropdown-menu", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/ui/dropdown-menu")>()),
  DropdownMenu: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div data-test="account-menu">{children}</div>
  ),
  DropdownMenuItem: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuLabel: ({ children }: { children: ReactNode }) => (
    <span>{children}</span>
  ),
  DropdownMenuSeparator: () => null,
}));

// Renders the shell inside a memory router opened at `pathname`, so links
// resolve and mark themselves active the same way they do in the app.
function shell(pathname: string) {
  return renderWithRouter(
    <TooltipProvider>
      <WorkspaceShell
        page={workspacePageForPath(pathname)}
        settings={sampleStudioSettings}
        navigationData={{
          projects: sampleStudioProjects,
          clients: sampleStudioSettings.clients,
          activeTeamMembers: [],
          outputs: [],
          sample: pathname.startsWith("/sample-studio"),
          canManageFinance: true,
        }}
        onNewProject={() => undefined}
        canCreateProject={false}
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

function currentLinks(html: string) {
  return [...html.matchAll(/<a[^>]*aria-current="page"[^>]*>/g)].map(
    ([link]) => link.match(/href="([^"]*)"/)?.[1]
  );
}

describe("Workspace hub navigation", () => {
  it("shows seven named routes for a solo workspace and preserves support links", async () => {
    const html = await shell("/");
    const rail = navigation(html, "Primary navigation");
    expect([...rail.matchAll(/<a /g)]).toHaveLength(7);
    for (const label of [
      "Dashboard",
      "Projects",
      "Clients",
      "Reviews",
      "Payments",
      "Team",
      "Settings",
    ]) {
      expect(rail).toContain(`aria-label="${label}"`);
    }
    expect(rail).toContain('href="/team"');
    for (const href of [
      "/files",
      "/media",
      "/templates",
      "/resources",
      "/integrations",
      "/calendar",
      "/timeline",
    ])
      expect(rail).not.toContain(`href="${href}"`);
    const support = html.slice(html.indexOf('data-test="account-menu"'));
    for (const href of ["/contact", "/privacy", "/terms", "/accessibility"])
      expect(support).toContain(`href="${href}"`);
    for (const href of [
      "https://web.relay-app.cc.cd/about",
      "https://web.relay-app.cc.cd/privacy-and-data",
    ])
      expect(support).toContain(`href="${href}"`);
    const mobile = navigation(html, "Mobile navigation");
    for (const href of ["/", "/projects", "/clients", "/feedback", "/reports"])
      expect(mobile).toContain(`href="${href}"`);
    const otherHubs = navigation(html, "Other workspace hubs");
    expect(otherHubs).toContain('href="/team"');
    expect(otherHubs).toContain('href="/settings"');
  });

  it.each([
    [
      "/projects/example",
      "Projects",
      "/projects",
      ["/projects", "/calendar", "/timeline", "/files", "/media"],
    ],
    [
      "/calendar",
      "Projects",
      "/projects",
      ["/projects", "/calendar", "/timeline", "/files", "/media"],
    ],
    [
      "/files",
      "Projects",
      "/projects",
      ["/projects", "/calendar", "/timeline", "/files", "/media"],
    ],
    [
      "/media",
      "Projects",
      "/projects",
      ["/projects", "/calendar", "/timeline", "/files", "/media"],
    ],
    [
      "/integrations",
      "Settings",
      "/settings",
      ["/settings", "/integrations", "/templates", "/resources"],
    ],
    [
      "/templates",
      "Settings",
      "/settings",
      ["/settings", "/integrations", "/templates", "/resources"],
    ],
    [
      "/resources",
      "Settings",
      "/settings",
      ["/settings", "/integrations", "/templates", "/resources"],
    ],
    ["/team-chat", "Team", "/team", ["/team", "/team-chat"]],
  ])(
    "keeps %s reachable under its active hub",
    async (pathname, hub, hubHref, destinations) => {
      const html = await shell(pathname);
      // The sidebar marks the route; the route detail marks the current page.
      expect(currentLinks(navigation(html, "Primary navigation"))).toEqual([
        hubHref,
      ]);
      const context = navigation(html, `${hub} navigation`);
      for (const href of destinations)
        expect(context).toContain(`href="${href}"`);
      expect(currentLinks(context)).toEqual([
        pathname.startsWith("/projects/") ? "/projects" : pathname,
      ]);
      const command = html.slice(html.indexOf('data-test="command-dialog"'));
      for (const href of destinations)
        expect(command).toContain(`href="${href}"`);
    }
  );

  it.each(["/", "/clients", "/feedback", "/reports"])(
    "marks %s as the active top-level hub",
    async (pathname) => {
      const html = await shell(pathname);
      expect(currentLinks(navigation(html, "Primary navigation"))).toEqual([
        pathname,
      ]);
    }
  );

  it("keeps all product routes and existing G chords in command search", async () => {
    const html = await shell("/");
    const command = html.slice(html.indexOf('data-test="command-dialog"'));
    for (const href of [
      "/",
      "/projects",
      "/calendar",
      "/timeline",
      "/clients",
      "/feedback",
      "/files",
      "/media",
      "/templates",
      "/resources",
      "/reports",
      "/integrations",
      "/team",
      "/team-chat",
      "/settings",
    ]) {
      expect(command).toContain(`href="${href}"`);
    }
    for (const chord of ["G D", "G C", "G P", "G R", "G S"])
      expect(command).toContain(chord);
  });

  it("names the sample studio consistently without altering its active dashboard hub", async () => {
    const html = await shell("/sample-studio");
    expect(html).toContain("Current location: Sample studio");
    expect(currentLinks(navigation(html, "Primary navigation"))).toEqual(["/"]);
    expect(workspacePageForPath("/sample-studio/projects/demo")).toBe(
      "projects"
    );
  });

  it("lists project pages and records in the sidebar route detail", async () => {
    const html = await shell("/projects/sample-launch-film");
    expect(html).toContain('aria-label="Close sidebar"');
    const panel = navigation(html, "In progress");
    expect(panel).toContain("Summer launch film");
    expect(panel).toContain('href="/projects/sample-launch-film"');
    expect(currentLinks(panel)).toEqual(["/projects/sample-launch-film"]);
    const context = navigation(html, "Projects navigation");
    expect(
      [...context.matchAll(/href="([^"]*)"/g)].map(([, href]) => href)
    ).toEqual(["/projects", "/calendar", "/timeline", "/files", "/media"]);
  });

  it("marks the hubs that hold AI tools", async () => {
    const html = await shell("/");
    const rail = navigation(html, "Primary navigation");
    expect([...rail.matchAll(/data-slot="ai-nav-badge"/g)]).toHaveLength(3);
    expect(html).toContain('aria-label="AI tools"');
  });

  it("lists every AI action in the command menu, saying what unlocks it", async () => {
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
    expect(command).toContain("AI tools");
    // Signed out, every AI action names the step that unlocks it.
    expect(command.match(/Sign in to use AI/g)).toHaveLength(8);
  });
});
