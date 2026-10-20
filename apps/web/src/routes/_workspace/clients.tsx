import { createFileRoute } from "@tanstack/react-router";
import { ClientsApplication } from "@/features/clients/clients-application";

export const Route = createFileRoute("/_workspace/clients")({
  component: ClientsApplication,
});
