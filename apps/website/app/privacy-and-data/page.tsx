import type { Metadata } from "next";
import PageHeader from "../../components/site/PageHeader";
import TrustPage, { TrustSection } from "../../components/site/TrustPage";
import { APP_URL, CONTACT_EMAIL, CONTACT_EMAIL_URL } from "../../lib/links";
import { siteOpenGraph } from "../../lib/site-metadata";

export const metadata: Metadata = {
  title: "Privacy & Data",
  description:
    "Where Relay keeps your work, which providers host it, and how to export or delete it.",
  alternates: { canonical: "/privacy-and-data" },
  openGraph: { ...siteOpenGraph, url: "/privacy-and-data" },
};

const contactPageUrl = new URL("contact", APP_URL).href;
const privacyPolicyUrl = new URL("privacy", APP_URL).href;

const sections: readonly TrustSection[] = [
  {
    id: "who-builds-relay",
    heading: "Who builds Relay",
    paragraphs: [
      "Relay is built by a small independent team. The app and this site come from one project, so what the site says about the product tracks the work itself rather than a separate marketing schedule.",
      <>
        Relay does not publish a company entity, an office, or a headcount.
        Questions about anything on this page go to{" "}
        <a href={CONTACT_EMAIL_URL}>{CONTACT_EMAIL}</a>.
      </>,
    ],
  },
  {
    id: "what-relay-stores",
    heading: "What Relay stores",
    paragraphs: [
      "Relay stores the work you enter: clients and their contact details, projects, outputs and versions, workflow stages, review comments, delivery dates, agreed amounts and payment state, salary plans and batches, saved links, and your workspace and profile settings.",
      "A signed-in workspace also stores client portal links, team membership, and notifications. Uploaded files are stored only on a plan that includes them, and Free does not.",
    ],
  },
  {
    id: "local-and-account-mode",
    heading: "Local mode and account mode",
    paragraphs: [
      "Local mode runs without an account. Projects, clients, settings, resources, and salary data stay in this browser's storage on this device, and clearing site data removes them. Client portals, team workspaces, cloud files, notifications, and chat are not available in local mode.",
      "Account mode signs you in through Clerk and writes workspace records to Convex, so the same workspace opens on any device you sign in from, with those features enabled.",
      "Optional analytics are consent-based and strip names, comments, links, tokens, and money amounts before anything is sent.",
    ],
  },
  {
    id: "where-data-lives",
    heading: "Where data lives",
    facts: [
      {
        term: "Convex",
        children:
          "Holds the database and live queries for account workspaces, and stores uploaded files for workspaces whose plan includes file uploads. Project uploads use Convex Storage today; the repository also carries a Cloudflare R2 path for files that is not enabled yet.",
      },
      {
        term: "Google Gemini and OpenAI",
        children:
          "Optional AI requests use the Workspace's own provider keys. The Owner enables AI and manages encrypted keys. Relay sends selected Project context, Comments, transcript excerpts, briefs or permitted financial figures to the selected provider. Provider charges belong to that provider account. Removing a key does not recall data already sent.",
      },
      {
        term: "Clerk",
        children:
          "Handles sign-in, sessions, and account identity. Convex derives access from the signed-in identity instead of trusting identifiers sent by the browser.",
      },
      {
        term: "Cloudflare",
        children:
          "Serves this marketing site through OpenNext, routes email sent to the contact address, and provides the Worker build of the app that the repository also supports.",
      },
      {
        term: "Vercel",
        children:
          "Hosts the Relay app. The deployment notes in the repository describe Vercel as the app's host, with the Cloudflare Worker as an alternative.",
      },
    ],
    paragraphs: [
      "Relay does not restate certification or compliance claims for these providers. Its security policy states plainly that Relay's controls are not a certification, regulatory compliance, or a formal audit.",
    ],
  },
  {
    id: "export",
    heading: "Export",
    paragraphs: [
      "Settings > Backup and restore has Export backup, which writes one JSON file with projects, clients, project groups, saved links, payment batches, and settings. Account and integration details are left out, and uploaded files are not in it.",
      "Next to it, Export CSV writes separate files for projects, clients, and payment records. Earnings and payment amounts appear only for members with finance access.",
      "Import replaces local workspace data. In an account workspace it works only while that workspace has no projects, files, or payment batches, because Relay never merges a backup into data that already exists.",
      "The Reports page also exports CSV files of its payment summary and invoice drafts. Those cover report figures, not the workspace.",
    ],
  },
  {
    id: "delete",
    heading: "Delete",
    paragraphs: [
      "Deleting a Project removes it from the Workspace and closes its Client Portal links immediately. Background cleanup removes its Project Outputs, Media Versions, Comments, transcripts, Project AI drafts, Activity history and Relay-hosted files. Cleanup retries storage failures and waits for existing upload links to expire before its final storage cleanup. Files kept by external video hosts are not deleted by Relay.",
      "Shared Client records, Salary Plans, Salary Batches and Workspace-wide AI or financial summaries remain. Relay retains a Project identifier to prevent old imports from restoring deleted links. Project deletion does not remove provider backups or security logs immediately; contact support for a complete Workspace deletion request.",
      "Files are archived from the project's Files panel, and an archived file can be deleted permanently from there. Clients are archived and restored rather than deleted, so their project history stays.",
      "Local mode has no delete-all control: clearing this browser's site data removes the workspace.",
      <>
        The app has no account deletion control. Cloud-synced records stay until
        you delete them one at a time; the privacy policy routes deletion
        requests to <a href={contactPageUrl}>the app&apos;s contact page</a>.
      </>,
    ],
  },
  {
    id: "legal-documents",
    heading: "Legal documents",
    paragraphs: [
      <>
        This page describes how the product handles data. The{" "}
        <a href={privacyPolicyUrl}>privacy policy</a>, terms of service, and
        accessibility statement are served by the app, and they are the binding
        versions.
      </>,
    ],
  },
];

/** /privacy-and-data: who builds Relay, where data lives, and how to export or delete it. */
export default function PrivacyAndDataPage() {
  return (
    <>
      <PageHeader
        title="Privacy & Data"
        description="Where Relay keeps your work, which providers host it, and how to export or delete it. Last updated October 23, 2026."
      />
      <TrustPage sections={sections} />
    </>
  );
}
