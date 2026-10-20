import { createFileRoute } from "@tanstack/react-router";
import { PublicProfilePage } from "@/app/u/[slug]/public-profile-page";

export const Route = createFileRoute("/u/$slug")({
  component: SharedPublicProfileRoute,
});

function SharedPublicProfileRoute() {
  const { slug } = Route.useParams();
  return <PublicProfilePage slug={slug} />;
}
