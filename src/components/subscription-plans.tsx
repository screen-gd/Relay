import { useOptionalAuth } from "@/lib/optional-auth";
import { UserProfile, useUser } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { shouldShowSubscriptionWelcome } from "@/lib/subscription-onboarding";
import { api } from "../../convex/_generated/api";
import {
  CREATOR_LAUNCH_STORAGE_GB,
  CREATOR_MONTHLY_PRICE_USD,
  EXTRA_EDITOR_MONTHLY_PRICE_USD,
  FREE_OPEN_PROJECT_LIMIT,
  TEAM_INCLUDED_EDITOR_SEATS,
  TEAM_LAUNCH_STORAGE_GB,
  TEAM_MONTHLY_PRICE_USD,
} from "../../shared/subscription-plans";

export type WorkspaceSubscriptionState = NonNullable<
  FunctionReturnType<typeof api.workspaceSubscriptions.getCurrent>
>;

const capabilityUpgradeCopy = {
  fileUploads: "File uploads",
  customWorkflowTemplates: "Custom Workflow Templates",
  advancedReports: "Advanced reports",
  customPortalBranding: "Custom portal branding",
  clientHub: "Client Hub",
  salaryPlans: "Payment plans and batches",
  scheduleHistory: "completed Projects in the Timeline and Calendar",
} as const;

type PaidWorkspaceCapability = keyof typeof capabilityUpgradeCopy;

/** A flat permission hint beside the locked capability. */
export function CapabilityUpgradePrompt({
  capability,
}: {
  capability: PaidWorkspaceCapability;
  inline?: boolean;
}) {
  const name = capabilityUpgradeCopy[capability];
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-meta text-[var(--text-meta)]">
          Creator unlocks {name}.
        </p>
        <p className="mt-1 text-meta text-[var(--text-meta)]">
          Creator is not available yet. Paid plans are coming later.
        </p>
      </div>
      <Button asChild size="sm" variant="secondary">
        <Link to="/subscription">View plans</Link>
      </Button>
    </div>
  );
}

type BillingStatusContent = {
  title: string;
  body: string;
  status: "warning" | "neutral" | "success" | "info";
};

function getBillingStatus(
  subscription: WorkspaceSubscriptionState
): BillingStatusContent | null {
  if (subscription.subscriptionStatus === "past_due") {
    return {
      title: "Payment needs attention",
      body: "Relay is using safe Free limits. Existing work is preserved.",
      status: "warning",
    };
  }
  if (subscription.subscriptionStatus === "canceled") {
    return {
      title: "Subscription canceled",
      body: "Existing work stays available. New paid access remains locked.",
      status: "neutral",
    };
  }
  if (
    subscription.subscriptionStatus === "trialing" &&
    subscription.plan === "creator"
  ) {
    return {
      title: "Creator trial active",
      body: subscription.trialEndsAt
        ? `Trial ends ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(subscription.trialEndsAt))}.`
        : "Creator access is available for the duration of your confirmed trial.",
      status: "neutral",
    };
  }
  if (subscription.reconciliationState === "pending") {
    return {
      title: "Setting up Workspace billing",
      body: "Free access remains available while Relay connects Clerk.",
      status: "neutral",
    };
  }
  return null;
}

function BillingStatus({
  subscription,
}: {
  subscription: WorkspaceSubscriptionState;
}) {
  const status = getBillingStatus(subscription);

  if (!status) return null;
  return (
    <section
      role="status"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="font-medium">{status.title}</p>
        <p className="text-body text-[var(--text-primary)]">{status.body}</p>
      </div>
      <Badge status={status.status}>{subscription.plan}</Badge>
    </section>
  );
}

/**
 * Plans and billing body. Creator is offered as a trial only when the
 * backend reports trials as open; otherwise it says Creator is not available
 * yet (signed-out visitors, with no `trial`, see the same). A running trial
 * still shows as active.
 */
export function SubscriptionPricingView({
  subscription,
  trial,
  onStartTrial,
  startingTrial = false,
  trialError = "",
}: {
  subscription?: WorkspaceSubscriptionState | null;
  trial?: FunctionReturnType<typeof api.creatorTrials.getAvailability>;
  onStartTrial?: () => void;
  startingTrial?: boolean;
  trialError?: string;
}) {
  const trialsOpen = trial?.open === true;
  return (
    <div className="grid gap-(--space-section) text-body text-[var(--text-primary)]">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {trialsOpen
            ? "Creator trial: 7 days"
            : "Paid plans: not available yet"}
        </Badge>
      </div>
      <section className="border-t border-[var(--border-hairline)] pt-4">
        <h2 className="text-meta font-medium text-[var(--text-meta)]">
          Start with Free
        </h2>
        <div className="mt-3 space-y-3">
          <p>
            {FREE_OPEN_PROJECT_LIMIT} Projects in progress at a time, unlimited
            Clients and Project history, basic workflow tracking, standard
            Client Portals, and client review on embedded videos.
          </p>
          <p className="text-body text-[var(--text-primary)]">
            Free supports one Workspace owner. Hosted uploads and paid
            capabilities remain unavailable on Free.
          </p>
          <p className="text-body text-[var(--text-primary)]">
            Creator is ${CREATOR_MONTHLY_PRICE_USD} per Workspace per month.
            Team is ${TEAM_MONTHLY_PRICE_USD} per Workspace per month for{" "}
            {TEAM_INCLUDED_EDITOR_SEATS} editors, including the owner, plus $
            {EXTRA_EDITOR_MONTHLY_PRICE_USD} per extra editor. Clients and Team
            viewers do not need paid seats.
          </p>
          <p className="text-body text-[var(--text-primary)]">
            Creator adds Client Hub, custom portal branding, custom Workflow
            Templates, advanced reports, and payment plans and batches. Batches
            from a paid plan stay visible on Free.
          </p>
          <p role="status" className="text-body text-[var(--text-primary)]">
            Paid plans are coming later and are not available to purchase yet.
          </p>
        </div>
      </section>
      {trialsOpen || trial?.active ? (
        <section className="border-t border-[var(--border-hairline)] pt-4">
          <h2 className="text-meta font-medium text-[var(--text-meta)]">
            Try Creator free for 7 days
          </h2>
          <div className="mt-3 space-y-3">
            <p>
              Try hosted uploads, 5 GB of storage, custom Workflow Templates,
              advanced reports, Client Hub, custom portal branding, and payment
              plans and batches.
            </p>
            <p className="text-body text-[var(--text-primary)]">
              No card required and no automatic charge. After 7 days your
              Workspace returns to Free; your existing work stays available. One
              trial per account and Workspace. Team does not include a free
              trial.
            </p>
            {trial?.active ? (
              <p role="status" className="text-body text-[var(--text-primary)]">
                Your Creator trial is active.
              </p>
            ) : trial?.used ? (
              <p role="status" className="text-body text-[var(--text-primary)]">
                This account or Workspace has already used its Creator trial.
              </p>
            ) : (
              <Button
                type="button"
                disabled={!trial?.canStart || startingTrial || !onStartTrial}
                onClick={onStartTrial}
              >
                {startingTrial
                  ? "Starting trial…"
                  : "Start 7-day Creator trial"}
              </Button>
            )}
            {subscription && !subscription.canManageBilling ? (
              <p className="text-body text-[var(--text-primary)]">
                Only the Workspace Owner can start the trial.
              </p>
            ) : null}
            {trialError ? (
              <p role="alert" className="text-meta text-[var(--status-danger)]">
                {trialError}
              </p>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="border-t border-[var(--border-hairline)] pt-4">
          <h2 className="text-meta font-medium text-[var(--text-meta)]">
            Creator is not available yet
          </h2>
          <div className="mt-3 space-y-3">
            <p>
              Client Hub, custom portal branding, custom Workflow Templates,
              advanced reports, and payment plans and batches arrive with paid
              plans. Hosted uploads are still in development; planned launch
              storage is {CREATOR_LAUNCH_STORAGE_GB} GB for Creator and{" "}
              {TEAM_LAUNCH_STORAGE_GB} GB shared for Team.
            </p>
            <p role="status" className="text-body text-[var(--text-primary)]">
              Creator and Team cannot be started or purchased right now.
            </p>
          </div>
        </section>
      )}
      {subscription && subscription.subscriptionStatus !== "free" ? (
        <div className="border-t border-[var(--border-hairline)] pt-4">
          <BillingStatus subscription={subscription} />
        </div>
      ) : null}
    </div>
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
            Your Workspace starts on Free. No card is required; paid plans are
            coming later.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-meta text-[var(--status-danger)]">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            pending={saving}
            pendingLabel="Starting..."
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
