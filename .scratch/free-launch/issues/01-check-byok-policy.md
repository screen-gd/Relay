# 01: Check BYOK privacy and terms

Status: open; copy implemented, publication and operational verification pending

Implementation follow-up (2026-10-23): the deletion promise is implemented in PR #122 with background cleanup, immediate portal revocation, storage retry/recovery, upload ownership checks, and preserved shared Client/Salary history. Five independent-review findings were fixed and cleared in a second review. Marketing provider descriptions and app/site support addresses now agree. Nine deletion tests are part of the 311 passing Convex tests. The policy copy describes these boundaries. Coordinated app/backend publication, actual backup/log retention, mail delivery and Screen's policy review remain open; the live CSP must allow the new HTTP upload endpoint before the backend switch.
Updated: 2026-10-23
GitHub: [#94](https://github.com/screen-gd/Relay/issues/94)
Implementation: [PR #109](https://github.com/screen-gd/Relay/pull/109) and [PR #122](https://github.com/screen-gd/Relay/pull/122)
Blocked by: matching release #90, contact verification #96, retention/recovery evidence #97, Screen's policy review

## Evidence

- PR #109 contains BYOK data categories, Owner consent/key permissions, encrypted key storage, provider billing, run limits, human review, and October 21 policy dates.
- Read-only HTTP checks still find October 2 on the public privacy policy and June 1 on the public terms, with no BYOK/Gemini/OpenAI section. Source completion is not publication.
- `aiCredentials.ts` encrypts credentials with AES-GCM, authorizes the active Workspace Owner, and deletes the stored credential on removal. `aiRuns.ts` rechecks consent/access and preserves saved runs when AI is disabled. `aiGeneration.ts` sets OpenAI `store: false`.
- `node ../../node_modules/vitest/vitest.mjs run --config vitest.config.mts convex/aiCredentials.test.ts convex/aiRuns.test.ts`, from `apps/web`, passes 24 tests across both files. Providers are mocked; this does not verify a production provider account.

## Original findings, fixed in PR #122

**Project deletion exceeded the cloud operation.** The original `projects.remove` deleted only the Project document, while the trust page and confirmation promised related-data removal. PR #122 replaces this with durable cleanup and states its limits. Nine tests and the second independent review cover the fixes; production publication and verification remain pending.

**Provider/contact descriptions differed.** PR #122 adds optional Gemini/OpenAI processing to the trust page and uses the existing shared support address in both apps. Delivery and reply routing remain unverified.

## Remaining checks

- [x] Implement Project cleanup and align source promises with locally verified behavior.
- [ ] Confirm the production deletion procedure and actual backup/log retention.
- [x] Align the marketing provider list with the BYOK copy for owner review.
- [x] Use the existing shared support address in app and marketing source.
- [ ] Confirm receipt/reply behavior in #96.
- [ ] Obtain Screen's review of the policy copy.
- [ ] Publish the approved release through #90 and recheck public policy dates/content.

The initial audit was read-only; PR #122 now contains the source fixes and regression tests. Production data, hosting configuration, email routing and provider accounts have not been changed. No automatic closing link is configured for #94.

Back to the [Free launch map](../map.md).
