import { Link, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect } from "react";

import { AlertCircle } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { PageEmptyState } from "@/components/workspace-page";
import { reportEssentialError } from "@/lib/telemetry";
import { RelayBrand } from "./relay-brand";

/** Root route error boundary. `reset` retries the failed route. */
export function RouteError({ error, reset }: ErrorComponentProps) {
  useEffect(() => {
    reportEssentialError(error);
  }, [error]);
  return (
    <main
      id="main-content"
      className="grid min-h-dvh place-items-center bg-[var(--surface-page)] px-4 py-8 text-[var(--text-primary)]"
    >
      <section
        className="w-full max-w-[560px] p-6 text-[var(--text-primary)] md:p-8"
        aria-labelledby="error-heading"
      >
        <RelayBrand compact />
        <h1 id="error-heading" className="sr-only">
          Relay needs a refresh
        </h1>
        <PageEmptyState
          tone="error"
          icon={<AlertCircle />}
          title="Relay needs a refresh"
          description="Your saved projects stay in local browser storage."
          action={
            <Button variant="secondary" onClick={reset}>
              Try again
            </Button>
          }
        />
        <Button asChild variant="ghost">
          <Link to="/">Back to dashboard</Link>
        </Button>
      </section>
    </main>
  );
}
