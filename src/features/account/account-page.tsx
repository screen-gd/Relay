import { Pencil } from "@/components/icons";
import { Badge as OwnedBadge } from "@/components/ui/badge";
import { Button as OwnedButton } from "@/components/ui/button";
import {
  ContentSection,
  PageContent,
  PageFilters,
  PageHeader,
  WorkspacePage,
} from "@/components/workspace-page";
import { UserProfile } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { useAccountController } from "./account-controller";

export function AccountSettingsPage() {
  const { isAuthEnabled, isSignedIn, isLoaded, openSignIn, openSignUp } =
    useAccountController();

  return (
    <WorkspacePage family="administration" className="">
      <PageHeader
        title="Account Settings"
        description="Manage your private login details separately from your public Relay profile."
        actions={
          <PageFilters
            primary={
              <OwnedBadge variant={isSignedIn ? "default" : "secondary"}>
                {isSignedIn ? "Signed in" : "Local mode"}
              </OwnedBadge>
            }
            secondary={
              isSignedIn ? (
                <OwnedButton asChild variant="secondary">
                  <Link to="/profile/edit">
                    <Pencil aria-hidden="true" />
                    Edit public profile
                  </Link>
                </OwnedButton>
              ) : null
            }
          />
        }
      />
      <PageContent data-family-region="account-administration" className="">
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
              <div className="flex flex-col items-center gap-3 text-body text-[var(--text-meta)]">
                <span>Loading account controls...</span>
              </div>
            </div>
          ) : !isSignedIn ? (
            <div
              className="grid max-w-[620px] gap-4"
              aria-labelledby="account-required-title"
            >
              <h2
                id="account-required-title"
                className="text-body font-medium text-[var(--text-primary)]"
              >
                Account required
              </h2>
              <p className="text-body text-[var(--text-meta)]">
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
                    variant="secondary"
                    onClick={() => openSignIn()}
                  >
                    Sign in
                  </OwnedButton>
                </div>
              ) : (
                <p role="status" className="text-body text-[var(--text-meta)]">
                  Account sync is not configured for this deployment. Use local
                  mode, or add the Clerk and Convex public settings to enable
                  accounts.
                </p>
              )}
            </div>
          ) : (
            <div className="max-h-[min(720px,calc(100dvh-13rem))] overflow-y-auto overscroll-contain">
              <div>
                <UserProfile
                  routing="hash"
                  appearance={{
                    variables: { borderRadius: "6px" },
                    elements: {
                      rootBox: "w-full",
                      cardBox:
                        "w-full max-w-none rounded-md border border-[var(--border-control)] bg-[var(--surface-fill)] shadow-none",
                      card: "shadow-none",
                      navbar: "border-[var(--border-control)]",
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
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-body font-medium">
                Profile visibility and presentation
              </p>
              <p className="mt-1 max-w-2xl text-body text-[var(--text-meta)]">
                Update your public name, handle, bio, location, and published
                work from the profile editor.
              </p>
            </div>
            {isSignedIn ? (
              <OwnedButton asChild variant="secondary" className="shrink-0">
                <Link to="/profile/edit">
                  <Pencil aria-hidden="true" />
                  Edit public profile
                </Link>
              </OwnedButton>
            ) : isAuthEnabled ? (
              <OwnedButton
                type="button"
                variant="secondary"
                onClick={() => openSignIn()}
                className="shrink-0"
              >
                Sign in to edit
              </OwnedButton>
            ) : (
              <span className="text-body text-[var(--text-meta)]">
                Account sign-in is not configured.
              </span>
            )}
          </div>
        </ContentSection>
      </PageContent>
    </WorkspacePage>
  );
}
