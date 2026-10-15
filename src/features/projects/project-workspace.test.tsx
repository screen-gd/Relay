import { describe, expect, it } from "vitest";
import type { WorkItem } from "@/lib/types";
import { projectCopy, projectMenuItems } from "./project-workspace";

const project: WorkItem = {
  id: "project-1",
  profileId: "profile-1",
  title: "Main film",
  client: "Acme",
  clientId: "client-1",
  projectGroupId: "group-1",
  status: "Delivered",
  workType: "Freelance",
  startDate: "2026-01-05",
  dueDate: "2026-01-20",
  earnings: 1200,
  paid: true,
  paidDate: "2026-01-22",
  completedAt: "2026-01-21T10:00:00.000Z",
  archived: true,
  notes: "Two cuts.",
  createdAt: "2026-01-01T09:00:00.000Z",
  workflowStages: [
    { id: "planned", label: "Planned", purpose: "planned" },
    { id: "client-review", label: "Client Review", purpose: "client_review" },
  ],
  templateDeliverables: [
    {
      title: "Suggested master",
      category: "Deliverable",
      initialStatus: "draft",
    },
  ],
};

const allPermissions = {
  canDuplicate: true,
  canArchive: true,
  canDelete: true,
};

describe("Project menu actions", () => {
  it("offers Duplicate, Archive, Export, and Delete in that order", () => {
    expect(
      projectMenuItems(project, allPermissions).map((item) => item.id)
    ).toEqual(["duplicate", "archive", "export", "delete"]);
    expect(
      projectMenuItems({ ...project, archived: false }, allPermissions).map(
        (item) => item.label
      )
    ).toEqual([
      "Duplicate project",
      "Archive project",
      "Export CSV",
      "Delete project",
    ]);
  });

  it("keeps Export available and hides the actions this person cannot take", () => {
    expect(
      projectMenuItems(project, {
        canDuplicate: false,
        canArchive: false,
        canDelete: false,
      }).map((item) => item.label)
    ).toEqual(["Export CSV"]);
    expect(
      projectMenuItems(
        { ...project, archived: false },
        { canDuplicate: true, canArchive: true, canDelete: false }
      ).map((item) => item.label)
    ).toEqual(["Duplicate project", "Archive project", "Export CSV"]);
  });

  it("labels the archive action for what it does to this Project", () => {
    const archivedLabels = projectMenuItems(project, {
      canDuplicate: false,
      canArchive: true,
      canDelete: false,
    }).map((item) => item.label);
    const openLabels = projectMenuItems(
      { archived: false },
      { canDuplicate: false, canArchive: true, canDelete: false }
    ).map((item) => item.label);
    expect(archivedLabels).toEqual(["Restore project", "Export CSV"]);
    expect(openLabels).toEqual(["Archive project", "Export CSV"]);
  });
});

describe("Project copy", () => {
  const copy = projectCopy(project, {
    id: "project-2",
    createdAt: "2026-10-15T08:00:00.000Z",
  });

  it("uses a new id and a name that says it is a copy", () => {
    expect(copy.id).toBe("project-2");
    expect(copy.title).toBe("Main film (copy)");
    expect(copy.createdAt).toBe("2026-10-15T08:00:00.000Z");
  });

  it("starts unarchived and unpaid", () => {
    expect(copy.archived).toBe(false);
    expect(copy.paid).toBe(false);
    expect(copy.paidDate).toBeUndefined();
    expect(copy.completedAt).toBeUndefined();
  });

  it("brings the Project's setup and workflow stages", () => {
    expect(copy.client).toBe("Acme");
    expect(copy.clientId).toBe("client-1");
    expect(copy.projectGroupId).toBe("group-1");
    expect(copy.workType).toBe("Freelance");
    expect(copy.earnings).toBe(1200);
    expect(copy.notes).toBe("Two cuts.");
    expect(copy.workflowStages).toEqual(project.workflowStages);
    expect(copy.workflowStages).not.toBe(project.workflowStages);
  });

  it("keeps the Project's Template list rather than flattening Outputs into it", () => {
    expect(copy.templateDeliverables).toEqual(project.templateDeliverables);
    expect(copy.templateDeliverables).not.toBe(project.templateDeliverables);
  });

  it("carries no Media Versions or review notes", () => {
    expect(Object.keys(copy)).not.toContain("versions");
    expect(Object.keys(copy)).not.toContain("comments");
  });
});
