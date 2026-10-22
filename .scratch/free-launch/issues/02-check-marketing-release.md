# 02: Check marketing release claims and metadata

Status: open; deployed discovery checks pass, release/configuration evidence and copy alignment pending

Implementation follow-up (2026-10-23): PR #122 implements the deletion promise, describes shared-record/background-cleanup limits, adds optional Gemini/OpenAI processing to the provider list, uses one shared support address, and removes obsolete roadmap-token setup instructions. Marketing build/typecheck and both server checks pass. Production release evidence and the live publication check remain open. The current app CSP blocks the backend's secure upload endpoint until the matching app build is published. Cloudflare account sign-in is needed to repair its build checks; no production backend push has occurred yet.
Updated: 2026-10-23
GitHub: [#98](https://github.com/screen-gd/Relay/issues/98)
Blocked by: matching release #90; related policy #94 and support #96 checks

## Verified over HTTP

- [x] Home, Features, Pricing, About, and Privacy & Data respond with 200 and self-canonical/Open Graph URLs on `web.relay-app.cc.cd`. Social image URLs use that host.
- [x] `robots.txt`, `sitemap.xml`, `llms.txt`, and `llms-full.txt` respond with 200 and use the marketing origin for public discovery links.
- [x] Product and legal links use `relay-app.cc.cd`; `/waitlist` reaches the app and its final response is 200.
- [x] `/roadmap` and a nonexistent route return genuine 404s. Roadmap removal #112 is merged on main at `e3f34053601edda53f8c32ac6c79209557c32db3`; no roadmap token is required.
- [x] Pricing labels Creator and Team unavailable and uploads coming soon. The Free offer excludes hosted uploads and Team seats. Source paid-plan purchase controls are disabled.
- [x] No AI feature claims were found in the checked marketing pages or source. BYOK disclosure remains required wherever AI is advertised; provider transparency is tracked in #94.
- [x] The existing marketing-origin isolation/normalization test passes: `node --test apps/website/scripts/check-marketing-origin.test.mjs`.

## Remaining checks and corrections

- [ ] Record the intended marketing build environment and matching deployed revision with #90. Source settings and served URLs are correct, but the hosting build dashboard was not inspected and the deployed commit was not established.
- [ ] Align the live homepage's client-approval promise with the matching app/Convex release. Implementation remains in open PR #122.
- [ ] Resolve the complete-deletion promise mismatch and omitted AI providers described in [the #94 check](01-check-byok-policy.md).
- [ ] Confirm marketing/app contact routing in #96.
- [ ] Remove the stale roadmap/token instructions from `apps/website/.env.example` when making the copy/configuration correction.

The public documents were read through HTTP. No deployment, source-code change, signed-in browser journey, email send, or search indexing verification was performed. Keep #98 open and do not add an automatic closing link yet.

Back to the [Free launch map](../map.md).
