import { httpRouter } from "convex/server";
import { verifyWebhook } from "@clerk/backend/webhooks";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import {
  clerkUserIdFromBillingEvent,
  parseClerkBillingEvent,
} from "./billingParsing";

type WaitlistAudience = "freelancer" | "team";

interface WaitlistInput {
  name: string;
  email: string;
  audience: WaitlistAudience;
}

const headers = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), { status, headers });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseWaitlistInput(value: unknown): WaitlistInput | null {
  if (!isRecord(value)) return null;

  const name = typeof value.name === "string" ? value.name.trim() : "";
  const email =
    typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const audience = value.audience;
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    name.length < 2 ||
    name.length > 80 ||
    email.length > 254 ||
    !validEmail.test(email) ||
    (audience !== "freelancer" && audience !== "team")
  ) {
    return null;
  }

  return { name, email, audience };
}

const http = httpRouter();

http.route({
  path: "/api/clerk-billing",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    if (!signingSecret) return json({ kind: "not_configured" }, 500);

    let event;
    try {
      event = await verifyWebhook(request, { signingSecret });
    } catch {
      return json({ kind: "invalid_signature" }, 400);
    }

    const deliveryId = request.headers.get("svix-id")?.trim();
    if (!deliveryId) return json({ kind: "invalid_delivery_id" }, 400);
    const webhookTimestamp = Number(request.headers.get("svix-timestamp"));
    if (!Number.isFinite(webhookTimestamp))
      return json({ kind: "invalid_timestamp" }, 400);
    const eventAtFallback = new Date(webhookTimestamp * 1000).toISOString();
    const receivedAt = new Date().toISOString();
    if (
      event.type.startsWith("subscriptionItem.") ||
      event.type.startsWith("paymentAttempt.")
    ) {
      const clerkUserId = clerkUserIdFromBillingEvent(event);
      if (clerkUserId) {
        const result = await ctx.runAction(
          internal.workspaceSubscriptionReconciliation
            .reconcileClerkUserDelivery,
          {
            deliveryId,
            eventType: event.type,
            clerkUserId,
            receivedAt,
          }
        );
        return json({ kind: result }, 200);
      }
    }
    const confirmation = parseClerkBillingEvent(event, eventAtFallback);
    const result = await ctx.runMutation(
      internal.workspaceSubscriptions.processClerkBillingDelivery,
      {
        deliveryId,
        eventType: event.type,
        clerkUserId: confirmation?.clerkUserId,
        receivedAt,
        ...(confirmation ? { confirmation } : {}),
      }
    );
    return json({ kind: result }, 200);
  }),
});

http.route({
  path: "/api/waitlist",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const proxySignature = request.headers.get("x-relay-proxy-signature");
    if (
      !process.env.WAITLIST_PROXY_SECRET ||
      proxySignature !== process.env.WAITLIST_PROXY_SECRET
    ) {
      return json({ kind: "unauthorized" }, 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ kind: "invalid_request" }, 400);
    }

    const input = parseWaitlistInput(body);
    if (!input) return json({ kind: "invalid_request" }, 400);

    const result = await ctx.runMutation(internal.waitlist.join, input);
    return json(result, result.kind === "joined" ? 201 : 200);
  }),
});

export default http;
