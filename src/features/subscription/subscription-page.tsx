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
import { LoaderCircle } from "lucide-react";
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
  } = useSubscriptionController();
  return (
    <WorkspacePage
      family="administration"
      className="[&_[data-slot=content-section]]:shadow-[var(--app-shadow-1)]"
    >
      <PageHeader
        eyebrow="Workspace / Subscription"
        title="Plans and billing"
        description="Relay launches with Free only. Paid plans are coming later."
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
          bodyMode="flush"
        >
          {!isLoaded ||
          (isSignedIn &&
            (isConvexAuthLoading ||
              (isConvexAuthenticated && subscription === undefined))) ? (
            <div
              role="status"
              className="grid min-h-[220px] place-items-center p-6"
            >
              <LoaderCircle
                aria-hidden="true"
                className="size-7 animate-spin text-[var(--app-accent)]"
              />
            </div>
          ) : isSignedIn ? (
            <SubscriptionPricingView subscription={subscription} />
          ) : (
            <div className="grid max-w-[620px] gap-4 p-5 md:p-6">
              <h2 className="text-xl font-semibold text-foreground">
                Account required
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
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
                    variant="outline"
                    onClick={() => openSignIn()}
                  >
                    Sign in
                  </OwnedButton>
                </div>
              ) : null}
            </div>
          )}
        </ContentSection>
      </PageContent>
    </WorkspacePage>
  );
}
