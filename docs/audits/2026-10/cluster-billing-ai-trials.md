# Cluster report: workspace AI foundation, seven-day Creator trials, and their closure

Repo `screen-gd/relay` at `/workspace/relay`, HEAD `302d444`, tree clean (`git status --porcelain` empty). Read-only: no edits, no commits, no branches. All five cluster commits are ancestors of HEAD (`git merge-base --is-ancestor` YES for 8227f13, 06739c5, 07dd67c, d59f638, f975c79).

## 1. FINDINGS

### F1. The AI settings panel is live in production with no AI feature behind it — medium

**Evidence**

- The panel renders unconditionally in Settings → Workspace: `src/features/settings/settings-page.tsx:616` `<WorkspaceAiSettings workspaceId={teamWorkspace?._id} notify={notify} />` (outside the `{teamWorkspace ? (` block that opens at line 526, so it shows in Local mode too).
- It offers a live switch and a quota promise: `src/features/settings/workspace-ai-settings.tsx:63` "Allow AI in this workspace"; `:65` "Owners and Editors trigger each run. Clients and Viewers cannot run AI."; `:78` `` `${summary.used} of ${summary.limit} runs used this month. ${summary.remaining} remaining.` ``; `:84-87` "AI features send only the text, timestamps and titles needed for the request. Drafts are marked AI-drafted and linked to their sources."
- Nothing can consume a run. `git grep -l enqueueAiRun -- src convex` returns only `convex/aiRuns.ts` and `convex/aiRuns.test.ts`; the same is true of `api.aiRuns.getRun` (`convex/aiRuns.ts:365`, referenced only by `convex/aiRuns.test.ts`). No provider SDK or call exists anywhere in `convex/`: `grep -rn "generativelanguage\|openai\|@ai-sdk\|generateContent" convex --include="*.ts"` matches one line, `convex/aiValidators.ts:28` (`provider: v.union(v.literal("google"), v.literal("openai"))`), a validator, not a call.
- The backend path is complete and tested (`convex/aiRuns.ts:182` `enqueueAiRun`, `:127` `getSummary`, `:269-363` claim/complete/fail/expire) — it is simply never called by product code.

**User-visible consequence:** a Workspace Owner can turn "Allow AI in this workspace" on, the counter reads "0 of 10 runs used this month. 10 remaining." for a Free workspace (`convex/aiRuns.ts:114-118`), and there is no screen anywhere in the app where AI does anything. The panel's own copy promises run behaviour ("Owners and Editors trigger each run", "Drafts are marked AI-drafted") that has no entry point.

**How a reviewer proves it:** `git grep -n "enqueueAiRun" -- src convex` (one production definition, one test import); open `/settings`, Workspace section, and look for any AI action outside the switch.

**Confidence:** high on the code; the only thing I could not check is whether a newer commit outside HEAD adds a consumer (HEAD is `302d444`).

**Deliberate hook:** `docs/architecture/ai-foundation.md:27` says "Model execution, a concrete feature action, AI-drafted labels and source links in generated feature UI belong to the feature issues, beginning with #76. This foundation does not make provider calls by itself." So the absence of features is intended — but the doc does not say the consent switch and quota counter would ship to users without one, and that is the part a user hits.

### F2. Docs describe the Creator trial as open; the code closed it behind an env var that is set nowhere and documented nowhere — medium (docs/ops; the app itself is coherent)

**Evidence**

- Doc: `docs/product/subscription-plans.md:3` "Status: Free plan open to everyone, with an opt-in 7-day Creator trial; future payments use Razorpay"; `:10` "Convex remains the authority for Workspace entitlements, including the no-card Creator trial"; `:68-72` "### Free Creator trial / An eligible Free Workspace Owner can start a 7-day Creator trial from Plans and billing."; `:16` "The 7-day no-card Creator trial is approved separately."
- Code: `convex/creatorTrials.ts:17-19` `function creatorTrialsOpen() { return process.env.CREATOR_TRIALS_OPEN === "true"; }`; `:82-84` `start` throws "Creator trials are not available right now"; `:59-68` `getAvailability.open` drives the UI.
- The switch appears in exactly three places repo-wide: `convex/creatorTrials.ts:18`, its comment at `:13`, and `convex/creatorTrials.test.ts:18`. It is absent from `.env.example`, `.env.production`, `wrangler.jsonc`, `README.md`, `CONTRIBUTING.md` and `docs/` — grep for `CREATOR_TRIALS_OPEN` outside those three files returns nothing.
- The UI flip side: `src/components/subscription-plans.tsx:241-243` "Creator and Team cannot be started or purchased right now." Only `07dd67c`'s test file mentions the closure; no doc was updated by that commit (`git show --stat 07dd67c` touches `convex/creatorTrials.test.ts`, `convex/creatorTrials.ts`, `src/components/subscription-plans.test.tsx`, `src/components/subscription-plans.tsx`, `src/features/subscription/subscription-page.tsx`).

**User-visible consequence:** the app is right — a user sees "Creator is not available yet" instead of a trial button. The damage is to anyone working from the product doc or support script: they will tell a Free owner to start a trial from Plans and billing, and there is no way to do it. And an operator who wants to reopen trials has to reverse-engineer the variable name from the source, because nothing tells them it exists.

**How a reviewer proves it:** `grep -rn "CREATOR_TRIALS_OPEN" --exclude-dir=node_modules .` then read `docs/product/subscription-plans.md:68-72`.

**Confidence:** high on the repo; the Convex deployment's own env is not visible to me, so I cannot prove the variable is unset in production — only that it is set nowhere in the repository and documented nowhere.

### F3. `NEXT_PUBLIC_BILLING_PURCHASES_ENABLED` is documented as a deployment requirement but no code reads it — medium-low

**Evidence**

- Every occurrence in the tree: `.env.example:25`, `.env.production:3`, `wrangler.jsonc:11`, `README.md:132`, and the gitignored `.env.local:3`. `grep -rIn "BILLING_PURCHASES" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next --exclude-dir=output --exclude-dir=test-results --exclude-dir=videos .` returns exactly those five, none under `src/`, `convex/`, `scripts/`, `e2e/`, `website/` or `docs/`.
- The only reader that ever existed was `const billingPurchasesEnabled = process.env.NEXT_PUBLIC_BILLING_PURCHASES_ENABLED === "true";` added in `85dbb64 "Pause subscription purchases"` and deleted in `8e00222 "fix: harden billing lifecycle and enforce Free-only launch"` (`git show 8e00222 -- src/components/subscription-plans.tsx` shows it as a removed line).
- There is no checkout to gate: `grep -rIn "PricingTable\|openCheckout\|checkout\|Checkout" --include="*.ts" --include="*.tsx" src convex scripts e2e` (excluding tests) returns nothing.
- `README.md:125-133` still lists it among "Configure these environment variables before building", and `docs/APP-OVERVIEW.md:404` still says "the app can pause new purchases through configuration".
- `.env.example:24` states the intent: "Keep false for the Free-only launch. Paid plans are deferred to Razorpay."

**User-visible consequence:** none directly. The consequence is that the audit premise — "production ships the flag false, therefore purchases are gated" — is false; purchase closure is enforced by two unrelated mechanisms (trials closed in code, and Clerk Billing not being activated operationally). Setting the documented variable to `true` reopens nothing, and an operator can believe purchases are config-controlled when they are not.

**How a reviewer proves it:** the grep above; then flip it to `true` and observe that no code path changes.

**Confidence:** high.

### F4. The server still grants Creator/Team on a Clerk billing event while the client says they cannot be purchased — medium, and deliberate, but the precondition lives only in prose

**Evidence**

- Client: `src/components/subscription-plans.tsx:241-243` "Creator and Team cannot be started or purchased right now."
- Server: `convex/http.ts:55-107` still routes `POST /api/clerk-billing`, verifies it with `CLERK_WEBHOOK_SIGNING_SECRET` (`:59`) and resolves `subscriptionItem.*` events through `convex/workspaceSubscriptionReconciliation.ts:104-125` → `confirmForClerkUser`, which calls `confirmProjection` (`convex/workspaceSubscriptions.ts:200-206`) and sets `plan: relayPlanForClerkId(confirmation.clerkPlanId)`. `relayPlanForClerkId` maps `"creator"`/`"creator_plan"` → creator and `"team"`/`"team_plan"` → team (`convex/workspaceSubscriptions.ts:68-88`), and `entitlements` (`:227-266`) then unlocks uploads, templates, reports, Client Hub, branding and team features.
- Nothing in the code checks a purchases flag on that path — the gate is the operational rule "do not activate Clerk Billing", stated in `docs/product/subscription-plans.md:12-14` ("Paid checkout stays disabled. Do not connect Stripe or activate Clerk Billing.") with the grandfathering rule at `:85-88` ("Confirmed paid billing takes precedence over the local trial, and trial expiry never cancels a paid subscription").
- The one remaining Clerk-hosted surface is `/organization-profile`, which renders Clerk's own profile widget: `src/components/subscription-plans.tsx:254-258` `UserBillingProfile` → `<UserProfile routing="hash" />`, used at `src/app/organization-profile/page.tsx:8`. If the Clerk instance had billing plans enabled, that is where a purchase surface would appear; no app code disables it.

**User-visible consequence:** today, none that I could prove — with Clerk Billing inactive there is no way to buy anything. The gap is that "Creator and Team cannot be purchased" is a client-side statement backed on the server only by an operational promise. A signed Clerk billing event for a creator/team plan would still provision paid entitlements while every screen says the plans are unavailable.

**How a reviewer proves it:** read `convex/http.ts:55-107` and `convex/workspaceSubscriptions.ts:200-206`; then check the Clerk instance's billing settings (I cannot — no Clerk credentials).

**Confidence:** high on the code path; the production Clerk configuration and the deployment's `CLERK_WEBHOOK_SIGNING_SECRET` are unverified.

### F5. `docs/dependency-audit.md` claims zero vulnerabilities; `pnpm audit --prod --json` reports nine today — medium (docs vs artifact, not a code defect)

**Evidence**

- Doc: `docs/dependency-audit.md:15` "The security follow-up resolves all 18 findings. Both `pnpm audit --prod --json` and `pnpm audit --json` report **zero vulnerabilities**."
- Command, at HEAD with a clean tree: `timeout 180 pnpm audit --prod --json > /tmp/audit-prod.json` → `exit=1`, and the parsed metadata is `{"vulnerabilities":{"info":0,"low":1,"moderate":4,"high":3,"critical":1},"dependencies":602,"devDependencies":0,"optionalDependencies":0,"totalDependencies":602}` with 9 advisories: `critical proxy-addr >=1.1.0 <2.0.8` and `high source-map-js >=1.0.0 <1.2.2` (dev=false paths `.>@opennextjs/cloudflare>@opennextjs/aws>express>proxy-addr` and `.>@tailwindcss/postcss>@tailwindcss/node>source-map-js`), `high sharp <0.35.5` (via `wrangler>miniflare`), and five Next.js advisories in the range `>=16.0.0 <16.3.8` plus one `>=16.3.0 <16.3.8`, all against `./next`.
- The lockfile resolves `next@16.3.6` (`pnpm-lock.yaml:4880`), `undici@7.29.1` (`:5598`), `brace-expansion@2.1.7` and `5.0.12` (`:3531`, `:3537`). `node_modules` agrees: next 16.3.6, undici 7.29.1, brace-expansion 2.1.7.
- `docs/README.md:13` presents the file as current: "Dependency audit — resolved findings, patched versions, and verification."

**User-visible consequence:** none today, but the doc is the record a reviewer or an auditor trusts, and it now says "zero vulnerabilities" about a tree that reports one critical and three high. The critical is in OpenNext/Cloudflare build tooling, and the Next.js advisories do reach the app framework, so "only build tooling" is not a safe summary of the whole list.

**How a reviewer proves it:** `pnpm audit --prod --json` at HEAD and compare with line 15.

**Confidence:** high for the command output. Cause is uncertain: the Next.js advisories patch at `>=16.3.8` while the doc's target was `16.3.6`, so these are most likely advisories published after the 2 October snapshot, not a regression in the fix — either way line 15's "zero vulnerabilities" is no longer true.

### F6. Trial holders see two contradictory statements in the same card — low

**Evidence:** `src/components/subscription-plans.tsx:161-165` renders the badge from `trialsOpen` only, so with trials closed it reads "Paid plans: not available yet"; `:183` opens the trial card when `trialsOpen || trial?.active`; `:186-188` its heading is "Try Creator free for 7 days".

**User-visible consequence:** a user whose trial started before 07dd67c and is still running (a trial started 7 October runs to 14 October, so this is live today) sees the badge "Paid plans: not available yet" directly above a card headed "Try Creator free for 7 days" with the body "Your Creator trial is active." The status line resolves it, but the heading is stale.

**How a reviewer proves it:** the four line ranges above; the cohort is small and time-limited.

**Confidence:** high on the code.

### F7. Dead code left by the closure and the open-Free launch — note, not defects

- `api.workspaceSubscriptions.repairCurrent` (`convex/workspaceSubscriptions.ts:355`) is a public mutation whose only remaining references are `convex/billingOwnership.test.ts` and `convex/workspaceSubscriptions.test.ts`. Its UI ("Retry billing sync") was removed in `ff9a925`, whose diff asserts `expect(html).not.toContain("Retry billing sync")`.
- `api.aiRuns.getRun` (`convex/aiRuns.ts:365`) and `enqueueAiRun` (`:182`) are referenced only from `convex/aiRuns.test.ts` — see F1. Harmless if a feature lands in #76; a live-path gap if it does not.
- The whole waitlist stack is now callerless: `convex/waitlist.ts`, the `POST /api/waitlist` route (`convex/http.ts:110-111`), the `waitlistSignups` table (`convex/schema.ts:616`) and `waitlistAudienceValidator` (`convex/domainValidators.ts:130`). After `d59f638` deleted `website/components/WaitlistForm.tsx` and turned `website/app/waitlist/page.tsx` into a `permanentRedirect` to the app, the only references are `convex/waitlist.test.ts`. The endpoint is still reachable if `WAITLIST_PROXY_SECRET` is set, and returns 401 without it (`convex/http.ts:116-118`); I could not check the deployment's secret.
- Trial records can no longer be created: `convex/creatorTrials.start` is the only `db.insert("creatorTrials", ...)` (`:127`) and it refuses before reaching it when the switch is off (`:82-84`), and the UI only calls it when `canStart`, which itself requires `open` (`src/features/subscription/subscription-controller.ts:29`, `convex/creatorTrials.ts:62-68`). The `creatorTrials` schema fields are all still read.
- No issue in the "free is not actually free" direction: `convex/team.ts:477` `createWorkspace` has no plan or invite check, and I found no project/client count cap on Free (`grep -n "limit\|maximum" convex/projects.ts convex/workspaceClients.ts` returns nothing). The waitlist and early-access walls are gone (`/early-access` and `/api/early-access` were deleted in `afada98` and `scripts/verify-browser-smoke.mjs:88-91` now asserts both return 404).

## 2. LOOKS WRONG BUT IS DELIBERATE

- **Marketing plan cards say "Not available yet" with no link.** `website/lib/plans.ts:5-8` documents the intent ("Only Free is available; Creator and Team are not available yet (no trial, no purchase) ... A plan with no `cta` shows a disabled 'Not available yet' button"), and `website/components/pricing/PricingPlans.tsx:66-73` implements it. The Free CTA points at the app root. Nothing dead-ends.
- **The client says "cannot be purchased"; the server can still provision paid plans** (F4). Sanctioned by `docs/product/subscription-plans.md:85-88` and `:12-14`, and required to keep existing paid workspaces working.
- **A query can still see an expired trial as Creator** (`convex/workspaceSubscriptions.ts:314-315`: the deadline is only enforced when `"scheduler" in ctx`, i.e. on mutations). That is exactly what `docs/product/subscription-plans.md:75-77` claims: "Capability mutations also check the server deadline, so a delayed expiry job cannot extend trial privileges."
- **The pre-patch version table in `docs/dependency-audit.md:9-11` (Next 16.3.5, Undici 7.29.0, brace-expansion 2.1.4/5.0.9) is not stale-by-accident** — it is labelled `:3` "Snapshot: October 2, 2026", and `:15` records the resolution to 16.3.6/7.29.1/2.1.7/5.0.12, which the lockfile matches. Only the "zero vulnerabilities" clause in `:15` is now false (F5).
- **AI ships without features** — `docs/architecture/ai-foundation.md:27` says provider calls and feature UI belong to #76 upward. F1 is about the visible switch, not about the missing feature itself.

## 3. NOT VERIFIED

- **The production Convex deployment's environment.** I cannot see whether `CREATOR_TRIALS_OPEN` is set there (F2), nor `WAITLIST_PROXY_SECRET`, `CLERK_WEBHOOK_SIGNING_SECRET`, `CLERK_SECRET_KEY`, or any AI provider key. Everything about v1 runtime behaviour rests on the source defaults plus what is set nowhere in the repo.
- **The Clerk instance's billing configuration.** Whether Clerk Billing is active, whether the `/organization-profile` `<UserProfile>` renders a purchase surface, and whether a signed billing webhook could be delivered today (F4) all need Clerk credentials.
- **Cloudflare production config.** `wrangler.jsonc` is checked in with `NEXT_PUBLIC_BILLING_PURCHASES_ENABLED: "false"`, but I did not verify what the live Worker actually serves, so I cannot prove the deployed bundle has no purchases flag consumer beyond the fact that HEAD's source has none.
- **Runtime UI.** I did not start the dev server, run `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm test:e2e` or `pnpm verify:browser` (out of scope by the brief, and the parent owns those gates). Every UI statement above is from source, not from a rendered screen.
- **Whether the closure is complete for trial records created before 07dd67c.** A trial whose `expire` scheduled job were lost would stay `status: "active"`; there is no reconciliation or cron backstop for `creatorTrials` (only `ctx.scheduler.runAt` at `convex/creatorTrials.ts:134`). I did not check the deployment's scheduler state.
