import type { Metadata } from "next";
import PlanComparison from "../../components/pricing/PlanComparison";
import PricingFaq from "../../components/pricing/PricingFaq";
import PricingPlans from "../../components/pricing/PricingPlans";
import PageHeader from "../../components/site/PageHeader";
import { siteOpenGraph } from "../../lib/site-metadata";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Relay is free while paid plans are in development. Try Creator free for 7 days.",
  alternates: { canonical: "/pricing" },
  openGraph: { ...siteOpenGraph, url: "/pricing" },
};

/** /pricing: plan columns, comparison table, and pricing questions. */
export default function PricingPage() {
  return (
    <>
      <PageHeader
        title="Pricing"
        description="Relay is free while paid plans are in development."
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
