import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  sampleStudioProjects,
  sampleStudioSettings,
} from "@/lib/sample-studio";
import { renderWithRouter } from "@/test/render-with-router";
import { DashboardApplication } from "./dashboard-application";

const state = vi.hoisted(() => ({
  sample: false,
  populated: false,
  isSignedIn: false,
  currentTeamId: undefined as undefined | string,
  teamData: undefined as
    | undefined
    | {
        currentMember: { role: string; permissions: { viewProjects: boolean } };
      },
}));
vi.mock("@/lib/data-context", () => ({
  useData: () => ({
    settings: sampleStudioSettings,
    salaryBatches: [],
    salaryPlans: [],
    isSignedIn: state.isSignedIn,
    setToast: vi.fn(),
    updateSalaryBatchPayment: vi.fn(),
    sampleWorkspace: {
      canLoad: false,
      loaded: false,
      load: vi.fn(),
      clear: vi.fn(),
    },
  }),
}));
vi.mock("@/features/projects/project-access", () => ({
  useProjectAccess: () => ({
    sample: state.sample,
    projects: state.populated ? sampleStudioProjects : [],
    personalProjects: state.populated ? sampleStudioProjects : [],
    canCreateProjects: true,
    canEditProjects: true,
    teamDataLoading: false,
    teamData: state.teamData,
    currentTeamId: state.currentTeamId,
  }),
}));
vi.mock("./deadline-risk-radar", () => ({
  DeadlineRiskRadar: ({ workspaceId }: { workspaceId: string }) => (
    <div data-slot="deadline-risk-radar">{workspaceId}</div>
  ),
}));
vi.mock("@/features/projects/project-actions-provider", () => ({
  useProjectActions: () => ({
    openNewProject: vi.fn(),
    openProjectDetails: vi.fn(),
    openEditProject: vi.fn(),
    requestDeleteProject: vi.fn(),
    canDeleteProject: () => true,
  }),
}));
vi.mock("@/features/clients/use-client-actions", () => ({
  useClientActions: () => ({ clientOptions: [] }),
}));
vi.mock("@/features/projects/project-activity", () => ({
  useProjectActivity: () => ({
    subscribeToProjectActivity: () => () => undefined,
  }),
}));

describe("Dashboard route headings", () => {
  beforeEach(() => {
    state.sample = false;
    state.populated = false;
    state.isSignedIn = false;
    state.currentTeamId = undefined;
    state.teamData = undefined;
  });
  it.each([
    [false, false, false, "Dashboard"],
    [false, false, true, "Dashboard"],
    [false, true, false, "Dashboard"],
    [true, true, false, "Sample studio"],
    [true, false, false, "Sample studio"],
  ])(
    "has one route h1 (sample=%s, populated=%s, signed in=%s)",
    async (sample, populated, isSignedIn, title) => {
      Object.assign(state, { sample, populated, isSignedIn });
      const html = await renderWithRouter(<DashboardApplication />);
      expect(
        [...html.matchAll(/<h1(?:\s[^>]*)?>(.*?)<\/h1>/g)].map(
          (match) => match[1]
        )
      ).toEqual([title]);
      expect(html).toContain(`<h1 class="sr-only">${title}</h1>`);
      if (!sample && !populated) {
        expect(html).toContain('id="first-run-title"');
        expect(html).toMatch(/<h2[^>]*id="first-run-title"/);
      } else {
        expect(html).toContain("Needs attention");
      }
    }
  );
});

describe("Deadline risk on the dashboard", () => {
  beforeEach(() => {
    state.sample = false;
    state.populated = true;
    state.isSignedIn = false;
    state.currentTeamId = undefined;
    state.teamData = undefined;
  });

  it("shows the feature locked to a local visit that could never meet it", async () => {
    const html = await renderWithRouter(<DashboardApplication />);
    expect(html).toContain('data-slot="ai-locked-notice"');
    expect(html).toContain("Flag deadline risk");
    expect(html).toContain("Sign in to use AI");
    expect(html).not.toContain('data-slot="deadline-risk-radar"');
  });

  it("keeps the radar for an Editor in a team Workspace", async () => {
    state.isSignedIn = true;
    state.currentTeamId = "workspace-1";
    state.teamData = {
      currentMember: { role: "Editor", permissions: { viewProjects: true } },
    };
    const html = await renderWithRouter(<DashboardApplication />);
    expect(html).toContain('data-slot="deadline-risk-radar"');
    expect(html).not.toContain('data-slot="ai-locked-notice"');
  });
});
