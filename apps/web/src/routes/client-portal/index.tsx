import { createFileRoute } from "@tanstack/react-router";
import { ClientPortalLandingPage } from "@/app/client-portal/client-portal-landing-page";

export const Route = createFileRoute("/client-portal/")({
  component: ClientPortalLandingPage,
});
