# 02: Approve the Razorpay subscription contract

**What to build:** Produce an evidence-backed decision for the Razorpay account, commercial offer, and lifecycle that Relay can safely implement.

**Blocked by:** Screen creates a Razorpay account and resumes paid-plan work.

**Status:** deferred by Screen; documentation review retained for later

- [ ] Verify the intended business account, launch countries, settlement currency, customer currency, and supported payment methods.
- [ ] Verify recurring subscription support, plan changes, quantities, trials, cancellations, refunds, taxes, invoices, and customer self-service against current Razorpay documentation and a test account.
- [ ] Record the approved Creator price, billing periods, trial terms, cancellation policy, and refund policy.
- [x] Record whether Team, extra Editor seats, and Storage Add-ons are approved offers or remain deferred.
- [x] Define the checkout, return, webhook, reconciliation, and customer-support journeys.
- [x] Define the authoritative Razorpay objects and opaque identifiers that Relay must retain.
- [x] Define signature verification, delivery deduplication, event ordering, retry, timeout, and reconciliation rules.
- [x] Document failure states that require manual review instead of guessing an entitlement.
- [x] Confirm that no production credential, webhook, plan, or charge is created without separate approval.

## Evidence (2026-09-17)

See [Razorpay contract review](../razorpay-contract-review.md) for the capability
matrix, primary documentation links, proposed journeys, retained identifiers,
failure rules and unresolved approval table. Definitions are complete as a
proposal, not approved commercial terms or tested integration.

The docs support plan-based recurrence but constrain live plan changes to cards.
Quantity multiplies the whole plan price. The FAQ marks Add-ons deprecated while
API examples still show upfront add-ons; recurring storage and extra-seat billing
must not be inferred from those examples. Country-dependent currency and method
documentation needs account-specific confirmation.

No test account was verified. Business entity, target countries, currency,
Creator price/periods, trial, tax treatment, cancellation and refund policy remain
unapproved. Removed obsolete paid prices and trial promises from the product
document rather than carrying them into Razorpay. Team, seats and Storage
Add-ons remain deferred. No production or test payment objects were created.

Ticket 03 remains blocked until the account evidence and a concrete versioned
commercial contract are approved. Tickets 07–10 remain deferred.
