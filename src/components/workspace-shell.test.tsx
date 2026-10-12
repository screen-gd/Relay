import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { sampleStudioSettings } from "@/lib/sample-studio";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceShell, workspacePageForPath } from "./workspace-shell";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
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

function shell(pathname: string) {
  return renderToStaticMarkup(
    <TooltipProvider>
      <WorkspaceShell
        page={workspacePageForPath(pathname)}
        settings={sampleStudioSettings}
        onNewProject={() => undefined}
        canCreateProject={false}
        pageTitle={pathname === "/sample-studio" ? "Sample studio" : undefined}
      >
        <p>Route content</p>
      </WorkspaceShell>
    </TooltipProvider>
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
  it("shows seven named primary hubs for a solo workspace and preserves support links", () => {
    const html = shell("/");
    const rail = navigation(html, "Primary navigation");
    expect([...rail.matchAll(/<a /g)]).toHaveLength(7);
    for (const label of [
      "Dashboard",
      "Projects",
      "Clients",
      "Library",
      "Reports",
      "Team",
      "Settings",
    ]) {
      expect(rail).toContain(`aria-label="${label}"`);
    }
    expect(rail).toContain('href="/team"');
    const support = navigation(html, "Support and legal");
    for (const href of ["/contact", "/privacy", "/terms", "/accessibility"])
      expect(support).toContain(`href="${href}"`);
    const mobile = navigation(html, "Mobile navigation");
    for (const href of [
      "/",
      "/projects",
      "/clients",
      "/files",
      "/reports",
      "/team",
      "/settings",
    ])
      expect(mobile).toContain(`href="${href}"`);
    expect(mobile).not.toContain('href="/calendar"');
  });

  it.each([
    [
      "/projects/example",
      "Projects",
      "/projects",
      ["/projects", "/calendar", "/timeline", "/feedback"],
    ],
    [
      "/calendar",
      "Projects",
      "/projects",
      ["/projects", "/calendar", "/timeline", "/feedback"],
    ],
    [
      "/timeline",
      "Projects",
      "/projects",
      ["/projects", "/calendar", "/timeline", "/feedback"],
    ],
    [
      "/feedback",
      "Projects",
      "/projects",
      ["/projects", "/calendar", "/timeline", "/feedback"],
    ],
    [
      "/files",
      "Library",
      "/files",
      ["/files", "/media", "/templates", "/resources"],
    ],
    [
      "/media",
      "Library",
      "/files",
      ["/files", "/media", "/templates", "/resources"],
    ],
    [
      "/templates",
      "Library",
      "/files",
      ["/files", "/media", "/templates", "/resources"],
    ],
    [
      "/resources",
      "Library",
      "/files",
      ["/files", "/media", "/templates", "/resources"],
    ],
    ["/integrations", "Settings", "/settings", ["/settings", "/integrations"]],
    ["/team-chat", "Team", "/team", ["/team", "/team-chat"]],
  ])(
    "keeps %s reachable under its active hub",
    (pathname, hub, hubHref, destinations) => {
      const html = shell(pathname);
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

  it("keeps all product routes and existing G chords in command search", () => {
    const html = shell("/");
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

  it("names the sample studio consistently without altering its active dashboard hub", () => {
    const html = shell("/sample-studio");
    expect(html).toContain("Current location: Sample studio");
    expect(currentLinks(navigation(html, "Primary navigation"))).toEqual(["/"]);
    expect(workspacePageForPath("/sample-studio/projects/demo")).toBe(
      "projects"
    );
  });
});
