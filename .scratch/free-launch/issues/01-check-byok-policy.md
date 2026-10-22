# 01: Check BYOK privacy and terms

Status: open; copy implemented, publication and operational verification pending

Implementation follow-up (2026-10-23): the deletion promise is implemented in PR #122 with background cleanup, immediate portal revocation, storage retry/recovery, upload ownership checks, and preserved shared Client/Salary history. Five independent-review findings were fixed and cleared in a second review. Marketing provider descriptions and app/site support addresses now agree. Nine deletion tests are part of the 311 passing Convex tests. The policy copy describes these boundaries. Coordinated app/backend publication, actual backup/log retention, mail delivery and Screen's policy review remain open; the live CSP must allow the new HTTP upload endpoint before the backend switch.
Updated: 2026-10-23
GitHub: [#94](https://github.com/screen-gd/Relay/issues/94)
Implementation: [PR #109](https://github.com/screen-gd/Relay/pull/109)
Blocked by: matching release #90, contact verification #96, retention/recovery evidence #97, Screen's policy review

## Evidence

- PR #109 contains BYOK data categories, Owner consent/key permissions, encrypted key storage, provider billing, run limits, human review, and October 21 policy dates.
- Read-only HTTP checks still find October 2 on the public privacy policy and June 1 on the public terms, with no BYOK/Gemini/OpenAI section. Source completion is not publication.
- `aiCredentials.ts` encrypts credentials with AES-GCM, authorizes the active Workspace Owner, and deletes the stored credential on removal. `aiRuns.ts` rechecks consent/access and preserves saved runs when AI is disabled. `aiGeneration.ts` sets OpenAI `store: false`.
- `node ../../node_modules/vitest/vitest.mjs run --config vitest.config.mts convex/aiCredentials.test.ts convex/aiRuns.test.ts`, from `apps/web`, passes 24 tests across both files. Providers are mocked; this does not verify a production provider account.

## Findings

**Project deletion promise exceeds the cloud operation.** Class: privacy/correctness. Severity: high. Confidence: confirmed in the reviewed source. Identity: `projects.remove`. Locus: `apps/web/convex/projects.ts:1035`, `apps/web/src/lib/data-context.tsx:2227`, and `apps/website/app/privacy-and-data/page.tsx:98`. The cloud mutation deletes only the Project document. The caller does not cascade removal to related records or storage, and its Activity cleanup is local state. The public trust page and app confirmation promise removal of files, versions, portal and Activity history. Correct that promise or implement and verify the cleanup; deleting a Project must not be counted as proven deletion of its associated data.

**Provider/contact descriptions need alignment.** The marketing trust page omits optional Gemini/OpenAI processing. Marketing publishes `contact@relay-app.cc.cd`, while the app contact page and support documentation use `support@contact.relay-app.cc.cd`. The different addresses may be intentional, but delivery and reply routing were not verified.

## Remaining checks

- [ ] Align deletion promises with verified cloud behavior.
- [ ] Confirm the production deletion procedure and actual backup/log retention.
- [ ] Align the marketing provider list with the approved BYOK copy.
- [ ] Confirm intended contact addresses and receipt/reply behavior in #96.
- [ ] Obtain Screen's review of the policy copy.
- [ ] Publish the approved release through #90 and recheck public policy dates/content.

No source code, production data, hosting configuration, email routing, or provider account was changed. No automatic closing link is configured for #94.

Back to the [Free launch map](../map.md).
