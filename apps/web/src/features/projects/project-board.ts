import type { WorkItem } from "@/lib/types";
import { DEFAULT_WORKFLOW_STAGES } from "@/lib/workflow-templates";
import {
  getProjectWorkflowStage,
  getProjectWorkflowStages,
  type ProjectStageGroup,
} from "./project-domain";

/** The workspace overview groups detailed workflow steps by their purpose. */
export function createProjectOverviewBoard(projects: readonly WorkItem[]) {
  const board: ProjectStageGroup[] = DEFAULT_WORKFLOW_STAGES.map((stage) => ({
    key: stage.id,
    stage,
    projects: [],
  }));
  if (projects.some((project) => project.status === "Cancelled")) {
    board.push({
      key: "cancelled",
      stage: { id: "cancelled", label: "Cancelled", purpose: "delivered" },
      projects: [],
    });
  }
  for (const project of projects) {
    const column =
      project.status === "Cancelled"
        ? board.find((column) => column.key === "cancelled")
        : board.find(
            (column) =>
              column.stage.purpose === getProjectWorkflowStage(project).purpose
          );
    column?.projects.push(project);
  }
  return {
    board,
    resolveMoveStage(project: WorkItem, columnKey: string) {
      const target = DEFAULT_WORKFLOW_STAGES.find(
        (stage) => stage.id === columnKey
      );
      if (!target) return undefined;
      const current = getProjectWorkflowStage(project);
      // Preserve the exact step when several steps share a purpose.
      if (project.status !== "Cancelled" && current.purpose === target.purpose)
        return current.id;
      return getProjectWorkflowStages(project).find(
        (stage) => stage.purpose === target.purpose
      )?.id;
    },
  };
}
