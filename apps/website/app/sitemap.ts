import { siteUrl } from "../lib/site-metadata";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "/",
    "/features",
    "/pricing",
    "/roadmap",
    "/about",
    "/privacy-and-data",
  ].map((path) => ({
    url: new URL(path, siteUrl).href,
  }));
}
