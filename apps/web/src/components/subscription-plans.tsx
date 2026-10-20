import { UserProfile, useUser } from "@clerk/tanstack-react-start";
import { useOptionalAuth } from "@/lib/optional-auth";
import type { FunctionReturnType } from "convex/server";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContentSection } from "@/components/workspace-page";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { shouldShowSubscriptionWelcome } from "@/lib/subscription-onboarding";
import { cn } from "@/lib/utils";
import { plans } from "@relay/shared/plans";
import { CheckCircle2, Clock3 } from "@/components/icons";
import planStyles from "@relay/shared/pricing-plans.module.css";
import styles from "./subscription-plan-cards.module.css";

export type WorkspaceSubscriptionState = NonNullable<
  FunctionReturnType<typeof api.workspaceSubscriptions.getCurrent>
>;

const planLabels = { free: "Free", creator: "Creator", team: "Team" };

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

/**
 * Upsell row for a locked capability. Use `inline` inside an existing panel so
 * the prompt does not become a card nested in a card.
 */
export function CapabilityUpgradePrompt({
  capability,
  inline = false,
}: {
  capability: PaidWorkspaceCapability;
  inline?: boolean;
}) {
  const name = capabilityUpgradeCopy[capability];
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        !inline && "rounded-[var(--radius-panel)] border bg-well p-4"
      )}
    >
      <div>
        <p className="type-label">Creator unlocks {name}.</p>
        <p className="mt-1 text-muted-foreground type-label-sm">
          Creator is not available yet. Paid plans are coming later.
        </p>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link to="/subscription">View plans</Link>
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
  if (
    subscription.subscriptionStatus === "trialing" &&
    subscription.plan === "creator"
  ) {
    return {
      title: "Creator trial active",
      body: subscription.trialEndsAt
        ? `Trial ends ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(subscription.trialEndsAt))}.`
        : "Creator access is available for the duration of your confirmed trial.",
      variant: "secondary",
    };
  }
  if (subscription.reconciliationState === "pending") {
    return {
      title: "Setting up Workspace billing",
      body: "Free access remains available while your subscription is connected.",
      variant: "secondary",
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
    <div role="status" className="flex flex-col gap-1">
      <p
        className={cn(
          "type-label",
          status.variant === "destructive" && "text-fail-text"
        )}
      >
        {status.title}
      </p>
      <p className="type-body-sm text-text-2">{status.body}</p>
    </div>
  );
}

/** Plan comparison uses the same catalog as the marketing site. Billing and
 * trial availability always come from the current Workspace, not the catalog.
 */
export function SubscriptionPricingView({
  subscription,
  onStartFree,
  trial,
  onStartTrial,
  startingTrial = false,
  trialError = "",
  onTestPlanChange,
  switchingTestPlan = false,
  testPlanError = "",
}: {
  subscription?: WorkspaceSubscriptionState | null;
  onStartFree?: () => void;
  trial?: FunctionReturnType<typeof api.creatorTrials.getAvailability>;
  onStartTrial?: () => void;
  startingTrial?: boolean;
  trialError?: string;
  onTestPlanChange?: (plan: WorkspaceSubscriptionState["testPlan"]) => void;
  switchingTestPlan?: boolean;
  testPlanError?: string;
}) {
  const trialsOpen = trial?.open === true;
  return (
    <div className="grid min-w-0 gap-4">
      {subscription ? (
        <ContentSection
          title="Current plan"
          metadata={<Badge>{planLabels[subscription.plan]}</Badge>}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="grid gap-1">
              <p className="type-label">
                {planLabels[subscription.plan]} Workspace
              </p>
              <p className="type-body-sm text-text-2">
                {subscription.openProjectLimit === null
                  ? "Unlimited projects in progress"
                  : `${subscription.openProjectLimit} projects in progress`}
                {" · "}
                {subscription.editorSeatAllowance}{" "}
                {subscription.editorSeatAllowance === 1 ? "editor" : "editors"}
              </p>
              {!subscription.canManageBilling ? (
                <p className="type-body-sm text-text-2">
                  Billing is managed by the Workspace Owner.
                </p>
              ) : null}
            </div>
            <BillingStatus subscription={subscription} />
          </div>
        </ContentSection>
      ) : null}
      <section className={styles.catalog} aria-label="Workspace plans">
        <div className={cn(planStyles.plans, styles.cards)}>
          {plans.map((plan) => (
            <article
              key={plan.name}
              aria-labelledby={`workspace-plan-${plan.name}`}
              className={cn(planStyles.plan, styles.plan)}
            >
              {plan.tab ? <p className={planStyles.tab}>{plan.tab}</p> : null}
              <div className={planStyles.top}>
                <h3 id={`workspace-plan-${plan.name}`}>{plan.name}</h3>
                <p className={planStyles.description}>{plan.description}</p>
                <p className={planStyles.price}>
                  <strong>{plan.price}</strong>
                  <span>{plan.period}</span>
                </p>
                <p className={planStyles.status}>{plan.status}</p>
              </div>
              <ul className={planStyles.features}>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <CheckCircle2 className="size-4.5" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
                {plan.comingSoon.map((feature) => (
                  <li key={feature} className={planStyles.soon}>
                    <Clock3 className="size-4.5" aria-hidden="true" />
                    <span>{feature} (coming soon)</span>
                  </li>
                ))}
              </ul>
              <div className={planStyles.audience}>
                <h4>Who&apos;s the {plan.name} plan for?</h4>
                <p>{plan.audience}</p>
              </div>
              <p className={planStyles.note}>{plan.note}</p>
              <div className={cn(planStyles.cta, styles.action)}>
                <Button
                  type="button"
                  variant={plan.name === "Free" ? "default" : "outline"}
                  className="w-full"
                  disabled={plan.name !== "Free" || !onStartFree}
                  onClick={plan.name === "Free" ? onStartFree : undefined}
                >
                  {plan.name !== "Free" ? (
                    "Not available yet"
                  ) : onStartFree ? (
                    <span className="relative inline-flex overflow-hidden">
                      <span className="inline-block transition-transform duration-(--dur-base) ease-(--ease-step) motion-safe:group-hover/button:-translate-y-full motion-safe:group-focus-visible/button:-translate-y-full">
                        {plan.cta.label}
                      </span>
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 inline-block translate-y-full transition-transform duration-(--dur-base) ease-(--ease-step) motion-safe:group-hover/button:translate-y-0 motion-safe:group-focus-visible/button:translate-y-0"
                      >
                        {plan.cta.label}
                      </span>
                    </span>
                  ) : subscription?.plan === "free" ? (
                    "Current plan"
                  ) : subscription ? (
                    "Included in your plan"
                  ) : (
                    "Free access"
                  )}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>
      {trialsOpen || trial?.active ? (
        <ContentSection
          title="Creator trial"
          metadata={<Badge variant="secondary">7 days</Badge>}
        >
          <div className="grid gap-3">
            <p className="type-body-sm text-text-2">
              Try Creator capabilities with 5 GB of trial storage. No card
              required and no automatic charge. After 7 days your Workspace
              returns to Free; your existing work stays available. One trial per
              account and Workspace. Team does not include a free trial.
            </p>
            {trial?.active ? (
              <p role="status" className="type-body-sm">
                Your Creator trial is active.
              </p>
            ) : trial?.used ? (
              <p role="status" className="type-body-sm text-text-2">
                This account or Workspace has already used its Creator trial.
              </p>
            ) : (
              <div>
                <Button
                  type="button"
                  disabled={
                    !trial?.canStart ||
                    startingTrial ||
                    !onStartTrial ||
                    subscription?.canManageBilling === false
                  }
                  onClick={onStartTrial}
                >
                  {startingTrial
                    ? "Starting trial…"
                    : "Start 7-day Creator trial"}
                </Button>
              </div>
            )}
            {subscription && !subscription.canManageBilling ? (
              <p className="type-body-sm text-text-2">
                Only the Workspace Owner can start the trial.
              </p>
            ) : null}
            {trialError ? (
              <p role="alert" className="type-body-sm text-fail-text">
                {trialError}
              </p>
            ) : null}
          </div>
        </ContentSection>
      ) : null}
      {subscription?.canTestPlans ? (
        <ContentSection
          title="Private plan testing"
          description="Switch this Workspace’s plan without charges or expiry. Only your account can change the test plan."
        >
          <div className="grid gap-3">
            <p role="status" className="type-body-sm text-text-2">
              {subscription.testPlan !== null
                ? `Testing ${planLabels[subscription.testPlan]}`
                : "Using your normal plan"}
            </p>
            <div
              role="group"
              aria-label="Test Workspace plan"
              className="flex flex-wrap gap-2"
            >
              {(["free", "creator", "team"] as const).map((plan) => (
                <Button
                  key={plan}
                  type="button"
                  variant="outline"
                  aria-pressed={subscription.testPlan === plan}
                  disabled={switchingTestPlan || !onTestPlanChange}
                  onClick={() => onTestPlanChange?.(plan)}
                >
                  {planLabels[plan]}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                disabled={
                  switchingTestPlan ||
                  !onTestPlanChange ||
                  subscription.testPlan === null
                }
                onClick={() => onTestPlanChange?.(null)}
              >
                Use normal plan
              </Button>
            </div>
            {testPlanError ? (
              <p role="alert" className="type-body-sm text-fail-text">
                {testPlanError}
              </p>
            ) : null}
          </div>
        </ContentSection>
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
          <p role="alert" className="text-destructive type-body">
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
