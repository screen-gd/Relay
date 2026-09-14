import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const publicRoutes = ["", "/accessibility", "/contact", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-07-22T00:00:00.000Z");
  return publicRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/privacy" || route === "/terms" ? 0.4 : 0.7
  }));
}
