# 03: Add the provider-neutral subscription foundation

**What to build:** Let Relay represent a trusted Razorpay-backed Workspace subscription without exposing Razorpay shapes to product access rules or changing Free behavior.

**Blocked by:** 02: Approve the Razorpay subscription contract.

**Status:** blocked

- [ ] The Workspace subscription projection uses Relay plan, billing, capacity, and lifecycle terms rather than Clerk-specific field names.
- [ ] Provider customer, subscription, plan, payment, and event identifiers remain opaque outside the billing boundary.
- [ ] One server-side entitlement result remains the authority for capabilities, Editor capacity, storage, and billing health.
- [ ] New Workspaces still receive Free safely when no payment record exists.
- [ ] Existing Clerk-era development records are inventoried and classified before migration.
- [ ] The migration widens the model before rewriting records and removes no old field until verification passes.
- [ ] Ownership transfer detaches personal payment authority while preserving Workspace data, members, and storage counters.
- [ ] Public functions reject client-supplied plan, payment, quota, seat, Workspace, and identity authority.
- [ ] Focused migration, ownership, entitlement, and isolation tests pass.
