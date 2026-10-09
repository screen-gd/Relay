import type { Metadata } from "next";

// Keep marketing discovery URLs separate from the app's NEXT_PUBLIC_SITE_URL.
export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_MARKETING_SITE_URL?.trim() ||
    "https://web.relay-app.cc.cd"
).origin;

export const siteTitle = "Relay | Production workspace for video editors";
export const siteDescription =
  "Track editing projects and deadlines, collect client feedback on embedded videos through password-protected links, and track delivery and payments.";

/** Link-preview image: a screenshot of the home hero. Used for Open Graph,
 * the X card, and structured data. The main app keeps its own
 * brand/relay/social-preview.png. */
export const siteSocialImage = {
  url: "/social/hero.png",
  width: 1912,
  height: 1008,
  alt: "Relay home page.",
};

export const siteOpenGraph = {
  title: siteTitle,
  description: siteDescription,
  type: "website",
  siteName: "Relay",
  images: [siteSocialImage],
} satisfies Metadata["openGraph"];
