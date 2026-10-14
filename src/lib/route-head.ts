import { z } from "zod";
import { siteUrl } from "@/lib/site";

// Shared `head()` and search helpers for TanStack route files.

/** Keeps private pages out of search indexes. */
export const noIndex = { name: "robots", content: "noindex, nofollow" };

/** Canonical link for a public path such as "/contact". */
export function canonical(path: string) {
  return { rel: "canonical", href: `${siteUrl}${path}` };
}

/** Title and description meta tags for a page. */
export function pageMeta(title: string, description: string) {
  return [{ title }, { name: "description", content: description }];
}

/**
 * `?view=` on project routes. Repeated values keep the first one. Search
 * values are JSON-parsed, so anything that is not text (`?view=123`) is
 * dropped and the page falls back to its default tab.
 */
export const projectViewSearch = z.object({
  view: z.unknown().transform((value) => {
    const first = Array.isArray(value) ? value[0] : value;
    return typeof first === "string" ? first : undefined;
  }),
});
