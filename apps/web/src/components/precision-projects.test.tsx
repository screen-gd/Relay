import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrecisionProjects } from "./precision-projects";
import {
  sampleStudioProjects,
  sampleStudioSettings,
} from "@/lib/sample-studio";
import { PROJECT_TEMPLATES } from "@/lib/project-templates";

const ownerRole: "Owner" = "Owner";

const baseProps = {
  settings: sampleStudioSettings,
  personalProjects: [],
  teamProjects: [],
  currentUserId: "owner",
  currentUserRole: ownerRole,
  teamMembers: [],
  onNewProject: () => undefined,
  onViewProject: () => undefined,
  onEditProject: () => undefined,
  onArchiveProject: () => undefined,
  onDeleteProject: () => undefined,
  onUpdateProjectStatus: () => undefined,
  canCreateProjects: true,
  canCreateTeamProjects: false,
  canEditProjects: true,
  canUpdateProjectStatus: true,
  canDeleteProject: () => true,
  onManageProjectGroups: () => undefined,
};

describe("Projects directory public states", () => {
  it("renders shared overview columns and the exact template step on cards", () => {
    const template = PROJECT_TEMPLATES.find(
      (template) => template.id === "youtube-video"
    );
    if (!template) throw new Error("YouTube template missing");
    const html = renderToStaticMarkup(
      <PrecisionProjects
        {...baseProps}
        personalProjects={[
          {
            ...sampleStudioProjects[0],
            templateId: template.id,
            workflowStages: template.workflowStages,
            workflowStageId: "rough-cut",
          },
        ]}
      />
    );
    expect(html).toContain('aria-label="Workflow template"');
    expect(html).toContain("All templates");
    expect(html).toContain("Rough Cut");
    for (const label of [
      "Planned",
      "Editing",
      "Client Review",
      "Revisions",
      "Approved",
      "Delivered",
    ])
      expect(html).toContain(`aria-label="${label} projects"`);
    expect(html).not.toContain('aria-label="Published projects"');
  });
  it("renders its table contract and empty action", () => {
    const html = renderToStaticMarkup(<PrecisionProjects {...baseProps} />);
    expect(html).toContain("Project library");
    expect(html).toContain("No projects yet");
    expect(html).toContain("New project");
  });

  it("renders loading and error states", () => {
    expect(
      renderToStaticMarkup(<PrecisionProjects {...baseProps} loading />)
    ).toContain("Loading projects");
    expect(
      renderToStaticMarkup(
        <PrecisionProjects {...baseProps} error="Projects failed to load." />
      )
    ).toContain("Projects failed to load.");
  });
});
