import type { Metadata } from "next";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://web.relay-app.cc.cd";

export const siteTitle = "Relay | Production workspace for video editors";
export const siteDescription =
  "Track editing projects and deadlines, collect client feedback on uploaded videos through password-protected links, and manage delivery.";

export const siteOpenGraph = {
  title: siteTitle,
  description: siteDescription,
  type: "website",
  siteName: "Relay",
  images: [
    {
      url: "/brand/relay/social-preview.png",
      width: 1600,
      height: 900,
      alt: "Relay. From first cut to final handoff.",
    },
  ],
} satisfies Metadata["openGraph"];
