"use client";

import { UserProfile } from "@clerk/nextjs";
import Link from "next/link";
import { LoaderCircle, Pencil } from "lucide-react";
import {
  ContentSection,
  PageContent,
  PageHeader,
  PageToolbar,
  WorkspacePage,
} from "@/components/workspace-page";
import { Badge as OwnedBadge } from "@/components/ui/badge";
import { Button as OwnedButton } from "@/components/ui/button";
import { useAccountController } from "./account-controller";

export function AccountSettingsPage() {
  const { isAuthEnabled, isSignedIn, isLoaded, openSignIn, openSignUp } =
    useAccountController();

  return (
    <WorkspacePage
      family="administration"
      className="[&_[data-slot=content-section]]:shadow-[var(--app-shadow-1)]"
    >
      <PageHeader
        eyebrow="Workspace / Account"
        title="Account Settings"
        description="Manage your private login details separately from your public Relay profile."
        actions={
          <PageToolbar
            primary={
              <OwnedBadge variant={isSignedIn ? "default" : "secondary"}>
                {isSignedIn ? "Signed in" : "Local mode"}
              </OwnedBadge>
            }
            secondary={
              isSignedIn ? (
                <OwnedButton asChild variant="outline">
                  <Link href="/profile/edit">
                    <Pencil aria-hidden="true" />
                    Edit public profile
                  </Link>
                </OwnedButton>
              ) : null
            }
          />
        }
      />
      <PageContent
        data-family-region="account-administration"
        className="space-y-5"
      >
        <ContentSection
          title="Private account"
          description="Authentication and account controls stay inside this signed-in area."
          bodyMode="flush"
          className="scroll-mt-6"
        >
          {!isLoaded ? (
            <div
              role="status"
              className="grid min-h-[220px] place-items-center p-6"
            >
              <div className="flex flex-col items-center gap-3 text-sm text-[var(--app-muted)]">
                <LoaderCircle
                  aria-hidden="true"
                  className="size-7 animate-spin text-[var(--app-accent)]"
                />
                <span>Loading account controls...</span>
              </div>
            </div>
          ) : !isSignedIn ? (
            <div
              className="grid max-w-[620px] gap-4 p-5 md:p-6"
              aria-labelledby="account-required-title"
            >
              <h2
                id="account-required-title"
                className="text-xl font-semibold text-foreground"
              >
                Account required
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Local mode does not have an account record, email, password, or
                connected login provider. Sign in or create an account to manage
                private account settings.
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
              ) : (
                <p role="status" className="text-sm text-muted-foreground">
                  Account sync is not configured for this deployment. Use local
                  mode, or add the Clerk and Convex public settings to enable
                  accounts.
                </p>
              )}
            </div>
          ) : (
            <div className="max-h-[min(720px,calc(100dvh-13rem))] overflow-y-auto p-2.5 overscroll-contain md:p-3.5">
              <div>
                <UserProfile
                  routing="hash"
                  appearance={{
                    variables: { borderRadius: "6px" },
                    elements: {
                      rootBox: "w-full",
                      cardBox:
                        "w-full max-w-none rounded-md border border-[var(--app-border)] bg-[var(--app-soft-panel)] shadow-none",
                      card: "shadow-none",
                      navbar: "border-[var(--app-border)]",
                      pageScrollBox: "py-1",
                    },
                  }}
                />
              </div>
            </div>
          )}
        </ContentSection>

        <ContentSection
          title="Public profile"
          description="Keep the profile you share with clients separate from private authentication settings."
        >
          <div className="flex flex-col justify-between gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold">
                Profile visibility and presentation
              </p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Update your public name, handle, bio, location, and published
                work from the profile editor.
              </p>
            </div>
            {isSignedIn ? (
              <OwnedButton asChild variant="outline" className="shrink-0">
                <Link href="/profile/edit">
                  <Pencil aria-hidden="true" />
                  Edit public profile
                </Link>
              </OwnedButton>
            ) : isAuthEnabled ? (
              <OwnedButton
                type="button"
                variant="outline"
                onClick={() => openSignIn()}
                className="shrink-0"
              >
                Sign in to edit
              </OwnedButton>
            ) : (
              <span className="text-sm text-muted-foreground">
                Account sign-in is not configured.
              </span>
            )}
          </div>
        </ContentSection>
      </PageContent>
    </WorkspacePage>
  );
}
