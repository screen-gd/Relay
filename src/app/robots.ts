import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
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
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
