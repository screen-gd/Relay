import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import {
  CapabilityUpgradePrompt,
  SubscriptionPricingView,
  UserBillingProfile,
  type WorkspaceSubscriptionState,
} from "./subscription-plans";

vi.mock("@clerk/nextjs", () => ({
  UserProfile: () => <div data-clerk-user-profile />,
  useUser: () => ({ isLoaded: true, isSignedIn: false, user: null }),
}));

vi.mock("@/lib/optional-auth", () => ({
  useOptionalAuth: () => ({ isSignedIn: true }),
}));

const freeSubscription = {
  clerkOrganizationId: "org_workspace",
  plan: "free",
  billingPeriod: null,
  subscriptionStatus: "free",
  trialEndsAt: null,
  reconciliationState: "synced",
  editorSeatAllowance: 1,
  storageQuotaBytes: 0,
  billingHealthy: true,
  blockedReasons: [],
  capabilities: {
    fileUploads: false,
    customWorkflowTemplates: false,
    advancedReports: false,
    salaryPlans: true,
    customPortalBranding: false,
    clientHub: false,
    teamFeatures: false,
  },
  canManageBilling: true,
} satisfies WorkspaceSubscriptionState;

const unhealthyStates = [
  ["past_due", "Payment needs attention"],
  ["canceled", "Subscription canceled"],
] satisfies ReadonlyArray<
  readonly [WorkspaceSubscriptionState["subscriptionStatus"], string]
>;

describe("User subscription pricing", () => {
  test("names the capability and target plan without promising a purchase", () => {
    const html = renderToStaticMarkup(
      <CapabilityUpgradePrompt capability="fileUploads" />
    );

    expect(html).toContain("Creator unlocks File uploads");
    expect(html).toContain("Paid plans are coming later");
    expect(html).toContain("View plans");
  });

  test("shows the Free-only launch state", () => {
    const html = renderToStaticMarkup(
      <SubscriptionPricingView subscription={freeSubscription} />
    );

    expect(html).toContain("Start with Free");
    expect(html).toContain(
      "Purchases are unavailable for the Free-only launch"
    );
    expect(html).not.toContain("data-clerk-pricing-table");
  });

  test("uses Clerk UserProfile for billing management", () => {
    const html = renderToStaticMarkup(<UserBillingProfile />);

    expect(html).toContain("data-clerk-user-profile");
  });

  test("keeps billing controls read-only for non-owner members", () => {
    const html = renderToStaticMarkup(
      <SubscriptionPricingView
        subscription={{ ...freeSubscription, canManageBilling: false }}
      />
    );

    expect(html).not.toContain("Manage billing in Clerk");
    expect(html).not.toContain("Retry billing sync");
  });

  test("shows a confirmed Creator trial without reading Clerk markup", () => {
    const html = renderToStaticMarkup(
      <SubscriptionPricingView
        subscription={{
          ...freeSubscription,
          plan: "creator",
          subscriptionStatus: "trialing",
          trialEndsAt: "2026-09-08T00:00:00.000Z",
        }}
      />
    );

    expect(html).toContain("Creator trial active");
    expect(html).toContain("Trial ends");
  });

  test.each(unhealthyStates)(
    "shows the %s billing state",
    (subscriptionStatus, copy) => {
      const html = renderToStaticMarkup(
        <SubscriptionPricingView
          subscription={{
            ...freeSubscription,
            subscriptionStatus,
            billingHealthy: false,
          }}
        />
      );

      expect(html).toContain(copy);
    }
  );
});
