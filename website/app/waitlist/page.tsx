import { siteOpenGraph } from "../../lib/site-metadata";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import WaitlistForm from "../../components/WaitlistForm";

export const metadata: Metadata = {
  title: "Join the waitlist | Relay",
  description: "Request an early-access invite to Relay.",
  alternates: { canonical: "/waitlist" },
  openGraph: {
    ...siteOpenGraph,
    url: "/waitlist",
    title: "Join the waitlist | Relay",
  },
};

export default function WaitlistPage() {
  return (
    <main className="waitlist-page">
      <header className="waitlist-nav">
        <Link className="brand" href="/" aria-label="Relay home">
          <Image
            src="/brand/relay/lockup-accent.svg"
            width={320}
            height={100}
            alt="Relay"
            priority
          />
        </Link>
        <Link href="/">Back to Relay</Link>
      </header>

      <section className="waitlist-layout" aria-labelledby="waitlist-title">
        <div className="waitlist-intro">
          <h1 id="waitlist-title">Request early access to Relay.</h1>
          <p>
            Join the waitlist to try project tracking, client reviews, and
            delivery. Selected testers receive an email invite.
          </p>
        </div>

        <div className="waitlist-stage">
          <div className="waitlist-card-glow">
            <WaitlistForm />
          </div>
        </div>
      </section>
    </main>
  );
}
