"use client";

import {
  ContentSection,
  PageContent,
  PageHeader,
  WorkspacePage,
} from "@/components/workspace-page";
import { SubscriptionPricingView } from "@/components/subscription-plans";
import { Badge as OwnedBadge } from "@/components/ui/badge";
import { Button as OwnedButton } from "@/components/ui/button";
import { useSubscriptionController } from "./subscription-controller";

export function SubscriptionPage() {
  const {
    isAuthEnabled,
    isSignedIn,
    isLoaded,
    openSignIn,
    openSignUp,
    isConvexAuthenticated,
    isConvexAuthLoading,
    subscription,
    trial,
    startingTrial,
    trialError,
    startTrial,
    switchingTestPlan,
    testPlanError,
    changeTestPlan,
  } = useSubscriptionController();
  const loadingSubscription =
    !isLoaded ||
    (isSignedIn &&
      (isConvexAuthLoading ||
        (isConvexAuthenticated && subscription === undefined)));

  return (
    <WorkspacePage family="library">
      <PageHeader
        title="Plans and billing"
        description="Compare Free, Creator, and Team Workspace plans."
        actions={
          <OwnedBadge variant="secondary">
            {isSignedIn ? "Signed in" : "Local mode"}
          </OwnedBadge>
        }
      />
      <PageContent data-family-region="subscription-administration">
        {loadingSubscription ? (
          <ContentSection title="Current plan">
            <p role="status" className="type-body-sm text-text-2">
              Loading Workspace subscription...
            </p>
          </ContentSection>
        ) : !isSignedIn ? (
          <ContentSection
            title="Local workspace"
            actions={
              isAuthEnabled ? (
                <OwnedButton
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => openSignIn()}
                >
                  Sign in
                </OwnedButton>
              ) : undefined
            }
          >
            <p className="type-body-sm text-text-2">
              Your local projects stay available. A Free account adds Workspace
              sync; no payment is required.
            </p>
          </ContentSection>
        ) : !isConvexAuthenticated ? (
          <ContentSection title="Workspace subscription">
            <p role="status" className="type-body-sm text-text-2">
              Waiting for your Workspace connection. Plans are shown below.
            </p>
          </ContentSection>
        ) : null}
        <SubscriptionPricingView
          subscription={subscription}
          onStartFree={!isSignedIn && isAuthEnabled ? openSignUp : undefined}
          trial={trial}
          startingTrial={startingTrial}
          trialError={trialError}
          onStartTrial={() => void startTrial()}
          switchingTestPlan={switchingTestPlan}
          testPlanError={testPlanError}
          onTestPlanChange={(plan) => void changeTestPlan(plan)}
        />
      </PageContent>
    </WorkspacePage>
  );
}
