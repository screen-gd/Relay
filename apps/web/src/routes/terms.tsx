import { createFileRoute } from "@tanstack/react-router";
import { TermsPage } from "@/app/terms/terms-page";
import { canonical, pageMeta } from "@/lib/route-head";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: pageMeta(
      "Terms of Service | Relay",
      "The terms that apply when using Relay."
    ),
    links: [canonical("/terms")],
  }),
  component: TermsPage,
});
