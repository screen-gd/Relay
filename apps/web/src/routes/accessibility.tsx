import { createFileRoute } from "@tanstack/react-router";
import { AccessibilityPage } from "@/app/accessibility/accessibility-page";
import { canonical, pageMeta } from "@/lib/route-head";

export const Route = createFileRoute("/accessibility")({
  head: () => ({
    meta: pageMeta(
      "Accessibility | Relay",
      "Relay's accessibility goals, supported features, known limitations, and feedback contact."
    ),
    links: [canonical("/accessibility")],
  }),
  component: AccessibilityPage,
});
