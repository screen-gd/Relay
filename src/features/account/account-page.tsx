import { UserProfile } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { LoaderCircle, Pencil } from "@/components/icons";
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
      className="[&_[data-slot=content-section]]:shadow-none"
    >
      <PageHeader
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
              <div className="flex flex-col items-center gap-3 text-text-2 type-body">
                <LoaderCircle
                  aria-hidden="true"
                  className="size-7 animate-spin text-primary"
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
                className="text-foreground type-heading"
              >
                Account required
              </h2>
              <p className="text-muted-foreground type-body">
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
                <p role="status" className="text-muted-foreground type-body">
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
                        "w-full max-w-none rounded-soft bg-page shadow-none",
                      card: "shadow-none",
                      navbar: "border-line-row",
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
            <p className="max-w-2xl text-text-2 type-body-sm">
              Change your public name, handle, bio and location in the profile
              editor.
            </p>
            {isSignedIn ? (
              <OwnedButton
                asChild
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                <Link to="/profile/edit">Edit public profile</Link>
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
              <span className="text-muted-foreground type-body">
                Account sign-in is not configured.
              </span>
            )}
          </div>
        </ContentSection>
      </PageContent>
    </WorkspacePage>
  );
}
