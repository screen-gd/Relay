import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "../../components/site/PageHeader";
import TrustPage, { TrustSection } from "../../components/site/TrustPage";
import { CONTACT_EMAIL_URL } from "../../lib/links";
import { siteOpenGraph } from "../../lib/site-metadata";

export const metadata: Metadata = {
  title: "About",
  description:
    "What Relay is, who builds it, and where the product stands today.",
  alternates: { canonical: "/about" },
  openGraph: { ...siteOpenGraph, url: "/about" },
};

const sections: readonly TrustSection[] = [
  {
    id: "what-relay-is",
    heading: "What Relay is",
    paragraphs: [
      "Relay is a workspace for freelance video editors and small post-production teams. It keeps clients, projects, workflow stages, outputs and versions, client review, deliverable files, earnings, and salary contracts together instead of across a task tracker, a chat app, and a folder of links.",
      "The Free plan is open to everyone with no invite. Creator and Team are still in development and checkout is not live, so neither can be bought yet; the prices on the pricing page are subject to change.",
    ],
  },
  {
    id: "who-builds-it",
    heading: "Who builds it",
    paragraphs: [
      "Relay is built by a small independent team. The app, this site, and the roadmap come from one project, and the roadmap list is generated from that project's issue tracker, so an entry appears as shipped only after the work behind it is closed.",
      <>
        No company entity, office, or headcount is published for Relay. Email{" "}
        <a href={CONTACT_EMAIL_URL}>contact@relay-app.cc.cd</a> with questions,
        corrections, or feature requests.
      </>,
    ],
  },
  {
    id: "where-your-work-lives",
    heading: "Where your work lives",
    facts: [
      {
        term: "Local mode",
        children: "Workspace records stay in this browser and need no account.",
      },
      {
        term: "Account mode",
        children:
          "Clerk signs you in, and Convex stores the synced records and uploaded files.",
      },
      {
        term: "This site",
        children:
          "Served by Cloudflare. The app runs on Vercel, with an optional Cloudflare Worker build.",
      },
    ],
    paragraphs: [
      "Backup and restore in Settings exports the workspace as one JSON file. Records are deleted from the pages that own them: a project from its own page, files from the project's Files panel, and clients by archiving them.",
      <>
        <Link href="/privacy-and-data">Privacy & Data</Link> lists the
        providers, what the backup file contains, and the controls in detail.
      </>,
    ],
  },
  {
    id: "what-is-not-finished",
    heading: "What is not finished",
    paragraphs: [
      "The roadmap page is the current record of what is in progress, planned, and recently shipped. Paid plans and checkout are still in development rather than scheduled here.",
    ],
  },
];

/** /about: what Relay is, who builds it, and where the product stands. */
export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="About"
        description="What Relay is, who builds it, and where the product stands today."
      />
      <TrustPage sections={sections} />
    </>
  );
}
