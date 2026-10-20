import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createDefaultSettings } from "@/features/settings/settings-defaults";
import { ProjectActionsProvider } from "./project-actions-provider";

const state = vi.hoisted(() => ({ isSignedIn: false }));

vi.mock("@/lib/data-context", () => ({
  useData: () => ({
    items: [],
    settings: createDefaultSettings(),
    setItems: vi.fn(),
    setSettings: vi.fn(),
    salaryPlans: [],
    isSignedIn: state.isSignedIn,
    setToast: vi.fn(),
  }),
  useProjectGroups: () => ({
    groups: [],
    saveGroup: vi.fn(),
    setGroupArchived: vi.fn(),
  }),
  useProjectWorkflow: () => ({}),
}));

vi.mock("./project-access", () => ({
  ProjectAccessProvider: ({ children }: { children: ReactNode }) => children,
  useProjectAccess: () => ({
    sample: false,
    projects: [],
    personalProjects: [],
    teamProjects: [],
    teamData: undefined,
    activeTeamMembers: [],
    currentTeamId: undefined,
    teamWorkspace: undefined,
    canCreateProjects: true,
    canCreateTeamProjects: true,
    canEditProjects: true,
    canManageTeamProjects: true,
    canManageFinance: true,
  }),
}));

vi.mock("./project-activity", () => ({
  ProjectActivityProvider: ({ children }: { children: ReactNode }) => children,
  useProjectActivity: () => ({
    recordProjectActivity: vi.fn(),
    removeProjectActivity: vi.fn(),
  }),
}));

vi.mock("./project-view", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./project-view")>()),
  useProjectNavigation: () => vi.fn(),
}));

vi.mock("./project-dialogs", () => ({
  ProjectDialog: () => null,
  DeleteProjectDialog: () => null,
}));

vi.mock("@/components/project-groups-dialog", () => ({
  ProjectGroupsDialog: () => null,
}));

vi.mock("@/components/new-project-dialog", () => ({
  NewProjectDialog: ({
    briefImportEnabled,
  }: {
    briefImportEnabled?: boolean;
  }) => (
    <div
      data-slot="new-project-dialog"
      data-brief={String(Boolean(briefImportEnabled))}
    />
  ),
}));

vi.mock("@/components/confirm-dialog", () => ({
  useConfirm: () => vi.fn(),
}));

vi.mock("@/features/clients/use-client-actions", () => ({
  useClientActions: () => ({
    clientRecords: [],
    clientOptions: [],
    addClient: vi.fn(),
  }),
}));

vi.mock("@/lib/onboarding", () => ({
  resolveOnboardingVariant: () => "v2",
  trackOnboardingEvent: vi.fn(),
}));

vi.mock("@/lib/telemetry", () => ({
  trackOptionalEvent: vi.fn(),
}));

function render(sample: boolean) {
  return renderToStaticMarkup(
    <ProjectActionsProvider sample={sample}>
      <div />
    </ProjectActionsProvider>
  );
}

describe("Brief import access", () => {
  it("offers the locked import to a local visit that never signs up", () => {
    state.isSignedIn = false;
    expect(render(false)).toContain('data-brief="true"');
  });

  it("offers the import to a signed-in Workspace", () => {
    state.isSignedIn = true;
    expect(render(false)).toContain('data-brief="true"');
  });

  it("keeps the import out of the sample studio", () => {
    expect(render(true)).toContain('data-brief="false"');
  });
});
