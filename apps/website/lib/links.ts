// Shared external URLs and site navigation for the marketing site.
import { APP_URL, SUPPORT_EMAIL, SUPPORT_EMAIL_URL } from "@relay/shared/links";

export { APP_URL };
export const CONTACT_EMAIL = SUPPORT_EMAIL;
export const CONTACT_EMAIL_URL = SUPPORT_EMAIL_URL;
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
export const X_URL = "https://x.com/connect_relay";

export const NAV_ITEMS = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
] as const;
