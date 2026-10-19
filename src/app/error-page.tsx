import { Link, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      className="grid min-h-dvh place-items-center bg-page px-4 py-8 text-text-1"
    >
      <Card
        className="w-full max-w-[520px] bg-well p-6 text-text-1 md:p-8"
        aria-labelledby="error-heading"
      >
        <div className="space-y-4">
          <RelayBrand compact />
          <div>
            <h1 id="error-heading" className="type-heading">
              Relay needs a refresh
            </h1>
            <p className="mt-2 text-text-2 type-body">
              The tracker hit an unexpected app error. Your saved projects stay
              in local browser storage.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={reset}>Try Again</Button>
            <Button asChild variant="outline" className="text-text-1">
              <Link to="/">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </Card>
    </main>
  );
}
