# 01: Certify the Free launch

**What to build:** Release Relay with Free as the only available plan, no purchase surface, and verified access to the promised solo workflow.

**Blocked by:** None (can start immediately).

**Status:** local implementation and automated verification complete in PRs #109 and #122; merge and live-account verification pending

Updated: 2026-10-23. See the [current issue status](../../free-launch/map.md) for GitHub links, remaining launch work, and deferred features.

- [x] Public and in-app subscription copy says the launch is Free-only and exposes no Clerk Billing, Stripe, or checkout controls.
- [ ] A signed-in owner can complete onboarding, Projects, Clients, standard Client Portals, Reviews, delivery, External Video Embeds, and Salary Plans.
- [ ] Paid capabilities stay blocked in both the interface and public server functions.
- [ ] The deployed purchase configuration is disabled and public authentication works.
- [ ] Deployment receives separate approval before release.
- [ ] The deployed Free journeys pass focused smoke tests after deployment.

## Current tracking (2026-10-23)

- [PR #109](https://github.com/screen-gd/Relay/pull/109) contains the Quartz UI, monorepo, shared plans, and BYOK policy copy. Merge it before [PR #122](https://github.com/screen-gd/Relay/pull/122).
- PR #122 implements client approval and version locking (#103), account-free review and version history (#115), draw-on-frame feedback (#104), stage assets (#107), and the PDF import availability guard (#93).
- PR #122 targets `main` and has closing links for all five issues. GitHub issues stay open until merge; implementation is not a production release.
- The implementation handoff reports 302 Convex tests and 315 unit tests passing, plus type checking, the MUI allowlist, design check, CSP test, and app production build. These checks were not rerun for this tracking-only update.
- Screen still owns the phone approval/notification/history check, phone-to-desktop annotation check, stage-asset visibility check, and deployed Free journeys. The PDF launch decision and any live R2 bucket/CORS/cleanup verification remain open. R2-hosted stage assets do not appear in the portal yet.
- GitHub launch issues #88, #90, #91, #92, #94, #95, #96, #97, and #98 remain open. Local paid-plan tickets 02-10 and client-payment issues #116-#121 remain deferred.

## Historical local evidence (2026-09-17)

Existing subscription and Salary Plan implementation was preserved. Added
`convex/freeLaunch.test.ts` to exercise public functions with mocked signed-in
identities; this is not a live Clerk session or deployed backend verification.

- [x] A newly created Free Workspace owner creates Clients, a Project, an
      External Video Embed, a standard portal, a review comment, its resolution,
      delivery and a Salary Plan. An unrelated user cannot read the Project or
      change its stage/Salary Plan; an unauthenticated user cannot mutate the plan.
- [x] Free public functions reject custom template writes through both settings
      APIs, branding, Client Hub contacts/publication and Editor/Reviewer invites.
      A claimed paid Clerk token does not change Convex's Free entitlements.
- [x] Retained Editor/Reviewer members cannot manage owner billing, Salary Plans
      or branding. A retained Client Contact cannot see a Free Workspace's Client
      Hub publication. Members and contacts remain stored. `Reviewer` is the current
      server role name; the product document calls the non-paying role Viewer.
- [x] Existing tests prove Free hosted-upload creation/save denials, storage
      preservation, project/portal access, Salary Batches and subscription isolation.
- [x] Rendered subscription tests show no checkout or Clerk sync controls even
      with a stale purchase-enable flag, and no grant from a checkout redirect.
- [x] Repository type checking, MUI import allowlist and a local Next production
      build pass. No build output was deployed.

Final focused run: 77 backend tests in 12 files, including all three new Free
tests and the review-comment suite; 42 component/library tests in
`vitest.workspace-page.config.ts`. All passed. Commands use
`node node_modules/vitest/vitest.mjs run ...`,
`node node_modules/typescript/bin/tsc --noEmit`,
`node scripts/check-mui-allowlist.mjs`, and
`node node_modules/next/dist/bin/next build` because the device's pnpm shim
resolves Corepack to an invalid Windows path. No package configuration changed.

Review follow-up: a fourth Free test now delivers a Salary Plan-linked Project,
verifies the completed Salary Batch retains its original terms after a plan edit,
and proves only its owner can record receipt. The focused Free, Salary Plan,
Salary Plan access and subscription run passed 21 tests; type checking passed.

## Checks deliberately left open

The signed-in journey and complete interface-denial criteria above remain open.
Automated API identities and server-rendered component tests do not prove live
onboarding, browser interactions or authentication. Advanced reports are computed
in the interface from otherwise-readable Project data; there is no dedicated
paid report server endpoint to test. Their interface gate needs browser proof.

The browser tool reported no attached Chrome runtime. The existing Playwright
global setup can create a Clerk user, and cloud workflow tests write to the
configured backend, so they were not run without a confirmed test target and
authorized test identity. Do not substitute sample/local-only mode for signed-in
Free certification.

`wrangler.jsonc` and `.env.example` declare purchases disabled, but live values
were not inspected. No live authentication, configuration, deployment, data
migration or post-deploy smoke test is claimed. Screen will perform live-account
testing and report the results. These checks remain open until that evidence is
available; they do not block further local Free-usability work. Deployment still
requires separate explicit approval. No release approval has been granted.
