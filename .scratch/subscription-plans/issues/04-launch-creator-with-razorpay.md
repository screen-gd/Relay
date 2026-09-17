# 04: Launch Creator with Razorpay

**What to build:** Let an eligible Workspace owner buy and manage the approved Creator offer through Razorpay, with access granted only from confirmed server-side state.

**Blocked by:** 03: Add the provider-neutral subscription foundation.

**Status:** blocked

- [ ] Only the Workspace owner can start checkout or manage the subscription.
- [ ] Checkout shows only the approved price, billing period, trial, renewal, cancellation, and refund terms.
- [ ] The return journey stays pending until a verified webhook or authenticated reconciliation confirms Creator.
- [ ] Webhook signatures are verified before any event reaches the subscription projection.
- [ ] Event recording and projection changes are atomic, idempotent, and safe under duplicate or out-of-order delivery.
- [ ] Reconciliation reads authoritative Razorpay state with bounded timeout and strict customer-to-Workspace matching.
- [ ] Cancellation, payment failure, recovery, upgrade, and downgrade produce the documented entitlements without deleting data.
- [ ] Creator capabilities use the shared entitlement result and cannot be unlocked by browser input or redirect parameters.
- [ ] Focused backend, component, and signed-in browser checks cover purchase, pending, activation, failure, recovery, cancellation, and signed-out behavior.
