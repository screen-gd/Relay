import { siteUrl } from "../lib/site-metadata";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/"].map((path) => ({
    url: new URL(path, siteUrl).href,
  }));
}
