# Tests and the October 2026 cleanup

Tests should fail when useful product behavior breaks, rather than when wording,
CSS classes, file organization, or implementation details change.

## What the suites do

| Suite                       | Before | After | What it protects                                                                                                                                                                                                     |
| --------------------------- | -----: | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests (`src`)          |     86 |    70 | Project validation, sorting and filters, delivery accounting, backups, settings updates, telemetry consent and redaction, provider configuration, current video rendering and comments.                              |
| Convex tests                |    117 |   117 | Real backend queries and mutations against an isolated test database: permissions, workspace isolation, billing, storage quotas, salary batches, published client data, portal PINs and expiry, and comment history. |
| CSP tests                   |      2 |     2 | The security policy permits Stripe and the supported video players without allowing arbitrary frame origins.                                                                                                         |
| Playwright journeys         |     22 |    18 | Actual browser navigation, keyboard interaction, onboarding, local persistence and backup restoration, board updates, version history, sample isolation, and the authenticated editor/client review flow.            |
| Skill synchronization tests |      3 |     3 | The repository's skill mirror utility reports differences without writing and applies changes without deleting target-only files. These are tooling tests, not product coverage.                                     |

The previously quoted 203 tests meant 86 unit tests plus 117 backend tests. It did
not include browser journeys, CSP checks, or script assertions. The same two
suites now contain 187 tests. Reducing the number is useful only when removed
tests add little protection.

## Removed or corrected

- Removed an exact duplicate old-version-comment test.
- Removed four workspace primitive tests that checked supplied fixture text,
  `data-*` attributes and a Tailwind row class. They did not exercise layout or
  navigation. Browser checks continue to cover actual navigation and scrolling.
- Removed a deletion-warning test that froze a complete sentence, two subscription
  checks that froze static text/mock markup, a static launch-copy test, and a
  supposed billing permission test. The pricing view never reads
  `canManageBilling`, so that last test could not detect a permission regression.
  Backend billing authorization coverage remains.
- Removed the provider test's branding-copy assertion while keeping its cloud/local
  configuration checks.
- Reduced video rendering tests to a player for each supported provider, an ordinary
  link that ignores supplied player metadata, and an output without a shared
  version. URL variants and rejected credentials belong in the URL-normalizer
  test, where they remain checked.
- Removed assertions that an unrelated local `projects` fixture and fabricated
  salary count stayed unchanged. The output-controller test now checks persisted
  review state as well as the current version and retained history.
- Corrected the backup test: it now round-trips nonempty records and actually
  supplies the connected-account values it expects to exclude.
- Removed four browser tests for a nonexistent section tooltip, fixed sidebar
  expansion/density choices, and active-route marking already checked during the
  navigation journey. Removed exact pixel, radius, color, and dashboard placement
  assertions while keeping working scroll and payment interactions.
- Updated the local project helper to the current create dialog and full-page
  project view rather than the retired launcher/form/inspector flow.
- Deleted `verify.mjs`, `verify-relay-rebuild.mjs`, and
  `check-workspace-layout.mjs`: these searched code and documentation for exact
  strings, file paths and class names instead of exercising the app.
- Deleted the old 871-line `verify-ui-interactions.mjs`, which duplicated browser
  journeys and pinned page-family attributes, gutters, and superseded inspector
  markup. This removes its special inspector-geometry acceptance checks; retained
  checks do not claim exhaustive visual coverage.
- Consolidated production verification into `verify-browser-smoke.mjs`, removing
  the second server startup in `verify-production.mjs`. It checks 26 working
  routes, three expected 404s, and six public pages at desktop and mobile sizes
  for visible main content, keyboard entry, runtime errors, and 200% text sizing.
  Removed exact HTML copy matches and Firefox PNG-size checks; a correctly sized
  screenshot says nothing about whether the pictured UI works.

Brand asset, light-mode contrast/logo, Cloudflare sign-in, and team-preflight
utilities remain separate manual diagnostics. Asset loadability, contrast and
focus visibility are useful checks. The team preflight prints a manual checklist;
it does not perform a live two-account test.

## Running the tests

```sh
pnpm test:unit
pnpm test:convex
pnpm test:stripe-csp
pnpm build
pnpm verify:browser
E2E_LOCAL_ONLY=1 pnpm exec playwright test
```

`pnpm check:full` runs type checks, the UI import check, the production build,
unit/backend/CSP tests, production smoke checks, and finally the dependency audit.
The audit still fails for the existing dependency tree; moving it last ensures
it no longer prevents the tests from running. It has not been disabled.

Playwright is a separate command and is not run by `check:full` or the current CI
workflow. Local journeys need a running local app and Chromium. The authenticated
journey additionally needs an approved Clerk/Convex test setup and is skipped
without it. A skipped cloud journey does not prove the live integration works.

Video rendering tests verify the player URL and markup, not real YouTube/Vimeo
playback or each video's embed permissions. Backend tests mock external billing
calls, and browser smoke checks do not verify signed-in workflows. The important
remaining gaps are live client playback and the configured authenticated journey.

## Embedded review follow-up

The subsequent embedded-review change brings the totals to **69 unit tests and
118 Convex tests**. Two server-rendered iframe checks were removed because the
player APIs now mount and own their iframes in the browser. One unit test checks
manual timestamp parsing (including zero, hours, fractions and invalid input).
One backend integration test checks persisted manual/general comments for Drive
and Dropbox and rejects invalid timestamp values; existing access tests also
verify timestamp zero reaches both client and editor queries. The existing CSP
test now covers the official player API script origins.

An interactive Playwright verification exercised the real React components with
mocked YouTube/Vimeo API scripts: capture playback time, submit, seek to a
comment, general comments, manual Drive/Dropbox timestamps, invalid input, and
API-load failure. This verifies the integration contract, not live playback with
third-party providers. The app and marketing builds pass. The full check still
fails only at its final dependency audit (18 existing vulnerabilities).

## Dependency security follow-up

The subsequent security patch resolves the 18 reported dependency findings.
`pnpm check:full` now passes, including its final production dependency audit.
The audit including development dependencies also reports zero vulnerabilities.
Both app and marketing OpenNext Cloudflare builds pass with the patched packages.
See [the dependency audit](dependency-audit.md) for versions and advisory links.
