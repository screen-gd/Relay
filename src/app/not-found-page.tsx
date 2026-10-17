import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { RelayBrand } from "./relay-brand";

/** Root route not-found screen. */
export function NotFound() {
  return (
    <main
      id="main-content"
      className="grid min-h-dvh place-items-center bg-[var(--surface-page)] px-4 py-8 text-[var(--text-primary)]"
    >
      <section
        className="w-full max-w-[560px] p-6 text-[var(--text-primary)] md:p-8"
        aria-labelledby="not-found-heading"
      >
        <div className="space-y-4">
          <RelayBrand compact />
          <div>
            <h1
              id="not-found-heading"
              className="mt-2 font-[family-name:var(--font-geist-sans)] text-display font-semibold"
            >
              Page not found
            </h1>
            <p className="mt-2 text-body text-[var(--text-primary)]">
              This Relay route does not exist. Return to the dashboard to keep
              tracking work.
            </p>
          </div>
          <Button asChild className="w-fit">
            <Link to="/">Back to Dashboard</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
