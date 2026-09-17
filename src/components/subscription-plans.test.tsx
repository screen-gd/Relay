import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import {
  CapabilityUpgradePrompt,
  ClerkPricingPlans,
  SubscriptionPricingView,
  UserBillingProfile,
  type WorkspaceSubscriptionState,
} from "./subscription-plans";

vi.mock("@clerk/nextjs", () => ({
  PricingTable: (props: Record<string, unknown>) => (
    <div
      data-clerk-pricing-table
      data-for={props.for}
      data-highlighted-plan={props.highlightedPlan}
      data-redirect={props.newSubscriptionRedirectUrl}
    />
  ),
  UserProfile: () => <div data-clerk-user-profile />,
  useUser: () => ({ isLoaded: true, isSignedIn: false, user: null }),
}));

vi.mock("convex/react", () => ({
  useAction: () => vi.fn(),
  useMutation: () => vi.fn(),
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

  test("does not mount Clerk checkout while purchases are paused", () => {
    const html = renderToStaticMarkup(
      <ClerkPricingPlans subscription={freeSubscription} />
    );

    expect(html).not.toContain("data-clerk-pricing-table");
    expect(html).toContain(
      "Purchases are unavailable for the Free-only launch"
    );
  });

  test("shows the paused state without an Organization or Workspace", () => {
    const html = renderToStaticMarkup(
      <SubscriptionPricingView checkoutReturned={false} />
    );

    expect(html).not.toContain("data-clerk-pricing-table");
    expect(html).toContain("Start with Free");
  });

  test("uses Clerk UserProfile for billing management", () => {
    const html = renderToStaticMarkup(<UserBillingProfile />);

    expect(html).toContain("data-clerk-user-profile");
  });

  test("does not mount checkout before Workspace billing ownership is known", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_PURCHASES_ENABLED", "true");
    try {
      const html = renderToStaticMarkup(
        <SubscriptionPricingView checkoutReturned={false} />
      );

      expect(html).not.toContain("data-clerk-pricing-table");
      expect(html).not.toContain("Manage billing in Clerk");
      expect(html).toContain("Free only");
      expect(html).toContain("Purchases are unavailable");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  test("keeps billing controls read-only for non-owner members", () => {
    const html = renderToStaticMarkup(
      <SubscriptionPricingView
        checkoutReturned={false}
        subscription={{ ...freeSubscription, canManageBilling: false }}
      />
    );

    expect(html).not.toContain("Manage billing in Clerk");
    expect(html).not.toContain("data-clerk-pricing-table");
    expect(html).not.toContain("Retry billing sync");
  });

  test("keeps checkout and Clerk sync unavailable even for owners with a stale purchase flag", () => {
    vi.stubEnv("NEXT_PUBLIC_BILLING_PURCHASES_ENABLED", "true");
    try {
      const html = renderToStaticMarkup(
        <SubscriptionPricingView
          checkoutReturned={false}
          subscription={freeSubscription}
        />
      );

      expect(html).not.toContain("Retry billing sync");
      expect(html).not.toContain("data-clerk-pricing-table");
      expect(html).not.toContain("Manage billing in Clerk");
      expect(html).toContain("Free only");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  test("shows a confirmed Creator trial without reading Clerk markup", () => {
    const html = renderToStaticMarkup(
      <SubscriptionPricingView
        checkoutReturned={false}
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

  test("treats checkout return as unconfirmed until Convex changes", () => {
    const html = renderToStaticMarkup(
      <SubscriptionPricingView
        checkoutReturned
        subscription={freeSubscription}
      />
    );

    expect(html).toContain(
      "A checkout redirect does not confirm payment or unlock paid access"
    );
    expect(html).not.toContain("Payment succeeded");
  });

  test.each(unhealthyStates)(
    "shows the %s billing state",
    (subscriptionStatus, copy) => {
      const html = renderToStaticMarkup(
        <SubscriptionPricingView
          checkoutReturned={false}
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
