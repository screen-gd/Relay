import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import ClientReviewDemo from "../../components/ClientReviewDemo";
import DeliveryDemo from "../../components/DeliveryDemo";
import ActivitySection from "../../components/features/ActivitySection";
import FeatureIndex from "../../components/features/FeatureIndex";
import PaymentsSection from "../../components/features/PaymentsSection";
import PageHeader from "../../components/site/PageHeader";
import WorkflowDemo from "../../components/WorkflowDemo";
import { APP_URL } from "../../lib/links";
import { siteOpenGraph } from "../../lib/site-metadata";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Track editing projects, share password-protected review links, collect timestamped feedback, and track delivery and payments.",
  alternates: { canonical: "/features" },
  openGraph: { ...siteOpenGraph, url: "/features" },
};

/**
 * /features: header with actions and a chapter index, then one chapter per
 * part of the job: workflow, client review, delivery, payments, activity.
 */
export default function FeaturesPage() {
  return (
    <>
      <PageHeader
        title="From first cut to final payment."
        description="Plan the project, collect timestamped client feedback, track the approved version, and see what you're owed. One workspace for client video work."
      >
        <div className="hero-actions">
          <InteractiveHoverButton href={APP_URL} size="lg">
            Get started free
          </InteractiveHoverButton>
          <Button variant="outline" size="lg" asChild>
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
        <p className="hero-note">Free plan. No card needed.</p>
      </PageHeader>
      <FeatureIndex />
      <WorkflowDemo />
      <ClientReviewDemo variant="chapter" />
      <DeliveryDemo />
      <PaymentsSection />
      <ActivitySection />
    </>
  );
}
