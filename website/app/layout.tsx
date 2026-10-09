import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, Geist_Mono } from "next/font/google";
import {
  siteUrl,
  siteTitle,
  siteDescription,
  siteOpenGraph,
  siteSocialImage,
} from "../lib/site-metadata";
import BrandCta from "../components/site/BrandCta";
import MotionProvider from "../components/site/MotionProvider";
import DitherBackdrop from "../components/site/DitherBackdrop";
import SiteFooter from "../components/site/SiteFooter";
import SiteHeader from "../components/site/SiteHeader";
import "./globals.css";

// Figtree for body and UI text; Bricolage Grotesque for headings.
const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Relay",
  title: { default: siteTitle, template: "%s | Relay" },
  description: siteDescription,
  keywords: [
    "video editing project management",
    "production workflow",
    "revision management",
    "Relay",
  ],
  openGraph: siteOpenGraph,
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [siteSocialImage],
  },
  icons: {
    icon: [
      {
        url: "/brand/relay/favicon-16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/brand/relay/favicon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/brand/relay/favicon-64.png",
        sizes: "64x64",
        type: "image/png",
      },
    ],
    apple: "/brand/relay/app-icon-dark-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: "#121214",
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Relay",
  url: siteUrl,
  description: siteDescription,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  image: new URL(siteSocialImage.url, siteUrl).href,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${figtree.variable} ${bricolage.variable} ${geistMono.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <DitherBackdrop />
        <MotionProvider>
          <SiteHeader />
          <main id="main-content">{children}</main>
          <BrandCta />
          <SiteFooter />
        </MotionProvider>
      </body>
    </html>
  );
}
