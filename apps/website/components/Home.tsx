import {
  CalendarDotsIcon,
  ChatCircleIcon,
  CheckCircleIcon,
  KanbanIcon,
  LinkSimpleIcon,
  WalletIcon,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ReactNode } from "react";
import { APP_URL } from "../lib/links";
import { Button } from "@/components/ui/button";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import ClientReviewDemo from "./ClientReviewDemo";
import PricingPlans from "./pricing/PricingPlans";
import HeroVideo from "./site/HeroVideo";
import Reveal from "./site/Reveal";
import SectionHeading from "./site/SectionHeading";

const features = [
  {
    icon: KanbanIcon,
    title: "Projects and deadlines",
    text: "See every project, client, and due date in one ledger.",
  },
  {
    icon: LinkSimpleIcon,
    title: "Private review links",
    text: "Clients review on a password-protected link. No account needed.",
  },
  {
    icon: ChatCircleIcon,
    title: "Timestamped comments",
    text: "YouTube and Vimeo comments land on the exact moment.",
  },
  {
    icon: CheckCircleIcon,
    title: "Approvals and delivery",
    text: "Track which version was approved and when it shipped.",
  },
  {
    icon: WalletIcon,
    title: "Payment tracking",
    text: "Record fees, mark payments, and see what is still owed.",
  },
  {
    icon: CalendarDotsIcon,
    title: "Activity and calendar",
    text: "Follow project changes and upcoming deadlines.",
  },
] as const;

/**
 * Home page sections: hero, feature grid, client review demo, pricing, and
 * the streamed roadmap preview (passed in from the server page). The hero is
 * static; the middle sections rise into view once on scroll.
 */
export default function Home({ roadmap }: { roadmap: ReactNode }) {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="container">
          <div className="hero-head">
            <h1 id="hero-title">Manage editing projects.</h1>
            <p className="hero-copy">
              Track deadlines, collect client feedback on embedded videos, and
              see what you&apos;re owed, all in one workspace.
            </p>
            <div className="hero-actions">
              <InteractiveHoverButton href={APP_URL} size="lg">
                Get started free
              </InteractiveHoverButton>
              <Button variant="outline" size="lg" asChild>
                <a href={APP_URL}>Sign in</a>
              </Button>
            </div>
          </div>
          <div className="product-reveal">
            <HeroVideo
              video={{
                src: "/videos/relay-launch.mp4",
                poster: "/videos/relay-launch-poster.jpg",
              }}
            />
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="home-features-title">
        <div className="container">
          <SectionHeading
            id="home-features-title"
            title="Built for client work."
            description="Projects, reviews, delivery, and payments in one workspace."
            action={{ href: "/features", label: "All features" }}
          />
          <div className="box-grid-frame">
            <ul className="box-grid is-reflow">
              {features.map(({ icon: Icon, title, text }, index) => (
                <li key={title}>
                  <Reveal delay={index * 0.05}>
                    <span className="feature-icon">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <ClientReviewDemo />

      <section
        className="section pricing-section"
        aria-labelledby="home-pricing-title"
      >
        <div className="container">
          <SectionHeading
            id="home-pricing-title"
            title="Free to start. Paid plans are coming soon."
            action={{ href: "/pricing", label: "Compare plans" }}
            align="center"
          />
          <PricingPlans />
        </div>
      </section>

      {roadmap}
    </>
  );
}
