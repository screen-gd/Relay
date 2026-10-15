import { createFileRoute } from "@tanstack/react-router";
import { ProjectHistoryApplication } from "@/features/projects/project-history-application";

export const Route = createFileRoute("/_workspace/projects/history")({
  component: ProjectHistoryApplication,
});
