import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RelayBrand } from "./relay-brand";

/** Root route not-found screen. */
export function NotFound() {
  return (
    <main
      id="main-content"
      className="grid min-h-dvh place-items-center bg-page px-4 py-8 text-text-1"
    >
      <Card
        className="w-full max-w-[560px] bg-well p-6 text-text-1 shadow-none md:p-8"
        aria-labelledby="not-found-heading"
      >
        <div className="space-y-4">
          <RelayBrand compact />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-2">
              Relay
            </p>
            <h1
              id="not-found-heading"
              className="mt-2 font-[family-name:var(--font-geist-sans)] text-[30px] font-bold leading-tight"
            >
              Page not found
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-text-2">
              This Relay route does not exist. Return to the dashboard to keep
              tracking work.
            </p>
          </div>
          <Button asChild className="w-fit">
            <Link to="/">Back to Dashboard</Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
