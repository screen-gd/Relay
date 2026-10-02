import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import {
  SubscriptionPricingView,
  type WorkspaceSubscriptionState,
} from "./subscription-plans";

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
