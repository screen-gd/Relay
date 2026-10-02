import type { Metadata } from "next";

// Keep marketing discovery URLs separate from the app's NEXT_PUBLIC_SITE_URL.
export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_MARKETING_SITE_URL?.trim() ||
    "https://web.relay-app.cc.cd"
).origin;

export const siteTitle = "Relay | Production workspace for video editors";
export const siteDescription =
  "Track editing projects and deadlines, collect client feedback on embedded videos through password-protected links, and track delivery and payments.";

export const siteOpenGraph = {
  title: siteTitle,
  description: siteDescription,
  type: "website",
  siteName: "Relay",
  images: [
    {
      url: "/brand/relay/social-preview.png",
      width: 1774,
      height: 887,
      alt: "Relay. Video production workspace for editors.",
    },
  ],
} satisfies Metadata["openGraph"];
