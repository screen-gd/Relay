import { createFileRoute } from "@tanstack/react-router";
import { ClientPortalView } from "@/app/client-portal/client-portal-view";

export const Route = createFileRoute("/client-portal/$token")({
  component: SharedClientPortalRoute,
});

function SharedClientPortalRoute() {
  const { token } = Route.useParams();
  return <ClientPortalView token={token} />;
}
