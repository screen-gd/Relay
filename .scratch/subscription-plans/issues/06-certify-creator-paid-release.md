# 06: Certify the Creator paid release

**What to build:** Remove the abandoned Clerk Billing path and prove the approved Creator offer works end to end before any public paid release.

**Blocked by:** 04: Launch Creator with Razorpay. 05: Certify the Creator client experience.

**Status:** blocked

- [ ] Active application and marketing copy contains only approved Free and Creator terms.
- [ ] No active code, configuration, test, or support control treats Clerk Billing or Stripe as a payment authority.
- [ ] Every migrated subscription record has a verified provider and Workspace mapping, or an explicit manual-review state.
- [ ] Free, checkout-pending, trial if approved, paid Creator, payment-failed, canceled, recovered, and downgraded journeys pass end to end.
- [ ] Owner, Workspace member, Client Contact, signed-out user, and unrelated user receive the correct access.
- [ ] Razorpay subscription state and Convex entitlements agree after webhook delivery and reconciliation.
- [ ] Type checking, relevant tests, production builds, full repository verification, and focused browser checks pass.
- [ ] Production plans, credentials, webhooks, migration, and deployment receive separate approval before execution.
