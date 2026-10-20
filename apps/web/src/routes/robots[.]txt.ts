// Serves /robots.txt
import { createFileRoute } from "@tanstack/react-router";
import { siteUrl } from "@/lib/site";

const disallowPaths = [
  "/api/",
  "/account",
  "/calendar",
  "/client-hub",
  "/client-portal",
  "/clients",
  "/feedback",
  "/files",
  "/integrations",
  "/media",
  "/organization",
  "/organization-profile",
  "/profile",
  "/projects",
  "/reports",
  "/resources",
  "/sample-studio",
  "/settings",
  "/subscription",
  "/team",
  "/team-chat",
  "/templates",
  "/timeline",
];

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        const lines = [
          "User-Agent: *",
          "Allow: /",
          ...disallowPaths.map((path) => `Disallow: ${path}`),
          "",
          `Host: ${siteUrl}`,
          `Sitemap: ${siteUrl}/sitemap.xml`,
        ];
        return new Response(lines.join("\n"), {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      },
    },
  },
});
