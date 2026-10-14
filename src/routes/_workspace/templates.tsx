import { createFileRoute } from "@tanstack/react-router";
import { TemplatesApplication } from "@/features/templates/templates-application";

export const Route = createFileRoute("/_workspace/templates")({
  component: TemplatesApplication,
});
