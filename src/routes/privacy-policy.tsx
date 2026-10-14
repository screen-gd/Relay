import { createFileRoute, redirect } from "@tanstack/react-router";

// Old alias for the privacy page. Kept as a permanent redirect.
export const Route = createFileRoute("/privacy-policy")({
  beforeLoad: () => {
    throw redirect({ to: "/privacy", statusCode: 301 });
  },
});
