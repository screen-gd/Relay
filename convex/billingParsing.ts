import type { Doc } from "./_generated/dataModel";

export type BillingConfirmation = {
  clerkUserId: string;
  clerkSubscriptionId?: string;
  clerkPlanId: string;
  billingPeriod: Doc<"workspaceSubscriptions">["billingPeriod"];
  subscriptionStatus: Doc<"workspaceSubscriptions">["subscriptionStatus"];
  trialStartsAt?: string;
  trialEndsAt?: string;
  confirmedEditorQuantity: number;
  includedEditorSeatQuantity: number;
  purchasedExtraEditorSeatQuantity: number;
  storageAddonQuantity: number;
  clerkEventAt: string;
};

const knownPlans = new Set([
  "free",
  "free_org",
  "free_user",
  "creator",
  "creator_plan",
  "team",
  "team_plan",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string");
}

function numberValue(...values: unknown[]) {
  return values.find(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value)
  );
}

function recordValue(...values: unknown[]) {
  return values.find(isRecord);
}

function arrayValue(...values: unknown[]) {
  return values.find((value): value is unknown[] => Array.isArray(value));
}

function isoDate(value: unknown, fallback: string) {
  const timestamp = numberValue(value);
  if (timestamp === undefined) return fallback;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function planForItem(item: Record<string, unknown>) {
  const plan = recordValue(item.plan);
  const planId = stringValue(plan?.slug, item.plan_id, item.planId);
  if (!planId || !knownPlans.has(planId)) return null;
  return {
    id: planId,
    isDefault: plan?.is_default === true || plan?.isDefault === true,
  };
}

function itemStatus(item: Record<string, unknown>) {
  return stringValue(item.status) ?? "";
}

function chooseItem(items: unknown[]) {
  const records = items.filter(isRecord);
  return (
    records.find((item) => {
      const plan = planForItem(item);
      return (
        plan &&
        !plan.isDefault &&
        ["active", "past_due"].includes(itemStatus(item))
      );
    }) ??
    records.find(
      (item) =>
        planForItem(item) !== null &&
        ["active", "past_due"].includes(itemStatus(item))
    ) ??
    records.find((item) => planForItem(item) !== null)
  );
}

function relayStatus(
  status: string,
  isDefault: boolean,
  isFreeTrial: boolean
): Doc<"workspaceSubscriptions">["subscriptionStatus"] {
  if (isDefault) return "free";
  if (status === "past_due") return "past_due";
  if (status === "active") return isFreeTrial ? "trialing" : "active";
  return status === "free" ? "free" : "canceled";
}

function confirmationFromParts(
  value: Record<string, unknown>,
  items: unknown[],
  eventAtFallback: string,
  subscriptionId?: unknown,
  statusOverride?: unknown,
  requestedUserId?: string
): BillingConfirmation | null {
  const item = chooseItem(items);
  if (!item) return null;
  const plan = planForItem(item);
  if (!plan) return null;
  const payer = recordValue(value.payer);
  const itemPayer = recordValue(item.payer);
  const responseUserId = stringValue(
    payer?.user_id,
    payer?.userId,
    itemPayer?.user_id,
    itemPayer?.userId
  );
  const clerkUserId = responseUserId ?? requestedUserId;
  if (!clerkUserId) return null;

  const planPeriod = stringValue(item.plan_period, item.planPeriod);
  const billingPeriod = plan.isDefault
    ? null
    : planPeriod === "annual"
      ? "annual"
      : "monthly";
  const status = stringValue(statusOverride, item.status) ?? "";
  const currentItemStatus = itemStatus(item);
  const effectiveStatus =
    [
      "canceled",
      "ended",
      "abandoned",
      "expired",
      "incomplete",
      "upcoming",
    ].includes(currentItemStatus) || ["upcoming", "incomplete"].includes(status)
      ? "canceled"
      : currentItemStatus === "past_due" || status === "past_due"
        ? "past_due"
        : status;
  const isFreeTrial = item.is_free_trial === true || item.isFreeTrial === true;
  const trialStartsAt = isFreeTrial
    ? isoDate(numberValue(item.period_start, item.periodStart), eventAtFallback)
    : undefined;
  const trialEndValue = numberValue(item.period_end, item.periodEnd);
  const trialEndsAt =
    isFreeTrial && trialEndValue !== undefined
      ? isoDate(trialEndValue, eventAtFallback)
      : undefined;
  const relayPlan =
    plan.id === "team" || plan.id === "team_plan" ? "team" : plan.id;
  const clerkSubscriptionId = stringValue(subscriptionId, value.id);

  return {
    clerkUserId,
    ...(clerkSubscriptionId ? { clerkSubscriptionId } : {}),
    clerkPlanId: plan.id,
    billingPeriod,
    subscriptionStatus: relayStatus(
      effectiveStatus,
      plan.isDefault,
      isFreeTrial
    ),
    ...(trialStartsAt ? { trialStartsAt } : {}),
    ...(trialEndsAt ? { trialEndsAt } : {}),
    confirmedEditorQuantity: relayPlan === "team" ? 3 : 1,
    includedEditorSeatQuantity: relayPlan === "team" ? 3 : 1,
    purchasedExtraEditorSeatQuantity: 0,
    storageAddonQuantity: 0,
    clerkEventAt: isoDate(
      numberValue(value.updated_at, value.updatedAt),
      eventAtFallback
    ),
  };
}

export function clerkUserIdFromBillingEvent(event: unknown) {
  if (!isRecord(event) || !isRecord(event.data)) return null;
  const data = event.data;
  const payer = recordValue(data.payer);
  const items = arrayValue(data.items, data.subscription_items);
  const itemPayer =
    items
      ?.map((item) => (isRecord(item) ? recordValue(item.payer) : null))
      .find((item): item is Record<string, unknown> => item !== null) ?? null;
  return stringValue(
    payer?.user_id,
    payer?.userId,
    itemPayer?.user_id,
    itemPayer?.userId
  );
}

function canceledItemConfirmation(
  item: Record<string, unknown>,
  eventAtFallback: string
): BillingConfirmation | null {
  const payer = recordValue(item.payer);
  const clerkUserId = stringValue(payer?.user_id, payer?.userId);
  if (!clerkUserId) return null;
  return {
    clerkUserId,
    clerkPlanId: "free_user",
    billingPeriod: null,
    subscriptionStatus: "canceled",
    confirmedEditorQuantity: 1,
    includedEditorSeatQuantity: 1,
    purchasedExtraEditorSeatQuantity: 0,
    storageAddonQuantity: 0,
    clerkEventAt: isoDate(
      numberValue(item.updated_at, item.updatedAt),
      eventAtFallback
    ),
  };
}

export function parseClerkBillingEvent(
  event: unknown,
  eventAtFallback: string
): BillingConfirmation | null {
  if (!isRecord(event) || !isRecord(event.data)) return null;
  const data = event.data;
  const eventType = stringValue(event.type) ?? "";
  const items =
    arrayValue(data.items, data.subscriptionItems) ??
    arrayValue(data.subscription_items) ??
    (eventType.startsWith("subscriptionItem.") ? [data] : undefined);
  if (!items) return null;
  const confirmation = confirmationFromParts(
    data,
    items,
    eventAtFallback,
    eventType.startsWith("subscription.") ? data.id : undefined,
    eventType.startsWith("paymentAttempt.") && data.status === "failed"
      ? "past_due"
      : eventType.startsWith("paymentAttempt.") && data.status === "paid"
        ? "active"
        : data.status
  );
  if (confirmation) return confirmation;
  if (
    eventType.startsWith("subscriptionItem.") &&
    ["canceled", "ended", "abandoned", "expired", "incomplete"].includes(
      stringValue(data.status) ?? ""
    )
  ) {
    return canceledItemConfirmation(data, eventAtFallback);
  }
  return null;
}

export function parseClerkBillingSubscription(
  subscription: unknown,
  eventAtFallback: string,
  requestedUserId: string
): BillingConfirmation | null {
  if (!isRecord(subscription)) return null;
  const items = arrayValue(
    subscription.subscriptionItems,
    subscription.subscription_items
  );
  if (!items) return null;
  return confirmationFromParts(
    subscription,
    items,
    eventAtFallback,
    subscription.id,
    subscription.status,
    requestedUserId
  );
}
