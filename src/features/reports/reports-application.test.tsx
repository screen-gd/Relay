import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createDefaultSettings } from "@/features/settings/settings-defaults";
import { ReportsApplication } from "./reports-application";

const state = vi.hoisted(() => ({
  advancedReports: false,
  canManageFinance: true,
}));

vi.mock("@/lib/data-context", () => ({
  useData: () => ({
    settings: createDefaultSettings(),
    salaryBatches: [],
    updateSalaryBatchPayment: vi.fn(),
    isAuthEnabled: true,
  }),
}));
vi.mock("@/features/projects/project-access", () => ({
  useProjectAccess: () => ({
    projects: [],
    personalProjects: [],
    activeTeamMembers: [],
    workspaceSubscription: {
      capabilities: { advancedReports: state.advancedReports },
    },
    canManageFinance: state.canManageFinance,
  }),
}));
vi.mock("@/components/salary-plans-panel", () => ({
  SalaryPlansPanel: () => null,
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
