import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultSettings } from "@/features/settings/settings-defaults";
import { ReportsApplication } from "./reports-application";

const state = vi.hoisted(() => ({
  advancedReports: false,
  canManageFinance: true,
  isSignedIn: false,
  currentTeamId: undefined as undefined | string,
  teamData: undefined as undefined | { currentMember: { role: string } },
}));

vi.mock("@/lib/data-context", () => ({
  useData: () => ({
    settings: createDefaultSettings(),
    salaryBatches: [],
    updateSalaryBatchPayment: vi.fn(),
    isAuthEnabled: true,
    isSignedIn: state.isSignedIn,
  }),
}));
vi.mock("@/features/projects/project-access", () => ({
  useProjectAccess: () => ({
    projects: [],
    personalProjects: [],
    activeTeamMembers: [],
    sample: false,
    teamData: state.teamData,
    currentTeamId: state.currentTeamId,
    workspaceSubscription: {
      capabilities: { advancedReports: state.advancedReports },
    },
    canManageFinance: state.canManageFinance,
    salaryBatchesEnabled: true,
  }),
}));
vi.mock("@/components/salary-plans-panel", () => ({
  SalaryPlansPanel: () => null,
}));
vi.mock("./earnings-qa", () => ({
  EarningsQa: ({ workspaceId }: { workspaceId: string }) => (
    <div data-slot="earnings-qa">{workspaceId}</div>
  ),
}));

describe("Report access", () => {
  it("shows basic reports to a Free account and keeps advanced reports gated", () => {
    state.advancedReports = false;
    state.canManageFinance = true;
    const html = renderToStaticMarkup(<ReportsApplication />);
    expect(html).toContain("Earned");
    expect(html).toContain("Delivery and earnings trend");
    expect(html).toContain("Work mix");
    expect(html).toContain("Payment batches");
    expect(html).not.toContain("Invoice drafts");
    expect(html).not.toContain("Client totals");
    expect(html).not.toContain("Export CSV");
  });

  it("keeps advanced sections available when the subscription allows them", () => {
    state.advancedReports = true;
    state.canManageFinance = true;
    const html = renderToStaticMarkup(<ReportsApplication />);
    expect(html).toContain("Invoice drafts");
    expect(html).toContain("Client totals");
    expect(html).toContain("Export CSV");
  });

  it("keeps financial totals restricted for members without finance access", () => {
    state.advancedReports = false;
    state.canManageFinance = false;
    const html = renderToStaticMarkup(<ReportsApplication />);
    expect(html.match(/Restricted/g)).toHaveLength(3);
    expect(html).toContain("Delivered edits");
    expect(html).not.toContain("Invoice drafts");
  });
});

describe("Earnings Q&A on Reports", () => {
  beforeEach(() => {
    state.currentTeamId = undefined;
    state.teamData = undefined;
    state.canManageFinance = true;
  });

  it("shows the feature locked to a local visit that could never meet it", () => {
    state.isSignedIn = false;
    const html = renderToStaticMarkup(<ReportsApplication />);
    expect(html).toContain('data-slot="ai-locked-notice"');
    expect(html).toContain("Ask about your earnings");
    expect(html).toContain("Sign in to use AI");
    expect(html).not.toContain('data-slot="earnings-qa"');
  });

  it("keeps the question box for an Owner in a team Workspace", () => {
    state.isSignedIn = true;
    state.currentTeamId = "workspace-1";
    state.teamData = { currentMember: { role: "Owner" } };
    const html = renderToStaticMarkup(<ReportsApplication />);
    expect(html).toContain('data-slot="earnings-qa"');
    expect(html).not.toContain('data-slot="ai-locked-notice"');
  });
});
