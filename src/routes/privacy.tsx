import { createFileRoute } from "@tanstack/react-router";
import { PrivacyPage } from "@/app/privacy/privacy-page";
import { canonical, pageMeta } from "@/lib/route-head";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: pageMeta(
      "Privacy Policy | Relay",
      "How Relay collects, uses, stores, and shares information."
    ),
    links: [canonical("/privacy")],
  }),
  component: PrivacyPage,
});
