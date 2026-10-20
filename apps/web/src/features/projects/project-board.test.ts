import { describe, expect, it } from "vitest";
import { PROJECT_TEMPLATES } from "@/lib/project-templates";
import { sampleStudioProjects } from "@/lib/sample-studio";
import { createProjectOverviewBoard } from "./project-board";
import { createProjectStageBoard, moveProjectToStage } from "./project-domain";

describe("Project overview board", () => {
  it("keeps six columns across templates while preserving each exact workflow step", () => {
    const projects = PROJECT_TEMPLATES.map((template) => ({
      ...sampleStudioProjects[0],
      id: template.id,
      templateId: template.id,
      workflowStages: template.workflowStages,
      workflowStageId: template.workflowStages[1].id,
    }));
    const { board, resolveMoveStage } = createProjectOverviewBoard(projects);
    expect(board.map((column) => column.stage.label)).toEqual([
      "Planned",
      "Editing",
      "Client Review",
      "Revisions",
      "Approved",
      "Delivered",
    ]);
    expect(
      board.find((column) => column.key === "editing")?.projects
    ).toHaveLength(projects.length);
    for (const project of projects) {
      const ownDelivery = project.workflowStages.find(
        (stage) => stage.purpose === "delivered"
      );
      expect(resolveMoveStage(project, "delivered")).toBe(ownDelivery?.id);
      expect(resolveMoveStage(project, "editing")).toBe(
        project.workflowStageId
      );
    }
    const youtube = projects.find(
      (project) => project.templateId === "youtube-video"
    )!;
    expect(
      createProjectStageBoard([youtube]).board.map(
        (column) => column.stage.label
      )
    ).toEqual([
      "Brief",
      "Assembly",
      "Rough Cut",
      "Review",
      "Final Cut",
      "Published",
    ]);
    expect(resolveMoveStage(youtube, "revisions")).toBeUndefined();
  });

  it("allows existing sample workflows to reach Delivered", () => {
    for (const project of sampleStudioProjects.slice(0, 2)) {
      const legacy = {
        ...project,
        workflowStages: [
          { id: "planned", label: "Assembly", purpose: "planned" as const },
          { id: "editing", label: "Fine cut", purpose: "editing" as const },
          {
            id: "client-review",
            label: "Client Review",
            purpose: "client_review" as const,
          },
          { id: "revisions", label: "Delivery", purpose: "revisions" as const },
        ],
      };
      const { resolveMoveStage } = createProjectOverviewBoard([legacy]);
      const stageId = resolveMoveStage(legacy, "delivered");
      expect(stageId).toBeDefined();
      if (!stageId) throw new Error("Missing delivery stage");
      expect(
        moveProjectToStage(legacy, stageId, "2026-10-20T12:00:00Z")
      ).toMatchObject({
        status: "Delivered",
        completedAt: "2026-10-20T12:00:00Z",
      });
    }
  });

  it("keeps cancelled work separate and allows it to rejoin its workflow", () => {
    const cancelled = {
      ...sampleStudioProjects[2],
      status: "Cancelled" as const,
    };
    const { board, resolveMoveStage } = createProjectOverviewBoard([cancelled]);
    expect(
      board.find((column) => column.key === "cancelled")?.projects
    ).toEqual([cancelled]);
    expect(
      board.find((column) => column.key === "delivered")?.projects
    ).toEqual([]);
    expect(resolveMoveStage(cancelled, "delivered")).toBe("delivered");
  });
});
