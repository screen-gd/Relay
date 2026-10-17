import { RouteError } from "@/app/error-page";
import globalsCss from "@/app/globals.css?url";
import { NotFound } from "@/app/not-found-page";
import { Providers } from "@/app/providers";
import { themeBootScript } from "@/features/routes/shared/route-theme";
import { siteUrl } from "@/lib/site";
import { supportEmail } from "@/lib/support-contact";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import type { ReactNode } from "react";

const siteTitle = "Relay | Video Production Workspace for Editors";
const siteDescription =
  "Plan edits, track deadlines, manage client feedback, organize media, and monitor production work in one focused workspace built for video editors.";
const socialImage = `${siteUrl}/brand/relay/social-preview.png`;

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Relay",
  url: siteUrl,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: siteDescription,
  image: socialImage,
  publisher: {
    "@type": "Organization",
    name: "Relay",
    url: siteUrl,
    email: supportEmail,
  },
};

const clerkModalCenteringCss = `
[class*="cl-modalBackdrop"] {
  align-items: center !important;
  display: flex !important;
  justify-content: center !important;
  min-height: 100dvh !important;
  padding: 24px !important;
}

[class*="cl-modalContent"] {
  margin: auto !important;
  max-height: calc(100dvh - 48px) !important;
}
`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "color-scheme", content: "light dark" },
      { title: siteTitle },
      { name: "description", content: siteDescription },
      { name: "application-name", content: "Relay" },
      { name: "author", content: "Relay" },
      { name: "creator", content: "Relay" },
      {
        name: "keywords",
        content:
          "video editing,project tracker,local-first,editing workflow,payment batch",
      },
      { property: "og:title", content: siteTitle },
      { property: "og:description", content: siteDescription },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${siteUrl}/` },
      { property: "og:site_name", content: "Relay" },
      { property: "og:image", content: socialImage },
      { property: "og:image:width", content: "1774" },
      { property: "og:image:height", content: "887" },
      {
        property: "og:image:alt",
        content: "Relay. Video production workspace for editors.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: siteTitle },
      { name: "twitter:description", content: siteDescription },
      { name: "twitter:image", content: socialImage },
    ],
    links: [
      { rel: "stylesheet", href: globalsCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      {
        rel: "icon",
        href: "/brand/relay/favicon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        rel: "icon",
        href: "/brand/relay/favicon-64.png",
        sizes: "64x64",
        type: "image/png",
      },
      { rel: "shortcut icon", href: "/brand/relay/favicon-32.png" },
      { rel: "apple-touch-icon", href: "/brand/relay/app-icon-dark-256.png" },
    ],
    scripts: [
      // Applies the saved theme before first paint to avoid a flash.
      { children: themeBootScript },
      {
        type: "application/ld+json",
        children: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
      },
    ],
    styles: [{ children: clerkModalCenteringCss }],
  }),
  component: RootComponent,
  errorComponent: RouteError,
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
});

function RootComponent() {
  return (
    <Providers
      clerkPublishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      convexUrl={import.meta.env.VITE_CONVEX_URL}
    >
      <Outlet />
    </Providers>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Rendered here because HeadContent keeps one meta tag per name. */}
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#ffffff"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#000000"
        />
      </head>
      <body
        className="antialiased"
        style={{
          margin: 0,
          background: "var(--surface-page)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-geist-sans), Geist, sans-serif",
        }}
      >
        <a className="skip-link" href="#main-content">
          Skip to workspace content
        </a>
        {children}
        <Analytics />
        <SpeedInsights />
        <Scripts />
      </body>
    </html>
  );
}
