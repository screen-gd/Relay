// Shared external URLs and site navigation for the marketing site.
export const APP_URL = "https://relay-app.cc.cd/";
export const CONTACT_EMAIL = "contact@relay-app.cc.cd";
export const CONTACT_EMAIL_URL = `mailto:${CONTACT_EMAIL}`;
// Legal pages are served by the app. About and Privacy & Data are pages of
// this site, and Privacy & Data links to the app's policy for the binding text.
export const LEGAL_LINKS = [
  { label: "Privacy policy", href: new URL("privacy", APP_URL).href },
  { label: "Terms", href: new URL("terms", APP_URL).href },
  { label: "Accessibility", href: new URL("accessibility", APP_URL).href },
] as const;
// Trust pages on this site: who builds Relay, and how the product handles data.
export const TRUST_LINKS = {
  about: { label: "About", href: "/about" },
  privacyData: { label: "Privacy & Data", href: "/privacy-and-data" },
} as const;
// Source of roadmap issues for lib/roadmap.ts. Not linked from the site.
export const GITHUB_REPO = "screen-gd/Relay";
export const X_URL = "https://x.com/connect_relay";

export const NAV_ITEMS = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Roadmap", href: "/roadmap" },
] as const;
