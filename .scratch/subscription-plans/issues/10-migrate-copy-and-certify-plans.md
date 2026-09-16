# 10: Remove old plans and certify the launch model

**What to build:** Certify the September 18 Free-only release. Keep purchases disabled, make release copy match Free capabilities, hide Clerk billing controls, and verify signed-in Free journeys and negative paid-feature access. Razorpay payments are post-launch work.

**Blocked by:** Free paywall enforcement and authenticated release verification. Paid checkout, Client Hub/branding, Team sales, extra seats, and storage add-ons do not block Free launch.

**Status:** in-progress (Free-only release certification)

## Current release acceptance criteria

- [x] Public and in-app launch copy explicitly says Free-only; no active Clerk purchase or billing-repair prompts are shown on the subscription surface.
- [ ] Signed-in Free onboarding, Projects, Clients, standard portals, reviews/delivery, and external embeds work.
- [ ] Paid capabilities stay blocked on the server and in the interface.
- [ ] The deployed purchase flag is disabled and public authentication is verified.
- [ ] Deployment is separately approved and the public Free journeys pass smoke tests.

## Historical paid-launch checklist (deferred to Razorpay)

Free-only UI pass: removed the subscription PricingTable and manual Clerk sync
controls rather than relying on the purchase environment flag. Eleven focused
component tests pass, including an Owner with a stale true purchase flag and a
missing/unknown Owner. App and website typechecks pass. The actual subscription
component rendered in a temporary local browser fixture with HTTP 200 and no
purchase controls; the fixture was removed. This does not certify signed-in
journeys or live Clerk account settings.

- [ ] Active product copy shows only Free, Creator, and Team with approved monthly, annual, trial, storage, and seat terms.
- [ ] Studio and the old Creator and Studio prices no longer appear in active UI, tests, entitlements, or Clerk configuration.
- [ ] The marketing site lists only capabilities that have passed their implementation tickets.
- [ ] Upgrade prompts identify the exact capability and correct target plan.
- [ ] Free, Creator trial, paid Creator, base Team, expanded Team, and over-limit downgrade journeys pass end to end.
- [ ] Owner, Editor, Viewer, Client Contact, and unrelated-user access match the plan document.
- [ ] Storage totals, Editor quantities, add-on quantities, Clerk subscription state, and Convex entitlements agree after reconciliation.
- [ ] Repository checks find no stale Organization Billing assumption or Studio entitlement.
- [ ] Type checking, relevant tests, application build, focused browser checks, and full repository verification pass.
- [ ] Production deployment, live Clerk plan changes, live Convex migration, and R2 enablement remain separately approved operations.

## September 16 scope

The product plan document now distinguishes approved Free/Creator offers from
deferred Team, extra seats, and storage packs. Capability prompts name the paid
feature and Creator target. Purchase controls fail closed when Owner authority is
unknown and remain disabled under the purchase flag. Local component rendering
and signed-out route checks are evidence only for those states, not proof of live
checkout or signed-in Client Hub behavior.

The complete launch checklist remains open until supported production Stripe,
live Clerk prices/trial, the signed webhook, deployment authorization, and real
end-to-end journeys are verified. The public-login issue #29 also needs a current
production check before launch.
