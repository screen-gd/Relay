# RELA-15 — Is `main` at HEAD sound?

Repo `screen-gd/relay`, `main` @ `302d444` ("Add a dark-mode showcase video of the marketing site", Fri 9 Oct 04:49 +04). Read-only audit: no commits, no branches, no PRs, no source edits. The checkout is clean at the end (`git status --short` empty, only `main`, HEAD unchanged). I did create `.env.local` from the committed `.env.production` for the runs the brief describes, and removed it; I also fetched two remote-tracking refs (`feature/marketing-relaunch`, `fix/exclude-video-sources`) to read unmerged work — no local branch was created.

**Verdict: `main` is not sound, but only one thing is actually broken in the app itself.** `pnpm lint` and `pnpm build` fail on 98 type errors, all of them in `videos/source/**` — the Remotion launch-video sources added on 9 Oct by `cb801f1` and `8aedd42`. A one-line `tsconfig.json` fix already exists on an unmerged branch. Everything else compiles: with that line applied to a copy outside the repo, `next build` succeeds in 32 s, the marketing build succeeds, the production smoke test passes all 26 routes and 3 expected 404s, and 16 of 17 local Playwright journeys pass. The other red gates are the production dependency audit (1 critical, 3 high) and an e2e suite that cannot run from its own documentation. Separately, **the live marketing site is not this commit**: it shows prices for Creator and Team that exist in no commit of the repository, its hero video promises a Creator trial that was closed, and its `/roadmap` page renders an error to every visitor.

## Gate results

Every command below was run on `main` @ `302d444` after `pnpm install --frozen-lockfile` (exit 0, "added 568, done" in 7.2 s). Exact command and exact outcome, in the order the brief lists them.

| Gate                                               | Exact command                                                                                       | Result                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install                                            | `pnpm install --frozen-lockfile`                                                                    | **PASS** — exit 0, `Progress: ... added 568, done`, 7.2 s                                                                                                                                                                                                                                    |
| Typecheck                                          | `pnpm lint` (`tsc --noEmit`)                                                                        | **FAIL** — exit 2, 98 errors, all under `videos/source/**`                                                                                                                                                                                                                                   |
| UI import allowlist                                | `pnpm check:mui-allowlist`                                                                          | **PASS** — exit 0                                                                                                                                                                                                                                                                            |
| App build                                          | `pnpm build` (`next build`)                                                                         | **FAIL** — exit 1: `✓ Compiled successfully in 10.9s` then `Running TypeScript ...` then `Failed to type check.` (same 98 errors)                                                                                                                                                            |
| Unit                                               | `pnpm test:unit`                                                                                    | **PASS** — exit 0, `Test Files 24 passed (24) / Tests 87 passed (87)`, 2.35 s                                                                                                                                                                                                                |
| Convex                                             | `pnpm test:convex`                                                                                  | **PASS** — exit 0, `Test Files 24 passed (24) / Tests 145 passed (145)`, 2.75 s                                                                                                                                                                                                              |
| Stripe/CSP                                         | `pnpm test:stripe-csp`                                                                              | **PASS** — exit 0, `tests 2 / pass 2`                                                                                                                                                                                                                                                        |
| Marketing typecheck                                | `pnpm --dir website lint`                                                                           | **PASS** — exit 0                                                                                                                                                                                                                                                                            |
| Production audit                                   | `pnpm audit --prod`                                                                                 | **FAIL** — exit 1, `9 vulnerabilities found / Severity: 1 low \| 4 moderate \| 3 high \| 1 critical`                                                                                                                                                                                         |
| E2E (as briefed, `.env.production` → `.env.local`) | `pnpm test:e2e`                                                                                     | **FAIL** — exit 1 in 18.5 min: `15 failed`, `2 passed`, `1 skipped`; every failure carries `Clerk: Production Keys are only allowed for domain "relay-app.cc.cd"`                                                                                                                            |
| E2E with a local-mode env (probe, see below)       | `E2E_LOCAL_ONLY=1 pnpm exec playwright test e2e/local-project.spec.ts e2e/workspace-layout.spec.ts` | **16 passed, 1 failed, 1.5 min** — the one failure passes 2/2 standalone (flaky)                                                                                                                                                                                                             |
| Browser smoke                                      | `pnpm verify:browser`                                                                               | **FAIL** — exit 1 in 1 s, see output below                                                                                                                                                                                                                                                   |
| Browser smoke with a build present (probe)         | `node scripts/verify-browser-smoke.mjs`                                                             | **PASS** — exit 0, `Production routes verified: 26 pages and 3 expected 404s.` + public-page desktop/mobile/keyboard/200%-text checks                                                                                                                                                        |
| Extra: marketing build                             | `next build --webpack` in `website/`                                                                | **PASS** — exit 0, all 9 static pages, 24.8 s                                                                                                                                                                                                                                                |
| Extra: CI job                                      | `.github/workflows/ci.yml:41` runs `pnpm check:full` on every push to `main`                        | **Cannot pass** — `check:full` begins `pnpm check:mui-allowlist && pnpm lint && pnpm --dir website lint && pnpm build && ...`, so it dies at `lint`. The run history itself is unreadable from here (`gh run list` → `HTTP 404` on `git.capy.ai/api/v3/repos/screen-gd/relay/actions/runs`). |

`pnpm check` (the command CONTRIBUTING tells every contributor to run) is `check:mui-allowlist && lint && --dir website lint && build && audit --prod`: it fails at `lint`, and would also fail at `audit --prod`. `pnpm check:full` fails at `lint`.

Exact failure text for the two gates whose failure is easy to misread:

```
$ pnpm lint
videos/source/claude/remotion.config.ts(8,24): error TS2307: Cannot find module '@remotion/cli/config' or its corresponding type declarations.
videos/source/claude/remotion/launch/RelayLaunch.tsx(1,23): error TS2307: Cannot find module '@remotion/media' or its corresponding type declarations.
... (98 lines; `grep -E 'error TS[0-9]+' <log> | grep -v '^videos/'` is empty)
 ELIFECYCLE  Command failed with exit code 2.

$ pnpm build
✓ Compiled successfully in 10.9s
  Running TypeScript ...
Failed to type check.
 ELIFECYCLE  Command failed with exit code 1.

$ pnpm verify:browser
> node scripts/verify-browser-smoke.mjs
Error: Production server exited.
▲ Next.js 16.3.6  ✓ Ready in 123ms
Error: Could not find a production build in the '.next' directory. Try building your app with 'next build' before starting the production server.
    at waitForServer (file:///workspace/relay/scripts/verify-browser-smoke.mjs:188:13)
 ELIFECYCLE  Command failed with exit code 1.
```

`verify:browser` fails **because** `pnpm build` fails; it starts its own server on a free port and `next start` refuses to run without a production build ID.

### What could not be run, and what that leaves unverified

- **The authenticated cloud journey** (`e2e/cloud-workflow.spec.ts:58`, 1 skipped test) needs `CLERK_SECRET_KEY` plus a Clerk/Convex test setup (`e2e/env.ts:26-34`, `e2e/global-setup.ts`). Unverified: the signed-in editor→client flow — embedded Media Version review with comments, portal access controls, comment resolution across editor and Client contexts.
- **No cloud credentials**, so I could not read the Vercel or Cloudflare deploy history, the Clerk instance's dashboard or billing config, or the Convex deployment's environment variables. Every statement below about production is from HTTP responses and response headers, not from a console.
- **Not in the brief's list, so not run:** `verify:team:live` (needs two live accounts), `verify:cloudflare-auth`, `verify:light-highlights`, `verify:light-logo`. `verify:brand-assets` was run by the design-system cluster: exit 0.
- **The e2e env problem is real and in the brief's own setup.** `.env.production` copied to `.env.local` makes `src/app/providers.tsx:56-58` set `mode: "cloud"` (`hasCloudConfig = hasConvexConfig && hasClerkConfig`). The app then boots against the _production_ Clerk publishable key on `localhost`, Clerk JS refuses it, and 15 of 18 journeys fail. Withheld cloud config, the same 17 local journeys give 16 green in 1.5 min.

## Regressions and risks, ranked

### R1 — HIGH: `pnpm lint` and `pnpm build` fail on `main`, and the fix exists unmerged

**Evidence.** 98 errors, every one under `videos/source/`; nothing else in the repo has a type error (the `grep -v '^videos/'` filter over the full log is empty). The sources arrived in `cb801f1` ("Update the launch video and add its Remotion source") and `8aedd42` ("Add the alternate GPT launch video cut and its source"); before them `git ls-tree -r --name-only cb801f1^ -- videos` returns only `videos/relay-launch.mp4` and no `.ts`/`.tsx` at all. The root `tsconfig.json:34` is `"exclude": ["node_modules", "website"]` with `include: ["**/*.ts", "**/*.tsx", ...]`, so `videos/source/claude/**` and `videos/source/gpt/**` are compiled with the app's program while their dependencies (`remotion`, `@remotion/media`, `@remotion/transitions`, `@remotion/cli`, `@remotion/google-fonts`) live only in `videos/source/claude/package.json`, are not a pnpm-workspace package (`pnpm-workspace.yaml` lists `.` and `website`), and are therefore never installed. `origin/fix/exclude-video-sources` @ `4ce4572` ("Exclude the Remotion video sources from the app type check") changes exactly that one line to `"exclude": ["node_modules", "website", "videos"]`; `git merge-base --is-ancestor 4ce4572 main` → **false**. In a clone of `main` outside the repo with only that line changed, `next build` exits 0 in 32 s.

**Consequence.** The app cannot be built or deployed from this commit: `pnpm check` and `pnpm check:full` (CONTRIBUTING's required commands) fail, the CI job on `main` fails, `vercel.json:4`'s `buildCommand: "pnpm build"` fails, and `pnpm deploy`/`upload` (OpenNext) fail. The live app is served by Vercel behind Cloudflare — `curl -D- https://relay-app.cc.cd/` returns `server: cloudflare`, `x-vercel-id: iad1::…`, `x-vercel-cache: HIT` — so this also blocks every future app fix from shipping. `pnpm verify:browser` becomes unrunnable as a side effect. `.husky/pre-commit` runs `lint-staged` with `.lintstagedrc` `prettier --ignore-unknown --write` only, so nothing on the developer machine catches a type error; CI is the only gate and it is red.

**How a reviewer proves it.** `pnpm lint; echo $?` and `pnpm build; echo $?` on `302d444`; then `git merge-base --is-ancestor 4ce4572 main; echo $?` (1 = unmerged).

### R2 — HIGH: the live marketing site is not `main`, and it sells prices that exist in no commit

**Evidence.** Live `https://web.relay-app.cc.cd/pricing` (screenshot `renders/RELA-15/live-pricing.png`) shows Creator `$6.99 / month` and Team `$9.99 per member / month`, both stamped "Not available yet", with "Creator and Team prices are set, and checkout opens later" and "Checkout is not live yet". Live `/llms.txt:19` repeats it: "Creator costs $6.99 per month and Team costs $9.99 per member per month." On `main`, `website/lib/plans.ts:33-35` and `:52-54` are `price: "TBD"` / `period: "price not set"`. `git grep -n '6\.99\|9\.99'` over **every fetched ref** (heads and remotes, including `origin/feature/marketing-relaunch` @ `0036adc`) returns nothing. At least three other markers say the deployed build is not `main`: the live footer has Legal → Privacy, Terms, Accessibility (screenshot; `main`'s `website/components/site/SiteFooter.tsx:23` has Privacy alone), the live hero's second link is "Sign in" (`main`'s `website/components/Home.tsx:74` is `<Link href="/pricing">See pricing</Link>`), and the footer contact address resolves to `contact@relay-app.cc.cd` (`main`'s `website/lib/links.ts:4` is a protonmail address). `origin/feature/marketing-relaunch` matches those three markers but has `price: "TBD"` too and no `$6.99` anywhere.

**Consequence.** Every visitor to the pricing page is quoted a price for a product that cannot be bought, and those numbers exist only inside the deployed artifact — no commit contains them, so no review, correction, or revert of the shipped copy is possible through git. The marketing site's own source of truth (`plans.ts`) disagrees with what customers see.

**How a reviewer proves it.** `curl -s https://web.relay-app.cc.cd/pricing | grep -o '\$6\.99'`; `curl -s https://web.relay-app.cc.cd/llms.txt | grep 6.99`; `grep -n 'TBD' website/lib/plans.ts`; then the all-refs grep above.

### R3 — HIGH: the live home hero video advertises a closed 7-day Creator trial and a dead domain

**Evidence.** Frame at 51.8 s of `website/public/videos/relay-launch.mp4` (extracted with `ffmpeg -ss 51.8`, saved as `renders/RELA-15/relaunch-hero-video-51.8s-trial-claim.png`) reads `workrelay.dev` over "Free plan. 7-day Creator trial, no card needed." The deployed video is byte-identical to the committed one: `curl https://web.relay-app.cc.cd/videos/relay-launch.mp4 | sha256sum` = `website/public/videos/relay-launch.mp4` = `b7dbc07c377444ceab7b956a314142bc0cc9b60e013f195b508a234c51acce89`. `getent hosts workrelay.dev` returns nothing and `curl http://workrelay.dev` → `curl: (6) Could not resolve host`. Trials are closed in this commit: `convex/creatorTrials.ts:17-19` gates them on `CREATOR_TRIALS_OPEN === "true"` and commit `07dd67c` closed them; the site's own text says "Free plan. No card needed."

**Consequence.** The marketing home page autoplays and loops a 52.35 s film whose closing card promises a trial nobody can start, on a domain that does not resolve, every 52 seconds, on the highest-traffic page of the product. Content, not code — but it is what a visitor reads.

**How a reviewer proves it.** `ffmpeg -ss 51.8 -i website/public/videos/relay-launch.mp4 -frames:v 1 out.png` and open it; `getent hosts workrelay.dev`.

### R4 — MEDIUM-HIGH: the live `/roadmap` page renders an error for every visitor

**Evidence.** `curl https://web.relay-app.cc.cd/roadmap` contains "We couldn't load the roadmap right now. Try again later." with no group headings (screenshot `renders/RELA-15/live-roadmap-error.png`). `website/app/roadmap/page.tsx:11` is `export const dynamic = "force-dynamic"`, and `website/lib/roadmap.ts:348-351` returns `{ ok: false }` when `process.env.GITHUB_TOKEN` is unset, which drives the `RoadmapError` branch; `RoadmapPreview` then renders nothing, so the home "What's next." block disappears too. `website/.env.example:5-9` states the requirement ("Required for the roadmap: GitHub's GraphQL API needs a token … Set it in production with `wrangler secret put GITHUB_TOKEN`. Without it, the roadmap shows its error state."), `website/wrangler.jsonc` `vars` has no such key, and `.github/workflows/ci.yml` never sets one. `https://api.github.com/repos/screen-gd/relay` returns 404 unauthenticated, so the repository is private and a token is genuinely required.

**Consequence.** A page the relaunch shipped (`a23b07e`) is broken in production, is linked from every footer and from the sitemap, is listed in `/sitemap.xml`, and shows an apologetic error to every visitor. I could not distinguish "secret absent" from "token set but rejected" without deploy-environment access; the symptom is confirmed either way.

**How a reviewer proves it.** `curl -s https://web.relay-app.cc.cd/roadmap | grep -o "We couldn't[^<]*"`.

### R5 — MEDIUM: `pnpm audit --prod` fails with 1 critical and 3 high, while the repo's own audit doc says zero

**Evidence.** `9 vulnerabilities found / Severity: 1 low | 4 moderate | 3 high | 1 critical` — `critical proxy-addr >=1.1.0 <2.0.8` (`.>@opennextjs/cloudflare>@opennextjs/aws>express>proxy-addr`), `high source-map-js` (via `@tailwindcss/postcss`), `high sharp <0.35.5` (via `wrangler>miniflare`), and `high Next.js SSRF in Image Optimization >=16.0.0 <16.3.8` against the installed `next@16.3.6`. `docs/dependency-audit.md:15` reads "The security follow-up resolves all 18 findings. Both `pnpm audit --prod --json` and `pnpm audit --json` report **zero vulnerabilities**", and `docs/README.md:13` presents that file as current. The audit step is the last step of both `pnpm check` and `pnpm check:full`, so both commands stay red even after R1 is fixed. The Next.js advisory reaches the app framework, not only build tooling.

**Consequence.** The documented "check passes" state is false in both directions: the gate fails, and the doc a reviewer trusts says there is nothing to find. Most of these are probably advisories published after the doc's 2 October snapshot (`docs/dependency-audit.md:3`) rather than new regressions — but the doc claim and the gate state need to be reconciled either way.

**How a reviewer proves it.** `pnpm audit --prod; echo $?` and read `docs/dependency-audit.md:15`.

### R6 — MEDIUM: the Playwright suite cannot be run from its own instructions, and is not gated

**Evidence.** CONTRIBUTING.md and `docs/testing.md` say to run `pnpm test:e2e`; `.env.example` asks for development Clerk/Convex values; the drive's own rules and this brief say to copy the committed `.env.production` to `.env.local`. Doing the latter puts the app in cloud mode (`src/app/providers.tsx:56-58`) with a production Clerk key on `localhost`, and 15 of 18 journeys fail with `Clerk: Production Keys are only allowed for domain "relay-app.cc.cd"`. With no cloud config, the same journeys run 16-pass/1-flaky in 1.5 min. Meanwhile `docs/testing.md` states "Playwright is a separate command and is not run by `check:full` or the current CI workflow", and the local-mode identifier `cutlab-studio:auth-mode:v1` (`e2e/helpers.ts:24-31`) only takes effect once the provider is already in local mode. It is also the case that the one failure I saw in the full local run — `local-project.spec.ts:284` "scrolls workspace content without moving the page shell" (`expect.poll(() => contentSurface.evaluate(el => el.scrollTop)).toBeGreaterThan(0)` got 0) — passed twice in a row when run alone, so it is flaky rather than broken.

**Consequence.** The only suite that exercises real browser behaviour is neither runnable from the docs as written nor run by CI, so a markup or behaviour regression would ship unnoticed. A runner who follows the briefed env gets a wall of red that says nothing about the code.

**How a reviewer proves it.** Run it both ways: `cp .env.production .env.local && pnpm test:e2e` (red), then a `.env.local` with no cloud keys and `E2E_LOCAL_ONLY=1 pnpm exec playwright test e2e/local-project.spec.ts e2e/workspace-layout.spec.ts` (16 pass).

### R7 — MEDIUM: the AI settings panel is live with no AI behind it

**Evidence.** `src/features/settings/settings-page.tsx:616` renders `<WorkspaceAiSettings workspaceId={teamWorkspace?._id} notify={notify} />` outside the `{teamWorkspace ? …}` block, so it appears in Local mode too. The panel offers "Allow AI in this workspace" (`src/features/settings/workspace-ai-settings.tsx:63`), promises behaviour ("Owners and Editors trigger each run. Clients and Viewers cannot run AI.", `:65`; "AI features send only the text, timestamps and titles needed for the request.", `:84-87`) and shows a quota readout (`${summary.used} of ${summary.limit} runs used this month`, `:78`). `grep -rn "enqueueAiRun\|getRun" src convex` excluding tests returns only the two definitions, `convex/aiRuns.ts:182` and `:365`; no provider call exists anywhere in `convex/`. The backend is otherwise complete and tested (`convex/aiRuns.test.ts`).

**Consequence.** A Workspace Owner can switch AI on, watch "0 of 10 runs used this month", and find no screen anywhere in the app where AI does anything. `docs/architecture/ai-foundation.md:27` says provider calls and feature UI belong to #76 onward — the foundation is deliberate, but the consent switch and quota promise shipped ahead of the feature that would justify them.

**How a reviewer proves it.** `git grep -n enqueueAiRun -- src convex` (two hits, one of them the test), then open `/settings` → Workspace.

### R8 — MEDIUM: the billing flag the brief names is read by no code, and the switch that actually closed trials is documented nowhere

**Evidence.** `NEXT_PUBLIC_BILLING_PURCHASES_ENABLED` appears in exactly four tracked places — `.env.example:25`, `.env.production:3`, `README.md:132`, `wrangler.jsonc:11` — and in no file under `src/`, `convex/`, `scripts/`, `e2e/` or `website/`. The last reader was removed in `8e00222` ("harden billing lifecycle and enforce Free-only launch"). What actually closes the trials is `convex/creatorTrials.ts:17-19` (`process.env.CREATOR_TRIALS_OPEN === "true"`), and that variable name appears in exactly three places repo-wide: the code, its comment, and its test. It is absent from `.env.example`, `.env.production`, `wrangler.jsonc`, `README.md`, `CONTRIBUTING.md` and `docs/`. The user-facing side is coherent: `src/components/subscription-plans.tsx:241-243` says "Creator and Team cannot be started or purchased right now", and the live `/subscription` page reads "Start with Free. Paid plans are later."

**Consequence.** The premise "purchases are closed by the flag" is false: setting `NEXT_PUBLIC_BILLING_PURCHASES_ENABLED=true` reopens nothing. Anyone working from `docs/product/subscription-plans.md:3,10,68-72` (which still describes an open 7-day Creator trial) or from `README.md:132` will act on the wrong switch. Reopening trials requires reverse-engineering an undocumented variable from source.

**How a reviewer proves it.** `grep -rn "BILLING_PURCHASES\|CREATOR_TRIALS_OPEN" --exclude-dir=node_modules .` and read the four hits.

### R9 — MEDIUM-LOW: documentation that no longer describes the code

- `docs/testing.md` claims 69 unit tests and 118 Convex tests; the suites report **87** (24 files) and **145** (24 files). Its other counts are accurate: 2 CSP tests, 18 Playwright journeys, 3 skill-sync tests, 26 routes + 3 expected 404s.
- `README.md:139-141` says `src/proxy.ts` forwards `/__clerk/*` "including on the custom app domain". Verified: the live app's HTML loads Clerk directly — `curl -s https://relay-app.cc.cd/ | grep -o 'src="[^"]*clerk[^"]*"'` → `src="https://clerk.relay-app.cc.cd/npm/@clerk/clerk-js@6/dist/clerk.browser.js"`, and the page contains zero `__clerk` references; `NEXT_PUBLIC_CLERK_PROXY_URL` appears nowhere in the repo; `curl -H "Authorization: Bearer pk_live_…" https://clerk.relay-app.cc.cd/v1/environment` → 200 while the same call through `https://relay-app.cc.cd/__clerk/v1/environment` → 400 `host_invalid` ("We were unable to attribute this request to an instance running on Clerk"). So the route is live but unused by the browser, and `src/proxy.test.ts` proves only reachability. Latent, no user impact today.
- `docs/APP-OVERVIEW.md:410,428-429` still document the removed early-access password page and the waitlist form/endpoint (deleted in `afada98`, `d59f638`, `a23b07e`).
- `docs/visibility.md` P0 rows still say "Fixed locally, not deployed" while the live marketing host already serves the corrected canonical, `og:url`, robots and sitemap.
- `docs/dependency-audit.md:15`, see R5.
- `CONTRIBUTING.md` still clones `github.com/zaid-gd/Relay.git`; the remote is `screen-gd/relay`.

### R10 — LOW: `website/$($i` is a committed build artefact

866 bytes of escaped Tailwind output with mangled ` - -ge 0)` line prefixes, tracked since `f28eb91`, `git check-ignore` says it is not ignored, nothing references it (`grep -rn '[$]($i'` is empty), it is outside `website/public/`, and it is not in any build or serving path. The signature is an unescaped `$($i` redirect in a shell command.

### R11 — LOW: `--app-text` is used but defined nowhere

`src/components/precision-schedule.tsx:812` and `src/components/precision-workspaces.tsx:433` both apply `hover:text-[var(--app-text)]`, and `grep -rn -- '--app-text:' src/` returns nothing, so the declaration is invalid at computed-value time and the hover colour silently falls back to the inherited one. Pre-existing, not from the recent clusters.

### R12 — LOW: the Projects and Dashboard tables expose their rows as buttons

`src/components/precision-projects.tsx:1273` and `src/components/precision-dashboard.tsx:1211` put `role="button"` and `aria-selected` on the `<tr>`. The design-system cluster proved on the repo's own Playwright that the accessibility tree then contains one `row` (the header) and no data rows, and that `aria-selected` is dropped (`button` does not accept it), against the repo's own `docs/design/features/projects.md:25` ("Use table semantics … named row actions, sort state") and `docs/design/system/components.md:48`. **Not a regression**: `role="button"` is present at `9a87264` and at `2742b2c^`, i.e. before the shadcn rebuild — but `1470b64`, the rebuild's own review-response commit, re-affirmed it in a commit that was reworking those exact rows ("the rows already carry their own role, focus and hover styles").

## Looks wrong but is deliberate

- **`/privacy-policy`** is a one-line `permanentRedirect("/privacy")` (`src/app/privacy-policy/page.tsx`), live 308 — an alias, not a duplicate route.
- **`/early-access` and `/api/early-access` are 404 on purpose** — README.md:148 records their removal, `scripts/verify-browser-smoke.mjs:88-91` asserts the 404s, and the live app returns 404 for both.
- **`/waitlist` is a 308 to the app** (`website/app/waitlist/page.tsx:4-6`); the endpoint and form were deleted in `d59f638`/`a23b07e`; the smoke script expects the old paths to 404.
- **Marketing and app origins are correctly separated, and that fix is deployed**: live marketing canonical/sitemap/robots all use `https://web.relay-app.cc.cd`, the app uses `https://relay-app.cc.cd` (`src/lib/site.ts`, `src/app/robots.ts`, `src/app/sitemap.ts`). `docs/visibility.md` is the stale side of this, not the code.
- **`accounts.relay-app.cc.cd` in `frame-src` is not a typo.** Both hosts resolve (DNS: `clerk.* → frontend-api.clerk.services`, `accounts.* → accounts.clerk.services`), the publishable key decodes to `clerk.relay-app.cc.cd`, and the instance's own `display_config` names the `accounts.*` host for sign-in and profile URLs.
- **Marketing plan cards with no `cta` render a disabled "Not available yet" button** — `website/lib/plans.ts:5-8` states the intent, `website/components/pricing/PricingPlans.tsx:66-73` implements it.
- **`videos/source/*` are archived Remotion sources, not app code**, per `videos/README.md` ("copies of the working Remotion project … copy its `remotion/`, `scripts/` and `public/` folders into a Remotion project"). The intent is that they are inert; the defect is that `tsconfig.json` does not treat them as inert.
- **`origin/feature/marketing-relaunch` and `origin/fix/exclude-video-sources` are unmerged branches**, not divergence inside `main`.
- **Trial expiry is enforced only in mutations** (`convex/workspaceSubscriptions.ts:314-315`), exactly as `docs/product/subscription-plans.md:75-77` describes.
- **`.env.production` carries a working public Convex URL and Clerk publishable key.** That is the repo's documented convention (drive AGENTS.md), not a leak; `.env.local` is gitignored.

## Checked clean (ruled out, with the check)

- **Route inventory, robots and sitemap agree with the code**: all 4 sitemap URLs and every robots `disallow` entry map to real route files under `src/app`; `/privacy-policy`, `/u/[slug]`, `/organization-profile` are deliberate and reachable; live `/pricing`, `/waitlist`, `/early-access` on the app correctly 404.
- **The README's release-blocking journeys still have tests.** entry-mode selection (`local-project.spec.ts:99`), local backup/restore (`:172` + `src/lib/workspace-backup.test.ts`), client and project CRUD (`src/lib/clients.test.ts`, `convex/projects.test.ts`, e2e create flows), stage changes (`local-project.spec.ts:511`), Delivered confirmation (`src/features/projects/project-domain.test.ts:353`), salary batches (`convex/salaryPlans.test.ts`), portal access controls (`convex/projectPortals.test.ts`, `projectFiles.test.ts:1093`), media version comments (`convex/mediaVersionComments.test.ts`), reports (`src/lib/payout-reporting.test.ts`), file quotas (`convex/projectFiles.test.ts:189,308,544`), keyboard operation (both workspace specs). No journey named in README.md:190 lost its test.
- **No dangling references to deleted files** — `git log --diff-filter=D --name-only -45` plus greps for every deleted module name returned no import hits.
- **Skill mirrors are in sync**: `python3 scripts/test_sync_convex_skills.py` → `Ran 3 tests … OK`; `python3 scripts/sync-convex-skills.py` → `Checked 62 mirrored files; 0 differences`; `.agents/skills` and `.claude/skills` are identical; the lock reconciles (36/36). CI runs the check without `--apply`, so drift fails rather than passing silently.
- **No dead UI module from the shadcn rebuild**: every file in `src/components/ui/` has an importer, no `react-day-picker`/old-calendar remnant survives, and no raw colour constants remain in `src/components`/`src/features`.
- **Radix usage matches the repo's allowlist**: no `@radix-ui/*` or `@mui/*` imports; all primitives come from the umbrella `radix-ui` package.
- **The Remotion sources are the only cause of the build failure** — proven by building a copy with nothing but the tsconfig exclusion changed.

## PR

None. This is an audit thread: no commits, no branches, no pull requests, no source edits. The checkout is at `302d444` with `git status --short` empty.

## Needs

No blockers. Three decisions for the Captain when Screen is ready:

1. **Unblock the build (R1).** `origin/fix/exclude-video-sources` @ `4ce4572` is one line and is verified to fix the build; it needs merging to `main` (or an equivalent change) before anything else can ship. That is a merge, so it needs Screen's explicit word.
2. **The deployed marketing copy that is not in git (R2, R3).** Someone with the Vercel/Cloudflare project must decide whether to redeploy from `main`, or to first land the correct source for the live site. I could not identify how the deployed content got there.
3. **R4 and R8 need one credential each** to close out: `wrangler secret list` for the marketing Worker (is `GITHUB_TOKEN` set?), and the Convex deployment's environment (is `CREATOR_TRIALS_OPEN` set?). Both are questions, not blockers.

## Cost

Four `fresh`-machine subagents failed to provision ("Running machines use 160 of 128 GB; this one needs 16 GB"), so the four audit clusters were re-run on this jam's machine instead — eight agents in total, all on `deepseek/deepseek-v4.1-flash`, no other model. Wall clock roughly 35 minutes: ~19 minutes is the single `pnpm test:e2e` run inside the gate sweep, 1.5 minutes the local-mode re-run, 32 s the probe build. I cannot read a metered spend figure from here.

## Lesson

A one-line `tsconfig` exclusion is the whole difference between "green" and "main cannot ship", and nothing local catches it: the pre-commit hook runs prettier only, so CI on `main` is the single gate, and this repo's CI has been red since 9 October while the fix sat unmerged on a branch for three days. Two narrower lessons for the next audit: the brief's premise that `NEXT_PUBLIC_BILLING_PURCHASES_ENABLED=false` closes purchases is false — grep for a reader before trusting an env var — and the deployment is Vercel behind Cloudflare, not OpenNext on Cloudflare as the docs say. Copying `.env.production` to `.env.local` also flips the app into cloud mode, which makes `pnpm test:e2e` red and `pnpm verify:browser` meaningful at the same time; those two commands need opposite `.env.local` contents and nothing documents it.
