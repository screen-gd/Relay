"use client";

import { UserProfile, useUser } from "@clerk/nextjs";
import { useOptionalAuth } from "@/lib/optional-auth";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useState } from "react";

import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { shouldShowSubscriptionWelcome } from "@/lib/subscription-onboarding";

export type WorkspaceSubscriptionState = NonNullable<
  FunctionReturnType<typeof api.workspaceSubscriptions.getCurrent>
>;

const capabilityUpgradeCopy = {
  fileUploads: "File uploads",
  customWorkflowTemplates: "Custom Workflow Templates",
  advancedReports: "Advanced reports",
  customPortalBranding: "Custom portal branding",
  clientHub: "Client Hub",
} as const;

export type PaidWorkspaceCapability = keyof typeof capabilityUpgradeCopy;

export function CapabilityUpgradePrompt({
  capability,
}: {
  capability: PaidWorkspaceCapability;
}) {
  const name = capabilityUpgradeCopy[capability];
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border/70 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">Creator unlocks {name}.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Paid plans are coming later. Relay launches with Free only.
        </p>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link href="/subscription">View plans</Link>
      </Button>
    </div>
  );
}

type BillingStatusContent = {
  title: string;
  body: string;
  variant: "destructive" | "secondary";
};

function getBillingStatus(
  checkoutReturned: boolean,
  subscription: WorkspaceSubscriptionState
): BillingStatusContent | null {
  if (subscription.subscriptionStatus === "past_due") {
    return {
      title: "Payment needs attention",
      body: "Relay is using safe Free limits. Existing work is preserved.",
      variant: "destructive",
    };
  }
  if (subscription.subscriptionStatus === "canceled") {
    return {
      title: "Subscription canceled",
      body: "Existing work stays available. New paid access remains locked.",
      variant: "secondary",
    };
  }
  if (subscription.subscriptionStatus === "trialing") {
    return {
      title: "Creator trial active",
      body: subscription.trialEndsAt
        ? `Trial ends ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(subscription.trialEndsAt))}.`
        : "This is an existing confirmed trial; new trials are unavailable.",
      variant: "secondary",
    };
  }
  if (checkoutReturned && subscription.plan === "free") {
    return {
      title: "Checking for a confirmed subscription update",
      body: "Paid access stays locked until Relay verifies Clerk.",
      variant: "secondary",
    };
  }
  if (subscription.reconciliationState === "pending") {
    return {
      title: "Setting up Workspace billing",
      body: "Free access remains available while Relay connects Clerk.",
      variant: "secondary",
    };
  }
  return null;
}

function BillingStatus({
  checkoutReturned,
  subscription,
}: {
  checkoutReturned: boolean;
  subscription: WorkspaceSubscriptionState;
}) {
  const status = getBillingStatus(checkoutReturned, subscription);

  if (!status) return null;
  return (
    <Card role="status" className="mb-4 rounded-none">
      <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">{status.title}</p>
          <p className="text-sm text-muted-foreground">{status.body}</p>
        </div>
        <Badge variant={status.variant}>{subscription.plan}</Badge>
      </CardContent>
    </Card>
  );
}

export function SubscriptionPricingView({
  checkoutReturned,
  subscription,
}: {
  checkoutReturned: boolean;
  subscription?: WorkspaceSubscriptionState | null;
}) {
  return (
    <div className="min-h-[calc(100dvh-15rem)] p-4 md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          September 18 launch
        </span>
        <Badge variant="outline">Free only</Badge>
      </div>
      <Card className="mb-4">
        <CardContent className="space-y-3 py-5">
          <h2 className="text-lg font-semibold">Start with Free</h2>
          <p>
            Unlimited Projects and Clients, basic workflow tracking, standard
            Client Portals, and external video embeds.
          </p>
          <p className="text-sm text-muted-foreground">
            Free supports one Workspace owner. Hosted uploads and paid
            capabilities remain unavailable on Free.
          </p>
          <p role="status" className="text-sm text-muted-foreground">
            Paid plans are coming later. Purchases are unavailable for the
            Free-only launch.
          </p>
        </CardContent>
      </Card>
      {subscription && subscription.subscriptionStatus !== "free" ? (
        <BillingStatus checkoutReturned={false} subscription={subscription} />
      ) : null}
      {checkoutReturned ? (
        <p role="status" className="text-sm text-muted-foreground">
          A checkout redirect does not confirm payment or unlock paid access.
        </p>
      ) : null}
    </div>
  );
}

export function ClerkPricingPlans({
  checkoutReturned = false,
  subscription,
}: {
  checkoutReturned?: boolean;
  subscription?: WorkspaceSubscriptionState | null;
}) {
  return (
    <SubscriptionPricingView
      checkoutReturned={checkoutReturned}
      subscription={subscription}
    />
  );
}

export function UserBillingProfile() {
  const { isSignedIn } = useOptionalAuth();
  if (!isSignedIn) return <p>Sign in to view your billing profile.</p>;
  return <UserProfile routing="hash" />;
}

export function FirstLoginPlanDialog() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");
  const open = Boolean(
    !completed &&
    isLoaded &&
    isSignedIn &&
    user &&
    shouldShowSubscriptionWelcome({
      completed: user.unsafeMetadata.relayPlanWelcomeComplete,
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt,
    })
  );

  async function continueToWorkspace() {
    if (!user || saving) return;
    setSaving(true);
    setError("");
    try {
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          relayPlanWelcomeComplete: true,
        },
      });
      setCompleted(true);
    } catch {
      setError("Relay could not save your choice. Try again.");
      setSaving(false);
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Welcome to Relay</DialogTitle>
          <DialogDescription>
            Your Workspace starts on Free. Paid plans are coming later; no
            payment is required for the Free launch.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            disabled={saving}
            onClick={() => void continueToWorkspace()}
          >
            {saving ? "Starting..." : "Continue to Workspace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
