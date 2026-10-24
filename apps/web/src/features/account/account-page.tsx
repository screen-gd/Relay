import { UserProfile } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { LoaderCircle } from "@/components/icons";
import {
  ContentSection,
  PageContent,
  PageHeader,
  WorkspacePage,
} from "@/components/workspace-page";
import { Badge as OwnedBadge } from "@/components/ui/badge";
import { Button as OwnedButton } from "@/components/ui/button";
import { useAccountController } from "./account-controller";

export function AccountSettingsPage() {
  const { isAuthEnabled, isSignedIn, isLoaded, openSignIn, openSignUp } =
    useAccountController();

  return (
    <WorkspacePage family="administration" className="max-w-4xl">
      <PageHeader
        title="Account settings"
        description="Manage your private login details separately from your public Relay profile."
        actions={
          <OwnedBadge variant={isSignedIn ? "default" : "secondary"}>
            {isSignedIn ? "Signed in" : "Local mode"}
          </OwnedBadge>
        }
      />
      <PageContent data-family-region="account-administration">
        <ContentSection
          title="Private account"
          description="Manage your sign-in details and connected accounts."
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
              className="grid max-w-2xl gap-3"
              aria-labelledby="account-required-title"
            >
              <h3
                id="account-required-title"
                className="text-text-1 type-label"
              >
                Account required
              </h3>
              <p className="text-text-2 type-body-sm">
                Sign in or create an account to manage your email, password and
                connected accounts. You can keep editing your public profile in
                local mode.
              </p>
              {isAuthEnabled ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <OwnedButton
                    size="sm"
                    type="button"
                    onClick={() => openSignUp()}
                  >
                    Create account
                  </OwnedButton>
                  <OwnedButton
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => openSignIn()}
                  >
                    Sign in
                  </OwnedButton>
                </div>
              ) : (
                <p role="status" className="text-text-2 type-body-sm">
                  Sign-in is currently unavailable. Your local workspace remains
                  available on this device.
                </p>
              )}
            </div>
          ) : (
            <div className="min-w-0">
              <UserProfile
                routing="hash"
                appearance={{
                  variables: {
                    borderRadius: "var(--radius-soft)",
                    colorBackground: "var(--surface-page)",
                    colorForeground: "var(--text-1)",
                    colorMuted: "var(--surface-card)",
                    colorMutedForeground: "var(--text-2)",
                    colorPrimary: "var(--primary)",
                    colorPrimaryForeground: "var(--primary-foreground)",
                    colorInput: "var(--surface-page)",
                    colorInputForeground: "var(--text-1)",
                    colorBorder: "var(--line-control)",
                    colorDanger: "var(--fail-text)",
                    fontFamily: "var(--font-sans)",
                  },
                  elements: {
                    rootBox: "w-full min-w-0",
                    cardBox:
                      "w-full max-w-none rounded-soft bg-page shadow-none",
                    card: "shadow-none",
                    navbar: "bg-well text-text-2 border-line-row",
                    pageScrollBox:
                      "h-auto max-h-none overflow-visible bg-page py-1",
                  },
                }}
              />
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
            <OwnedButton
              asChild
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              <Link to="/profile/edit">Edit public profile</Link>
            </OwnedButton>
          </div>
        </ContentSection>
      </PageContent>
    </WorkspacePage>
  );
}
