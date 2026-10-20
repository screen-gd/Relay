import type { Metadata } from "next";
import PlanComparison from "../../components/pricing/PlanComparison";
import PricingFaq from "../../components/pricing/PricingFaq";
import PricingPlans from "../../components/pricing/PricingPlans";
import PageHeader from "../../components/site/PageHeader";
import {
  CREATOR_MONTHLY_PRICE_USD,
  TEAM_MONTHLY_PRICE_USD,
  TEAM_INCLUDED_EDITOR_SEATS,
  EXTRA_EDITOR_MONTHLY_PRICE_USD,
  FREE_OPEN_PROJECT_LIMIT,
  formatUsd,
} from "@relay/shared/plans";
import { siteOpenGraph } from "../../lib/site-metadata";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Pricing",
  description: `Track ${FREE_OPEN_PROJECT_LIMIT} projects at a time free, with unlimited clients and history. Creator is ${formatUsd(CREATOR_MONTHLY_PRICE_USD)}/month. Team is ${formatUsd(TEAM_MONTHLY_PRICE_USD)}/workspace/month for ${TEAM_INCLUDED_EDITOR_SEATS} editors, plus ${formatUsd(EXTRA_EDITOR_MONTHLY_PRICE_USD)} per extra editor. Paid plans are coming later; checkout is not live. Prices are subject to change.`,
  alternates: { canonical: "/pricing" },
  openGraph: { ...siteOpenGraph, url: "/pricing" },
};

/** /pricing: plan columns, comparison table, and pricing questions. */
export default function PricingPage() {
  return (
    <>
      <PageHeader
        title="Pricing"
        description={`Track ${FREE_OPEN_PROJECT_LIMIT} projects at a time free. Upgrade for unlimited projects, your client hub, branding, workflows, and team. Paid plans are coming later. Prices are subject to change.`}
      />
      <section className="section" aria-labelledby="plans-title">
        <div className="container">
          <h2 className="sr-only" id="plans-title">
            Plans
          </h2>
          <PricingPlans />
        </div>
      </section>
      <section className="section" aria-labelledby="compare-title">
        <div className="container">
          <h2 className={styles.title} id="compare-title">
            Compare plans
          </h2>
          <PlanComparison />
        </div>
      </section>
      <section className="section" aria-labelledby="pricing-faq-title">
        <div className="container">
          <PricingFaq />
        </div>
      </section>
    </>
  );
}
