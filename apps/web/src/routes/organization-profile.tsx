import { createFileRoute } from "@tanstack/react-router";
import { OrganizationProfilePage } from "@/app/organization-profile/organization-profile-page";
import { noIndex } from "@/lib/route-head";

export const Route = createFileRoute("/organization-profile")({
  head: () => ({ meta: [noIndex] }),
  component: OrganizationProfilePage,
});
