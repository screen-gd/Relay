"use client";

import { SubscriptionPricingView } from "@/components/subscription-plans";
import { Badge as OwnedBadge } from "@/components/ui/badge";
import { Button as OwnedButton } from "@/components/ui/button";
import {
  ContentSection,
  PageContent,
  PageHeader,
  WorkspacePage,
} from "@/components/workspace-page";
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
  } = useSubscriptionController();
  return (
    <WorkspacePage family="administration" className="">
      <PageHeader
        title="Plans and billing"
        description="Start with Free. Paid plans are coming later."
        actions={
          <OwnedBadge variant={isSignedIn ? "default" : "secondary"}>
            {isSignedIn ? "Signed in" : "Local mode"}
          </OwnedBadge>
        }
      />
      <PageContent data-family-region="subscription-administration">
        <ContentSection
          title="Subscription"
          description="Free access and Workspace plan status."
        >
          {!isLoaded ||
          (isSignedIn &&
            (isConvexAuthLoading ||
              (isConvexAuthenticated && subscription === undefined))) ? (
            <div
              role="status"
              className="grid min-h-[220px] place-items-center p-6"
            ></div>
          ) : (
            <div className="grid gap-(--space-section)">
              {!isSignedIn ? (
                <div className="grid max-w-[620px] gap-4">
                  <h2 className="text-body font-medium text-[var(--text-primary)]">
                    Account required
                  </h2>
                  <p className="text-body text-[var(--text-meta)]">
                    Sign in or create an account to start a Free Workspace. No
                    payment is required.
                  </p>
                  {isAuthEnabled ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <OwnedButton type="button" onClick={() => openSignUp()}>
                        Create account
                      </OwnedButton>
                      <OwnedButton
                        type="button"
                        variant="secondary"
                        onClick={() => openSignIn()}
                      >
                        Sign in
                      </OwnedButton>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <SubscriptionPricingView
                subscription={subscription}
                trial={trial}
                startingTrial={startingTrial}
                trialError={trialError}
                onStartTrial={() => void startTrial()}
              />
            </div>
          )}
        </ContentSection>
      </PageContent>
    </WorkspacePage>
  );
}
