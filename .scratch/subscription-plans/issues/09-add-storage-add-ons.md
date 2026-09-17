# 09: Add Storage Add-ons

**What to build:** Let an eligible paid owner buy an approved recurring storage quantity through Razorpay after the storage economics and hosting path are proven.

**Blocked by:** 06: Certify the Creator paid release. The Storage Add-on offer, cost gate, and hosting model must also be approved in ticket 02.

**Status:** deferred

- [ ] A recorded Convex and object-storage cost review approves the pack size and public price.
- [ ] Creator and Team owners can buy only the approved quantities and billing periods.
- [ ] Free cannot buy storage without an eligible paid base plan.
- [ ] Only the Workspace owner can change the quantity.
- [ ] Confirmed active quantity changes the Storage Quota by exactly the approved amount.
- [ ] Client input, redirects, incomplete payments, and failed charges cannot raise quota.
- [ ] Reducing quantity never deletes files; it blocks new uploads while retained usage exceeds quota.
- [ ] Duplicate and out-of-order events settle on the authoritative Razorpay quantity.
- [ ] Storage, billing-event, reconciliation, cost-gate, and signed-in browser checks pass.
