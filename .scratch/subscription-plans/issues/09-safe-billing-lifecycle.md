# 09: Handle billing changes without data loss

**What to build:** Make trials, renewals, cancellations, failed payments, plan changes, ownership transfers, and missed Clerk events settle into one safe Workspace state. Relay preserves files and members while blocking only actions that exceed the confirmed plan.

**Blocked by:** 03: Enforce Creator feature access. 06: Launch Team with correct seat rules. 07: Sell extra Editor Seats. 08: Sell 50 GB Storage Add-ons.

**Status:** in-progress (base-plan implementation complete; launch certification pending)

- [x] The webhook route verifies Clerk signatures and rejects spoofed events.
- [x] Convex deduplicates every delivery and handles supported events idempotently.
- [x] Out-of-order events cannot replace a newer confirmed subscription state.
- [x] A bounded reconciliation path reads the current Clerk User subscription when webhook state is late or missing.
- [ ] Trial end, cancellation, past due, failed renewal, paid recovery, upgrade, and downgrade resolve to documented entitlements.
- [x] Downgrades never delete files or Team Members.
- [x] Over-quota Workspaces keep read access but cannot upload until compliant.
- [x] Over-seat Workspaces keep existing members but cannot invite or promote Editors until compliant.
- [x] Ownership transfer detaches the former Owner's billing link, preserves Workspace data, requires the new Owner to complete authenticated repair before relinking billing to the new Owner's Clerk user, and neither transfers nor cancels the former Owner's external paid subscription.
- [ ] Tests cover retries, replays, missed events, reconciliation, state ordering, and every lifecycle transition.
- [ ] Type checking, billing-event tests, and relevant Convex tests pass.

Do not configure the production webhook until checkout resumes.

## September 16 implementation

The Free/Creator safety subset does not depend on selling deferred Team seats or
storage packs. Verified deliveries are recorded in the same mutation as their
projection update. Item/payment events fetch the authoritative User subscription
instead of granting or revoking access from a single item. Full subscription
events reject stale updates. Upcoming and ended items cannot inherit paid access
from an active parent subscription.

Owners can use Retry billing sync, which repairs their identity link and queries
Clerk with a five-second timeout. The endpoint checks Owner authority before the
external call and rejects an explicit mismatched response user. An opaque Clerk
payer ID is not treated as a user ID. Transfer detaches the former billing user,
preserves data, and requires the new Owner to repair; it does not transfer or
cancel the former Owner's external paid subscription.

Mocked action tests cover authorization, authoritative item reconciliation,
opaque payer IDs, mismatched users, missing subscriptions, timeout, and transfer
during reconciliation. Live Clerk lifecycle, automatic checkout-return recovery,
Team/add-on transitions, and production certification remain unchecked.
