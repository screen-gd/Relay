import { createFileRoute } from "@tanstack/react-router";
import { ClientHubPage } from "@/app/client-hub/client-hub-page";
import { noIndex } from "@/lib/route-head";

export const Route = createFileRoute("/client-hub")({
  head: () => ({ meta: [noIndex] }),
  component: ClientHubPage,
});
