const configuredSiteUrl = import.meta.env.VITE_SITE_URL?.trim();

// The dev server runs on port 3100 and must never be the published origin.
// `vite build --mode cloudflare` skips `.env.production`, so a missing
// VITE_SITE_URL used to reach production metadata as `http://localhost:3100`.
const fallbackSiteUrl = import.meta.env.DEV
  ? "http://localhost:3100"
  : "https://relay-app.cc.cd";

export const siteUrl = (configuredSiteUrl || fallbackSiteUrl).replace(
  /\/$/,
  ""
);

/** Public origin of the marketing site, which hosts the About and Privacy & Data pages. */
export const marketingSiteUrl = "https://web.relay-app.cc.cd";
