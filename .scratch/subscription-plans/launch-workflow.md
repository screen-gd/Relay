# Subscription launch workflow

Target: public launch by September 18, 2026.
Status: Free-only release selected; future payments use Razorpay.

## Approved scope

Launch Free only on September 18. Preserve Free limits; do not grant Creator or
Team access as part of this decision. Razorpay is the future payment provider;
Clerk remains authentication. Stripe/Clerk Billing setup is no longer a launch
dependency. Do not enable purchases, configure payment webhooks, or start the
Razorpay integration during the Free launch pass.

## Remaining release work

1. Verify signed-in Free journeys: onboarding, Projects, Clients, standard portals,
   reviews/delivery, external embeds, and negative paid-feature access.
2. Make public and in-app release copy clearly Free-only; remove Clerk purchase
   promises and hide Clerk billing repair controls from the Free launch UI.
3. Recheck public authentication issue #29 and verify deployment configuration
   keeps purchases disabled. Local `.env.production` and `.env.example` are false;
   `.env.local` leaves the flag unset, which disables it by default.
4. Deploy only with explicit approval, then smoke-test the public Free journeys.
5. After launch, scope Razorpay account/currency eligibility, recurring billing,
   trials, signed webhooks, reconciliation, and migration away from Clerk billing.

## Completed implementation pass

1. Close ticket 01 ownership-transfer authority locally. Detach the former billing
   owner, preserve storage counters and members, and require the new owner to
   repair billing. Verify unauthorized transfers and former-owner events fail.
2. Complete the Free/Creator portion of ticket 09 without waiting for deferred
   tickets 06–08: atomic delivery deduplication, bounded trusted reconciliation,
   lifecycle semantics, and focused backend tests. Task 1 uses Luna High.
3. Audit ticket 03 paywalls and finish ticket 10 launch copy in parallel. Keep
   deferred offers unavailable, use capability-specific upgrade prompts, and
   verify the rendered UI. Task 2 uses Luna High and owns frontend files only.
4. Review the combined diff, run the affected Convex and frontend tests, then run
   one final typecheck and app build. Record browser evidence separately from
   mocked test coverage. Do not mark ticket 05 browser checks complete without
   an authenticated run.
5. Paid checkout certification is deferred and must be redone for Razorpay.

## Budget controls

Use two bounded Luna High implementers, with separate file ownership on the
existing checkout. No parallel git operations. Each task does one focused pass
and targeted verification, reports concrete blockers early, and avoids broad
refactors and repeated full builds. The coordinator owns integration and the
final combined checks. This limits duplicated work; it is not a metered token cap.

## Ticket disposition

| Ticket | Work in this pass                                    | Remaining gate                                   |
| ------ | ---------------------------------------------------- | ------------------------------------------------ |
| 01     | Billing-owner transfer safety complete               | Verified locally                                 |
| 02     | Deferred; replace Clerk checkout scope with Razorpay | Post-launch provider design and verification     |
| 03     | Discovered paywall gaps closed                       | Verified locally                                 |
| 04     | Existing quota implementation preserved              | Storage regression tests passed                  |
| 05     | Paid Client Hub/branding deferred                    | Post-launch authenticated browser evidence       |
| 06     | Preserve existing Team enforcement                   | Approved Team sales model                        |
| 07     | Deferred                                             | Approved recurring extra-seat model              |
| 08     | Deferred                                             | Cost review, R2 approval, add-on model           |
| 09     | Existing Clerk reliability code verified locally     | Post-launch Razorpay adaptation and verification |
| 10     | Free-only launch copy and certification              | Signed-in Free journeys and deployment gates     |

## Final local verification

Free-only follow-up: the subscription UI no longer mounts checkout or Clerk sync
controls, even with a stale true purchase flag. Eleven focused component tests,
app and website typechecks, and both production builds passed. The actual Free-only
component rendered successfully in Chromium; its temporary fixture was removed.
Luna Task 3 hit its subscription limit before editing, so the coordinator completed
this bounded pass without spawning replacement agents. Live authenticated journeys
and deployment remain unverified.

September 16: 81 focused Convex tests across 13 files and 20 subscription UI/helper
tests across three files passed. Typechecking, the MUI boundary check, production
Next.js build, and `git diff --check` passed. The local subscription page returned
200 and remained account-gated. A temporary fixture rendered the real Creator
paywall component with app CSS; the fixture was removed afterward.

No live checkout, signed-in Client Hub journey, production deployment, live plan
change, R2 enablement, commit, push, or PR was performed. The owner subsequently
selected Free-only launch and Razorpay, removing Stripe setup from the release path. Tasks used Luna High,
with one bounded Luna Xhigh correction for billing authority and replay safety.
