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

describe("User subscription pricing", () => {
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
    expect(html).not.toContain('disabled=""');
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
    expect(html.match(/disabled=""/g)).toHaveLength(4);
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
    expect(html).not.toContain('disabled=""');
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
    expect(html).toContain("Creator is not available yet");
    expect(html).toContain("Paid plans: not available yet");
    expect(html).not.toContain("Start 7-day Creator trial");
  });

  test("a used trial cannot be restarted from the pricing UI", () => {
    const html = renderToStaticMarkup(
      <SubscriptionPricingView
        subscription={freeSubscription}
        trial={{
          open: true,
          canStart: false,
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
          canStart: false,
          used: false,
          active: false,
          endsAt: null,
        }}
        onStartTrial={() => undefined}
      />
    );
    expect(html).toContain('disabled=""');
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
