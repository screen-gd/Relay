import { createFileRoute } from "@tanstack/react-router";
import { ResourcesApplication } from "@/features/resources/resources-application";

export const Route = createFileRoute("/_workspace/resources")({
  component: ResourcesApplication,
});
