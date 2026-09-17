# 08: Add extra Editor seats

**What to build:** Let a Team owner change an approved recurring Editor quantity through Razorpay, with capacity and storage changing only after trusted confirmation.

**Blocked by:** 07: Launch the Team base plan. The extra-seat model must also be approved in ticket 02.

**Status:** deferred

- [ ] Razorpay charges only for Editors above the included Team capacity using the approved billing-period rules.
- [ ] The app cannot mix incompatible base-plan and seat billing periods.
- [ ] Convex uses only confirmed quantity when allowing invitations or promotions.
- [ ] Each confirmed extra seat changes storage only by the approved amount.
- [ ] Pending invitations reserve capacity without creating duplicate charges.
- [ ] Removing or demoting an Editor changes billing through an idempotent flow and never deletes files.
- [ ] Duplicate, stale, failed, and out-of-order quantity changes cannot over-provision seats or storage.
- [ ] Tests cover quantity increases and decreases, pending invitations, failed changes, reconciliation, and every approved billing period.
