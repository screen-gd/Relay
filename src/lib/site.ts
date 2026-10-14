const configuredSiteUrl = import.meta.env.VITE_SITE_URL?.trim();

export const siteUrl = (configuredSiteUrl || "http://localhost:3100").replace(
  /\/$/,
  ""
);
