import { ArrowLeft } from "@/components/icons";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

export function ClientPortalLandingPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 text-[var(--text-primary)]">
      <section className="w-full max-w-lg p-6 text-center md:p-10">
        <div className="mb-6 flex justify-center">
          <a
            href="/"
            aria-label="Relay home"
            className="inline-flex items-center gap-2 text-[var(--text-primary)] no-underline"
          >
            <span className="grid size-8 place-items-center rounded-md bg-foreground text-body font-semibold text-background">
              R
            </span>
            <span className="text-title font-semibold">Relay</span>
          </a>
        </div>
        <h1 className="font-[family-name:var(--font-geist-sans)] text-display font-semibold md:text-display">
          A project link is required
        </h1>
        <p className="mx-auto mt-2 max-w-[500px] text-body text-[var(--text-meta)]">
          No account required. Open the unique portal link shared by your editor
          to track progress, review deliverables, and submit revision requests.
        </p>
        <Button asChild variant="secondary" className="mt-6">
          <Link to="/">
            <ArrowLeft aria-hidden="true" />
            Back to Relay
          </Link>
        </Button>
      </section>
    </main>
  );
}
