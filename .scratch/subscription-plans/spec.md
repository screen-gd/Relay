# Free launch and Razorpay subscriptions

Status: Free usability only; Razorpay work deferred until Screen creates an account
Date: 2026-09-17

## Problem Statement

Relay is launching with Free only. The repository still contains planning and
implementation assumptions from an abandoned Clerk Billing and Stripe approach.
Those assumptions make it unclear what must ship now, what is deferred, and which
system will own paid subscription state later.

Relay needs one current plan that keeps the Free launch small and safe, then adds
paid plans through Razorpay without trusting the browser, weakening Workspace
access controls, or losing data during billing changes.

## Solution

Ship Free with every purchase path disabled. Clerk remains the authentication
provider, Convex remains the authority for Workspace entitlements, and Razorpay
becomes the future payment provider.

Before paid work starts, verify the Razorpay account, market, currency, recurring
payment, trial, tax, refund, cancellation, and webhook constraints. Record the
approved commercial terms instead of carrying old Clerk and Stripe assumptions
forward.

Add Razorpay through a provider-neutral subscription boundary. Razorpay confirms
payments and subscription lifecycle events. Convex stores the trusted projection
used by the product. The browser may start checkout and display status, but it
cannot grant a plan, storage, seats, or capabilities.

## User Stories

1. As a new user, I want to use Relay Free without entering payment details, so that I can complete basic solo work.
2. As a Free owner, I want clear limits, so that blocked paid capabilities do not look broken.
3. As a Free owner, I want paid checkout hidden until it is supported, so that I cannot enter an abandoned purchase flow.
4. As an operator, I want deployment configuration to keep purchases disabled, so that unfinished billing code cannot become public accidentally.
5. As an owner, I want only my Workspace billing state to affect my Workspace, so that another customer's events cannot change my access.
6. As a future Creator customer, I want a Razorpay checkout that shows the approved price and terms, so that I know what I am buying.
7. As a future paid customer, I want Relay to wait for trusted payment confirmation, so that a redirect or browser request cannot grant access.
8. As a future paid customer, I want payment changes to settle predictably, so that renewals, failures, cancellations, and recovery produce clear access.
9. As a Workspace member, I want the Workspace plan to apply to me, so that I do not need a personal subscription.
10. As an owner, I want a downgrade to preserve files and members, so that billing never destroys work.
11. As an over-limit owner, I want existing data to remain readable while new over-limit actions are blocked, so that I can recover safely.
12. As an operator, I want duplicate and out-of-order webhooks to be harmless, so that retries cannot corrupt subscription state.
13. As an operator, I want reconciliation against Razorpay, so that missed webhooks can be repaired.
14. As a contributor, I want payment-provider details behind one boundary, so that product access rules do not depend on Razorpay response shapes.
15. As a contributor, I want the old Clerk Billing paths removed after migration, so that there is one payment authority.

## Implementation Decisions

- Free is the only launch offer. Creator, Team, extra Editor seats, and Storage Add-ons remain unavailable until their tickets pass.
- Clerk provides identity only. Do not configure or expose Clerk Billing or Stripe checkout.
- Razorpay is the selected future payment provider, subject to the capability and commercial review in the first post-launch ticket.
- Convex owns the Workspace subscription projection and resolves product entitlements from confirmed server-side state.
- Keep one entitlement result for plan capabilities, billing health, Editor capacity, retained storage, and Storage Quota.
- Public functions derive identity and Workspace membership on the server. They never accept plan, payment, quota, seat, or user authority from the caller.
- Model the internal subscription around Relay concepts rather than provider field names. Store opaque provider customer, subscription, plan, payment, and event identifiers only where reconciliation requires them.
- Grant paid access only after a verified Razorpay event or an authenticated server-side reconciliation confirms the state.
- Process webhook delivery IDs atomically with projection changes. Reject stale events and make retries idempotent.
- Treat checkout completion as pending until Convex confirms the subscription.
- Preserve files and members on payment failure or downgrade. Block only new operations that exceed confirmed capacity.
- Migrate the current Clerk-specific projection with an expand, migrate, verify, and contract sequence. Do not delete the old fields until every active record is classified and the new projection is verified.
- Do not carry the old prices, trial, Team-seat, or Storage Add-on terms into checkout until the Razorpay review explicitly approves them.
- Client Contacts remain separate from internal Workspace seats.
- Live deployment, payment configuration, webhook secrets, and data migration require separate authorization.

## Testing Decisions

- Test behavior through public Convex functions, the webhook boundary, and rendered subscription flows rather than private helpers.
- Prove Free access and paid denials with signed-in Owner, Editor, Viewer, Client Contact, and unrelated-user cases where applicable.
- For Razorpay, cover valid and invalid signatures, duplicate delivery IDs, out-of-order events, missed-event reconciliation, timeouts, and unsupported states.
- Cover checkout pending, activation, renewal, cancellation, payment failure, recovery, upgrade, downgrade, and ownership transfer.
- Prove that a browser redirect, client-supplied identifier, or event for another customer cannot grant access.
- Reuse the existing entitlement, billing ownership, subscription lifecycle, Team, storage, portal, and salary test seams.
- Run focused tests after each ticket. Run type checking, production builds, and signed-in browser checks before either Free or paid release certification.

## Out of Scope

- Enabling purchases for the Free launch.
- Connecting Stripe or Clerk Billing.
- Publishing unapproved prices, trials, seat charges, or Storage Add-on terms.
- Relay-generated invoices or client payment collection.
- Automatic deletion of files or members because of billing state.
- Production deployment, live payment changes, live migration, or R2 enablement without separate approval.

## Further Notes

- The durable product offer is documented in the subscription plan document. This spec controls implementation order and safety.
- Ticket 01 is the only launch-critical ticket. Tickets 02 onward are post-launch Razorpay work.
- Screen owns live-account testing. Continue local Free-usability work without
  requesting live-account access. Keep unverified release checks open.
- Do not resume paid-plan work until Screen creates a Razorpay account and asks
  to continue. The existing research is reference material, not an approved contract.
- If the Razorpay review cannot support the required recurring model safely, stop after the review and revise the paid offer before implementation.
