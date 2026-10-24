import { createFileRoute } from "@tanstack/react-router";
import { OrganizationApplication } from "@/features/profile/organization-application";

export const Route = createFileRoute("/_workspace/organization")({
  component: OrganizationApplication,
});
