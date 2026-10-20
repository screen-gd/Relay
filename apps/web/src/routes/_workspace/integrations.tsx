import { createFileRoute } from "@tanstack/react-router";
import { IntegrationsApplication } from "@/features/integrations/integrations-application";

export const Route = createFileRoute("/_workspace/integrations")({
  component: IntegrationsApplication,
});
