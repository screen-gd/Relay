# Free launch issue status

Updated: 2026-10-23
Status: implementation awaiting merge; launch verification pending

Implementation follow-up: Project deletion now has bounded background cleanup, bound native uploads, original-Workspace storage accounting, retries, confirmed brief-result removal, and stale resource import guards. The second independent review cleared all five findings; 311 Convex tests and 315 unit tests pass. Both app builds, both typechecks, design/MUI checks and marketing tests pass. Production dry runs pass without index deletions. The live app still blocks `*.convex.site` in its CSP, so publish the matching app build before deploying the new upload backend. Cloudflare build repair is waiting for account sign-in.

GitHub repository: [screen-gd/Relay](https://github.com/screen-gd/Relay/issues).
All 25 GitHub issues below are open at this snapshot. Implemented work is not yet deployed.

## Merge order and automatic closure

1. Merge [#109](https://github.com/screen-gd/Relay/pull/109), `design-system/linear-quartz` into `main`.
2. Merge [#122](https://github.com/screen-gd/Relay/pull/122), `feature/portal-approval-stage-assets` into `main`.

PR #122 targets `main` so GitHub recognizes its `Closes` links for #93, #103, #104, #107, and #115. Until #109 merges, #122's diff also includes that PR's changes. No repository default-branch or branch-protection change is required.

The latest verification passes 311 Convex tests and 315 unit tests, both app typechecks and production builds, MUI allowlist, design, CSP and marketing-origin checks. Both Cloudflare builds also pass locally. These checks do not establish live-account behavior.

## Implemented in PR #122

- [#103: Client approve and lock](https://github.com/screen-gd/Relay/issues/103). Server approval/locking, stage transition, notifications, and read-only version history are implemented. Screen's phone check remains: open a PIN link, approve v3, confirm the notification, and read v2.
- [#115: Account-free client review](https://github.com/screen-gd/Relay/issues/115). Version switching, approval, editor identity, viewer log, and link revocation are implemented. Verify the deployed editor/client journey with #95.
- [#104: Draw-on-frame feedback](https://github.com/screen-gd/Relay/issues/104). Pins and strokes are implemented. The phone-to-desktop alignment check remains open.
- [#107: Stage assets](https://github.com/screen-gd/Relay/issues/107). Stage-scoped links/uploads, board counts, and client-visible portal assets are implemented. Verify visible/internal assets in the deployed portal. R2-hosted stage assets do not appear there yet.
- [#93: PDF brief storage or deferral](https://github.com/screen-gd/Relay/issues/93). The PDF option requires R2 configuration; pasted-text import remains available. Screen still owns the launch decision and, if shipping PDF import, live bucket/CORS/upload/cleanup verification. The closing link covers the implementation; these release checks remain pending.

## Launch work still open

These checks remain separate from the five implementation issues' automatic closure.

- [#88: Relay name clearance](https://github.com/screen-gd/Relay/issues/88). Screen's decision remains open.
- [#90: Matching releases](https://github.com/screen-gd/Relay/issues/90). Convex production deployment is authorized, but requires the matching app CSP first. App publication approval and Cloudflare access are pending. No deployment has been performed.
- [#91: Production authentication](https://github.com/screen-gd/Relay/issues/91). Verify Clerk sign-in and Convex identity on the intended release.
- [#92: Workspace BYOK](https://github.com/screen-gd/Relay/issues/92). Configure and verify the intended production encryption key and provider flow.
- [#94: Privacy and terms](https://github.com/screen-gd/Relay/issues/94). [Updated October 23](issues/01-check-byok-policy.md): BYOK copy is in #109; #122 implements cleanup and aligns deletion/provider/contact source copy. Publication, production retention, mail verification and Screen's policy review remain open. No closing link is configured.
- [#95: Editor and client journeys](https://github.com/screen-gd/Relay/issues/95). Verify the deployed revision, including the portal approval, annotations, visibility, and Free limits above. Record the environment and results. Screen owns live-account testing.
- [#96: Support email](https://github.com/screen-gd/Relay/issues/96). Source addresses now agree; verify receipt and replies.
- [#97: Recovery and monitoring](https://github.com/screen-gd/Relay/issues/97). Prove cloud recovery and production monitoring.
- [#98: Marketing promises and metadata](https://github.com/screen-gd/Relay/issues/98). [Updated October 23](issues/02-check-marketing-release.md): live metadata/discovery URLs, app links, missing-page behavior and roadmap removal pass. Source deletion/provider/contact corrections are in #122. Build/release provenance, matching client-approval publication and live copy verification remain open.

## Deferred work

- [#111: Marketing TanStack migration](https://github.com/screen-gd/Relay/issues/111). Reverted at Screen's request; do not treat it as implemented.
- [#108: YouTube publishing and A/B tests](https://github.com/screen-gd/Relay/issues/108). Later.
- [#106: Frame-accurate player](https://github.com/screen-gd/Relay/issues/106). Depends on hosted-upload work; not implemented by #122.
- [#114: Watermarked streamed previews](https://github.com/screen-gd/Relay/issues/114). Requires video processing and delivery work.
- [#113: DaVinci Resolve plugin](https://github.com/screen-gd/Relay/issues/113). Separate plugin work remains open.
- [#116: Project payment milestones](https://github.com/screen-gd/Relay/issues/116). Parked while Free-only.
- [#117: Payment-gated final export](https://github.com/screen-gd/Relay/issues/117). Parked while Free-only.
- [#118: Razorpay and Stripe client payments](https://github.com/screen-gd/Relay/issues/118). Parked while Free-only.
- [#119: Overdue payment reminders](https://github.com/screen-gd/Relay/issues/119). Parked while Free-only.
- [#120: Earnings dashboard](https://github.com/screen-gd/Relay/issues/120). Parked while Free-only.
- [#121: Milestone, deliverable, and CRM flow](https://github.com/screen-gd/Relay/issues/121). Parked while Free-only.

## Local subscription tickets

[Ticket 01](../subscription-plans/issues/01-certify-free-launch.md) records Free-launch evidence and the remaining release checks. [The subscription spec](../subscription-plans/spec.md) retains the future paid-plan decisions. Tickets 02-10 remain deferred until Screen creates a Razorpay account and asks to resume; their dependency order remains unchanged.
