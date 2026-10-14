import { createFileRoute } from "@tanstack/react-router";
import { ProjectsApplication } from "@/features/projects/projects-application";

export const Route = createFileRoute("/_workspace/projects/")({
  component: ProjectsApplication,
});
