import { ArrowLeft } from "@/components/icons";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ClientPortalLandingPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 text-foreground">
      <Card className="w-full max-w-lg p-6 text-center md:p-10">
        <div className="mb-6 flex justify-center">
          <a
            href="/"
            aria-label="Relay home"
            className="inline-flex items-center gap-2 text-foreground no-underline"
          >
            <span className="grid size-8 place-items-center rounded-[6px] bg-foreground text-background type-label">
              R
            </span>
            <span className="type-heading-sm">Relay</span>
          </a>
        </div>
        <h1 className="type-heading-lg">A project link is required</h1>
        <p className="mx-auto mt-2 max-w-[500px] text-muted-foreground type-body">
          No account required. Open the unique portal link shared by your editor
          to track progress, review deliverables, and submit revision requests.
        </p>
        <Button asChild variant="outline" className="mt-6 text-text-1">
          <Link to="/">
            <ArrowLeft aria-hidden="true" />
            Back to Relay
          </Link>
        </Button>
      </Card>
    </main>
  );
}
