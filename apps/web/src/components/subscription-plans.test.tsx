import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { plans } from "@relay/shared/plans";

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
  openProjectLimit: 10,
  billingHealthy: true,
  blockedReasons: [],
  capabilities: {
    fileUploads: false,
    customWorkflowTemplates: false,
    advancedReports: false,
    salaryPlans: false,
    customPortalBranding: false,
    clientHub: false,
    teamFeatures: false,
  },
  canManageBilling: true,
  canTestPlans: false,
  testPlan: null,
} satisfies WorkspaceSubscriptionState;

const unhealthyStates = [
  ["past_due", "Payment needs attention"],
  ["canceled", "Subscription canceled"],
] satisfies ReadonlyArray<
  readonly [WorkspaceSubscriptionState["subscriptionStatus"], string]
>;

function privatePlanControls(html: string) {
  return (
    html.match(/aria-label="Test Workspace plan"[^>]*>(.*?)<\/div>/s)?.[1] ?? ""
  );
}

function trialButton(html: string) {
  return html.match(/<button\b[^>]*>Start 7-day Creator trial<\/button>/)?.[0];
}

describe("User subscription pricing", () => {
  test("signed-out visitors see every website plan, price, and feature without a purchase action", () => {
    const html = renderToStaticMarkup(<SubscriptionPricingView />);

    for (const plan of plans) {
      expect(html).toContain(`>${plan.name}</h3>`);
      expect(html).toContain(plan.price);
      expect(html).toContain(plan.period);
      expect(html).toContain(plan.status);
      for (const feature of [...plan.features, ...plan.comingSoon]) {
        expect(html).toContain(feature);
      }
    }
    for (const plan of plans) expect(html).toContain(plan.audience);
    expect(html).toContain(
      "Prices are subject to change. Checkout is not live yet."
    );
    expect(html.match(/disabled=""/g)).toHaveLength(3);
    expect(html).not.toContain("Account required");
  });

  test("hosted review storage is labelled coming soon for both paid plans", () => {
    const html = renderToStaticMarkup(<SubscriptionPricingView />);
    expect(html).toContain("25 GB of review file storage (coming soon)");
    expect(html).toContain(
      "100 GB of shared review file storage (coming soon)"
    );
  });

  test("the Free card offers sign-up while both upcoming plans stay disabled", () => {
    const html = renderToStaticMarkup(
      <SubscriptionPricingView onStartFree={() => undefined} />
    );
    expect(html).toContain("Get started free");
    expect(html.match(/disabled=""/g)).toHaveLength(2);
    expect(html.match(/>Not available yet<\/button>/g)).toHaveLength(2);
  });

  test("private testing controls are hidden from ordinary accounts and signed-out visitors", () => {
    for (const subscription of [freeSubscription, undefined]) {
      const html = renderToStaticMarkup(
        <SubscriptionPricingView subscription={subscription} />
      );
      expect(html).not.toContain("Private plan testing");
      expect(html).not.toContain("Test Workspace plan");
    }
  });

  test("the permitted owner sees plan choices and the selected test plan", () => {
    const html = renderToStaticMarkup(
      <SubscriptionPricingView
        subscription={{
          ...freeSubscription,
          canTestPlans: true,
          testPlan: "team",
          plan: "team",
        }}
        onTestPlanChange={() => undefined}
      />
    );
    expect(html).toContain("Private plan testing");
    expect(html).toContain("Testing Team");
    expect(html).toContain("without charges or expiry");
    expect(html).toMatch(/aria-pressed="false"[^>]*>Free<\/button>/);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Creator<\/button>/);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Team<\/button>/);
    expect(html).toContain("Use normal plan");
    expect(privatePlanControls(html)).not.toContain('disabled=""');
  });

  test("plan switches are disabled while saving and errors are exposed", () => {
    const html = renderToStaticMarkup(
      <SubscriptionPricingView
        subscription={{
          ...freeSubscription,
          canTestPlans: true,
          testPlan: "creator",
        }}
        onTestPlanChange={() => undefined}
        switchingTestPlan
        testPlanError="Could not switch plans"
      />
    );
    expect(privatePlanControls(html).match(/disabled=""/g)).toHaveLength(4);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Could not switch plans");
  });

  test("offers only the no-card Creator trial to an eligible Free owner", () => {
    const html = renderToStaticMarkup(
      <SubscriptionPricingView
        subscription={freeSubscription}
        trial={{
          open: true,
          canStart: true,
          used: false,
          active: false,
          endsAt: null,
        }}
        onStartTrial={() => undefined}
      />
    );
    expect(html).toContain("Start 7-day Creator trial");
    expect(html).toContain("No card required and no automatic charge.");
    expect(html).toContain("Team does not include a free trial.");
    expect(trialButton(html)).toBeDefined();
    expect(trialButton(html)).not.toContain('disabled=""');
  });

  test.each([
    [
      "closed trials",
      {
        open: false,
        canStart: false,
        used: false,
        active: false,
        endsAt: null,
      },
    ],
    ["signed-out visitors", undefined],
  ] as const)("offers no trial or purchase for %s", (_label, trial) => {
    const html = renderToStaticMarkup(
      <SubscriptionPricingView
        subscription={freeSubscription}
        trial={trial}
        onStartTrial={() => undefined}
      />
    );
    expect(html.match(/>Not available yet<\/button>/g)).toHaveLength(2);
    expect(html).toContain("Checkout is not live yet.");
    expect(html).not.toContain("Start 7-day Creator trial");
  });

  test("a used trial cannot be restarted from the pricing UI", () => {
    const html = renderToStaticMarkup(
      <SubscriptionPricingView
        subscription={freeSubscription}
        trial={{
          open: true,
          canStart: true,
          used: true,
          active: false,
          endsAt: null,
        }}
      />
    );
    expect(html).toContain("already used its Creator trial");
    expect(html).not.toContain("Start 7-day Creator trial");
  });

  test("non-owners cannot start the trial", () => {
    const html = renderToStaticMarkup(
      <SubscriptionPricingView
        subscription={{ ...freeSubscription, canManageBilling: false }}
        trial={{
          open: true,
          canStart: true,
          used: false,
          active: false,
          endsAt: null,
        }}
        onStartTrial={() => undefined}
      />
    );
    expect(trialButton(html)).toContain('disabled=""');
    expect(html).toContain("Only the Workspace Owner can start the trial.");
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

  test("an active trial remains visible after new trial enrollment closes", () => {
    const html = renderToStaticMarkup(
      <SubscriptionPricingView
        subscription={freeSubscription}
        trial={{
          open: false,
          canStart: false,
          used: true,
          active: true,
          endsAt: null,
        }}
      />
    );
    expect(html).toContain("Your Creator trial is active.");
    expect(html).not.toContain("Start 7-day Creator trial");
    expect(html).not.toContain("already used its Creator trial");
  });

  test("billing reconciliation is visible even while the current subscription is Free", () => {
    const html = renderToStaticMarkup(
      <SubscriptionPricingView
        subscription={{ ...freeSubscription, reconciliationState: "pending" }}
      />
    );
    expect(html).toContain("Setting up Workspace billing");
    expect(html).toContain("Free access remains available");
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
