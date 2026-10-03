import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { WorkItem } from "@/lib/types";
import { useProjectTableController } from "./project-table-controller";

const custom: WorkItem = {
  id: "custom",
  profileId: "profile",
  title: "Custom project",
  clientId: "client",
  status: "In Progress",
  workType: "freelance",
  startDate: "2026-08-01",
  dueDate: "2026-08-31",
  earnings: 0,
  notes: "",
  workflowStageId: "custom-edit",
  workflowStages: [
    { id: "custom-edit", label: " editing ", purpose: "editing" },
    { id: "custom-done", label: "Delivered", purpose: "delivered" },
  ],
};

function controllerFor(project: WorkItem, canUpdateProjectStatus: boolean) {
  let controller: ReturnType<typeof useProjectTableController> | undefined;
  function Harness() {
    controller = useProjectTableController({
      scope: "personal",
      personalProjects: [
        project,
        {
          ...custom,
          id: "standard",
          workflowStages: undefined,
          workflowStageId: "editing",
        },
      ],
      teamProjects: [],
      clients: [],
      salaryWorkType: "salary",
      currentUserId: "user",
      allowAllTeamProjects: true,
      activeTeamMemberCount: 1,
      canUpdateProjectStatus,
    });
    return null;
  }
  renderToStaticMarkup(createElement(Harness));
  if (!controller) throw new Error("Controller did not render");
  return controller;
}

describe("Project board movement", () => {
  it("maps merged columns to owned stage IDs and rejects current or unavailable columns", () => {
    const controller = controllerFor(custom, false);
    expect(controller.resolveMoveStage(custom, "delivered")).toBe(
      "custom-done"
    );
    expect(controller.canMoveProject(custom, "delivered")).toBe(true);
    expect(controller.canMoveProject(custom, "editing")).toBe(false);
    expect(controller.canMoveProject(custom, "client-review")).toBe(false);
    expect(
      controller.resolveMoveStage(custom, "client-review")
    ).toBeUndefined();
    expect(
      controller.getStageChoices(custom).map(({ stage }) => stage.id)
    ).toEqual(["custom-edit", "custom-done"]);
  });

  it("preserves the team permission check", () => {
    const teamProject = { ...custom, teamId: "team" };
    const denied = controllerFor(teamProject, false);
    expect(denied.resolveMoveStage(teamProject, "delivered")).toBe(
      "custom-done"
    );
    expect(denied.canMoveProject(teamProject, "delivered")).toBe(false);
    expect(
      controllerFor(teamProject, true).canMoveProject(teamProject, "delivered")
    ).toBe(true);
  });
});
