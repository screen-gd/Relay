import { createFileRoute } from "@tanstack/react-router";
import { TeamApplication } from "@/features/team/team-application";

export const Route = createFileRoute("/_workspace/team")({
  component: TeamApplication,
});
