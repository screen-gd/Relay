# Cluster report: deployment and auth plumbing, discovery metadata, skill mirrors, docs vs code

Repo `screen-gd/relay` at `/workspace/relay`, branch `main`, HEAD `302d444`. Read-only audit: no
file in the repo was written, no git state changed. Every claim below is a command I ran on this
machine or a `file:line` I read.

---

## 1. FINDINGS, ranked by user-visible consequence

### F1 — The Clerk frontend-API proxy is deployed, unused by the browser, and its instance-API path fails. Severity: medium (latent; no user impact today).

**Part A: the handler runs in production, but nothing calls it.**

`src/proxy.ts:1-10` enables Clerk's proxy on `/__clerk/:path*`:

```ts
export default clerkMiddleware({ frontendApiProxy: { enabled: true } });
export const config = { matcher: ["/__clerk/:path*"] };
```

The handler is live on `https://relay-app.cc.cd` (Vercel, see F2):

```
$ curl -sS -L -o /tmp/c2.txt -w "final HTTP %{http_code} type=%{content_type} size=%{size_download} url=%{url_effective}\n" \
    "https://relay-app.cc.cd/__clerk/npm/@clerk/clerk-js@6/dist/clerk.browser.js"
final HTTP 200 type=application/javascript; charset=utf-8 size=322645 url=https://relay-app.cc.cd/__clerk/npm/@clerk/clerk-js@6.39.0/dist/clerk.browser.js
```

(first hop `HTTP/2 307` with `location: /__clerk/npm/@clerk/clerk-js@6.39.0/dist/clerk.browser.js`.)

But the served HTML loads Clerk JS from the direct frontend-API host, not the proxy:

```
$ curl -sS https://relay-app.cc.cd/ -o /tmp/home.html
$ grep -o ".\{80\}clerk\.relay-app\.cc\.cd.\{60\}" /tmp/home.html
tatic/immutable/chunks/3qd0j5_8xdy2c.js" async=""></script><script src="https://clerk.relay-app.cc.cd/npm/@clerk/clerk-js@6/dist/clerk.browser.js" data-clerk-js-
g"/><meta name="next-size-adjust" content=""/><link rel="preload" href="https://clerk.relay-app.cc.cd/npm/@clerk/ui@1/dist/ui.browser.js" as="script" crossorigin

$ grep -o "__clerk[^\"']\{0,40\}" /tmp/home.html     # (no output)
$ grep -rn "NEXT_PUBLIC_CLERK_PROXY_URL" . --exclude-dir=node_modules --exclude-dir=.git   # (no output)
```

The client selects a proxy URL only from `NEXT_PUBLIC_CLERK_PROXY_URL`, a `proxyUrl` prop, or Vercel's
auto-proxy for preview hostnames — `node_modules/@clerk/nextjs/dist/esm/utils/mergeNextClerkPropsWithEnv.js:17`
and `node_modules/@clerk/shared/dist/proxy.js:59-65` (`if (environment.VERCEL_TARGET_ENV !== "production") return "";`
then `shouldAutoProxy(normalizeHostname(VERCEL_PROJECT_PRODUCTION_URL))`). A custom domain does not
match, and the variable is absent from `.env.production`, `.env.example`, `wrangler.jsonc` and `website/`.

README.md:139-141 claims the opposite: _"`src/proxy.ts` forwards `/__clerk/*` scripts and API requests
through Clerk's built-in proxy, including on the custom app domain."_ No browser request reaches it.
`src/proxy.test.ts:39-56` makes this look covered — it asserts `unstable_doesMiddlewareMatch` and a
mocked `fetch` upstream, so it proves the handler is reachable, never that the client uses it. The
stated purpose (resisting client-side blockers that block `clerk.*`) is therefore not delivered.

**Part B: instance API calls through the proxy fail with `400 host_invalid`.**

```
$ PK=pk_live_Y2xlcmsucmVsYXktYXBwLmNjLmNkJA
$ U="/v1/environment?__clerk_api_version=2025-04-10&_clerk_js_version=5.0.0"
$ curl -sS -o /tmp/d1.json -w "HTTP %{http_code}\n" -H "Authorization: Bearer $PK" -H "Origin: https://relay-app.cc.cd" "https://clerk.relay-app.cc.cd$U"
HTTP 200
$ curl -sS -o /tmp/d2.json -w "HTTP %{http_code}\n" -H "Authorization: Bearer $PK" "https://relay-app.cc.cd/__clerk$U"
HTTP 400
{"errors":[{"message":"Invalid host","long_message":"We were unable to attribute this request to an instance running on Clerk. ...","code":"host_invalid"}]}
```

The same request succeeds on the direct host and fails through the proxy, with and without `Origin`,
and also when I set `Clerk-Proxy-Url: https://relay-app.cc.cd/__clerk` by hand — which is exactly the
header the handler sets itself (`node_modules/@clerk/backend/dist/proxy.js:181-182`). So the forwarding
code is running; Clerk's edge cannot attribute the proxied request to the instance. The instance's own
environment document contains no proxy configuration at all:

```
$ curl -sS https://clerk.relay-app.cc.cd/v1/environment -o /tmp/env.json && grep -c "proxy" /tmp/env.json
0
```

Inference (labelled as such): the instance has no Frontend-API-proxy URL registered, so any proxied
instance call is rejected. I could not read the Clerk dashboard, only the instance's public environment.
Consequence: if the client were ever pointed at the proxy, sign-in and the Convex session-token mint
(`/v1/client/sessions/{id}/tokens?template=convex`, the second case in `src/proxy.test.ts:19-23`) would 400. Today nothing calls it, so users are unaffected.

**Reviewer proof:** open `https://relay-app.cc.cd/` with devtools Network filtered on `clerk` — every
request goes to `clerk.relay-app.cc.cd`; then run the two `curl` calls above. **Confidence:** high on
both halves; the "no registered proxy URL" cause is medium (inferred from the empty environment document
plus `host_invalid`).

### F2 — README and docs/visibility.md say the app runs on OpenNext/Cloudflare Workers; production responses come from Vercel. Severity: medium-low.

```
$ curl -sS -o /dev/null -D /tmp/hq.txt https://relay-app.cc.cd/
$ grep -i "^server\|^x-vercel\|^cf-cache" /tmp/hq.txt
server: cloudflare
x-vercel-cache: HIT
x-vercel-id: iad1::gr52h-1791806945147-44e00bc76871
cf-cache-status: DYNAMIC

$ curl -sS -o /dev/null -D /tmp/xh.txt https://web.relay-app.cc.cd/ && grep -i "^server\|^x-vercel\|^x-cf" /tmp/xh.txt
server: cloudflare            # marketing host: no Vercel headers at all
```

`x-vercel-id` / `x-vercel-cache` appear on every app response I sampled (`/`, `/robots.txt`,
`/sitemap.xml`, `/llms.txt`, `/privacy-policy`, `/__clerk/...`), never on the marketing host. The app is
therefore served by Vercel with Cloudflare proxying in front, while the marketing site is a Cloudflare
Worker. That contradicts:

- README.md:99 `| Hosting | OpenNext on Cloudflare Workers |`
- `docs/APP-OVERVIEW.md:469` "OpenNext and Cloudflare Workers for deployment."
- `docs/visibility.md:5` "Framework: Next.js 16.3.6, deployed through OpenNext on Cloudflare Workers."

while `package.json:14` (`"deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"`)
still describes the Cloudflare path as primary and README.md:119-155 documents the Vercel path as
secondary. Consequence: a production incident or a Clerk-proxy question sends an engineer to the wrong
target (the Worker), and the `/__clerk` route's `CLERK_SECRET_KEY` lives in Vercel (README.md:130), not
in the Worker config. **Reviewer proof:** the curl above. **Confidence:** high that Vercel produces the
responses; caveat in NOT VERIFIED — see below.

### F3 — `docs/testing.md`'s test counts no longer match the tree. Severity: low (documentation).

The doc asserts **69 unit tests and 118 Convex tests** (`docs/testing.md:96-97`, repeated at :124).
Counted from the tree:

```
$ pnpm exec vitest list --config vitest.unit.config.mts | wc -l
87
$ pnpm exec vitest list --config vitest.config.mts | wc -l
145
```

(`vitest list` is collection-only; it ran no test and started no server. 24 unit files, 24 Convex files.)

The doc's other counts do hold: CSP tests 2 (`grep -c "^test(" scripts/check-stripe-csp.test.mjs` → 2),
Playwright journeys 18 (`grep -c "^\s*test\s*(" e2e/*.spec.ts` → 18), skill-sync tests 3
(`python3 scripts/test_sync_convex_skills.py` → `Ran 3 tests ... OK`), 26 working routes and 3 expected
404s (`scripts/verify-browser-smoke.mjs:10-36` = 26 entries; `:87-91` = `/route-that-does-not-exist`,
`/early-access`, `/api/early-access`). So the drift is specific to the two suite sizes: +18 unit and
+27 Convex above what the doc claims. **Confidence:** high.

### F4 — `docs/APP-OVERVIEW.md` still documents two removed surfaces. Severity: low.

- `docs/APP-OVERVIEW.md:410` "Early access password page and return-to-route handling." The page and
  endpoint were deleted in `afada98` ("Remove early-access password wall and prepare Vercel hosting"),
  README.md:148 says so, and `scripts/verify-browser-smoke.mjs:88-91` now asserts `/early-access` and
  `/api/early-access` return **404**. There is no `src/app/early-access` and no `src/app/api` route file
  at all (`find src/app -name "route.ts"` → only `src/app/llms.txt/route.ts`).
- `docs/APP-OVERVIEW.md:428-429` "Early access waitlist page and form." / "Waitlist API route." for the
  marketing app. `website/components/WaitlistForm.tsx` was deleted in `d59f638`,
  `website/app/api/waitlist/route.ts` in `a23b07e`. What survives is a bare redirect
  (`website/app/waitlist/page.tsx`):

```
$ curl -sS -o /dev/null -D /tmp/w.h -w "HTTP %{http_code}\n" https://web.relay-app.cc.cd/waitlist
HTTP 308
location: https://relay-app.cc.cd/
```

**Confidence:** high (both sides cited).

### F5 — `docs/visibility.md`'s P0 rows are stale: the fix is deployed and live. Severity: low.

Both P0 rows say "Fixed locally, not deployed". The live marketing host already serves the separated
metadata:

```
$ curl -sS https://web.relay-app.cc.cd/ | grep -o '<link rel="canonical"[^>]*>\|<meta property="og:url"[^>]*>'
<link rel="canonical" href="https://web.relay-app.cc.cd"/>
<meta property="og:url" content="https://web.relay-app.cc.cd"/>
$ curl -sS https://web.relay-app.cc.cd/robots.txt
User-Agent: *
Allow: /
Disallow: /api/
Sitemap: https://web.relay-app.cc.cd/sitemap.xml
$ curl -sS https://web.relay-app.cc.cd/sitemap.xml | grep loc
<loc>https://web.relay-app.cc.cd/</loc> ... /features ... /pricing ... /roadmap
```

Its own robots and sitemap now name the marketing origin, not the app root, and the app root still
carries `noindex, nofollow` (`grep -o '<meta name="robots"[^>]*>' /tmp/home.html` →
`<meta name="robots" content="noindex, nofollow"/>`), which matches the doc's description. A reader
using the status column to decide what still needs deploying would redo finished work. **Confidence:** high.

### F6 — Repository loose ends (answers to the brief's item 5). Severity: informational.

| Path                     | Tracked by git                           | Reachable           | Note                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ---------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `output/`                | yes, 7 files (`git ls-files output`)     | no route, no import | `grep -rn "output/imagegen"` over the tree (excluding `output/`) returns nothing; the marketing site uses `website/public/`, so these landing-page concepts have no consumer                                                                                                                                       |
| `.firecrawl/`            | yes, 6 files (`git ls-files .firecrawl`) | no                  | tracked even though `.firecrawl/` is line 2 of `.gitignore`; tracked files override the ignore rule, so the rule does nothing for these                                                                                                                                                                            |
| `.scratch/`              | yes, 12 files                            | no                  | legitimate: `docs/agents/issue-tracker.md` says "Remove a completed effort after its durable decisions have moved into CONTEXT.md…", and the single remaining effort is still open — `.scratch/subscription-plans/spec.md:3` `Status: Free usability only; Razorpay work deferred until Screen creates an account` |
| `src/app/u/[slug]`       | yes                                      | route `/u/<slug>`   | public profile, deliberately not in `robots.ts` disallow and not in the sitemap (routes are user-generated; `public-profile-page.tsx:59-62` renders "This public Relay profile has not been published")                                                                                                            |
| `src/app/privacy-policy` | yes                                      | 308 → `/privacy`    | deliberate alias, not a duplicate: `src/app/privacy-policy/page.tsx` is a one-line `permanentRedirect("/privacy")`; live `curl -D - https://relay-app.cc.cd/privacy-policy` → `HTTP 308`, `location: /privacy`                                                                                                     |

### F7 — `skills-lock.json` cannot be reconciled with either the tree or upstream. Severity: low / partly unverified.

36 lock entries ↔ 36 directories under both `.agents/skills` and `.claude/skills`; no lock-only entry, no
directory-only entry, no set difference between the two mirrors (`diff -r .agents/skills .claude/skills`
→ identical). But every `computedHash` differs from the sha256 of the local `SKILL.md` (36/36), and the
one upstream file I fetched also differs from the lock:

```
$ curl -sSL https://raw.githubusercontent.com/get-convex/agent-skills/main/skills/convex/SKILL.md | sha256sum
35608f235686f602c8aee455a168c16b8df4e857fbfee634e14deaa72dee15eb  -
# lock: d8d267be1af449b19eaf05a7b1716ed903e1bc4de2e67a911f67859f341c5337
```

Nothing in the repo consumes the file (`grep -rn "skills-lock" --exclude-dir=node_modules --exclude-dir=.git .`
→ no hits), and CI checks only the `.agents`→`.claude` mirror. So this is not evidence of tampering —
it is evidence that the lock's hash definition is unknown to me and that no gate would notice the file
going stale. See NOT VERIFIED.

---

## 2. LOOKS WRONG BUT IS DELIBERATE

- **The two Clerk origins in the CSP are both real, and correctly split.** `next.config.mjs:16` puts
  `https://accounts.relay-app.cc.cd` in `frame-src` while `script-src`/`connect-src` (lines 20-28) carry
  `https://clerk.relay-app.cc.cd`. This is not a typo. The publishable key decodes to the frontend API
  host, and the instance's own environment document names the account portal:

```
$ echo 'pk_live_Y2xlcmsucmVsYXktYXBwLmNjLmNkJA' | sed 's/^pk_live_//' | base64 -d
clerk.relay-app.cc.cd$
$ curl -sS https://clerk.relay-app.cc.cd/v1/environment | grep -o 'https://accounts.relay-app[^"]*' | sort -u | head
https://accounts.relay-app.cc.cd/sign-in
https://accounts.relay-app.cc.cd/sign-up
https://accounts.relay-app.cc.cd/user
```

`clerk.relay-app.cc.cd` serves the JS/API (`/v1/environment` → 200 with `x-clerk-instance-id:
  ins_3IPQ1woOtUYVTulDU1bvLWwJFJQ`); `accounts.relay-app.cc.cd` is the hosted Account Portal, which is
what `frame-src` governs. Clerk's own generated CSP adds the FAPI host to `connect-src` only
(`node_modules/@clerk/nextjs/dist/esm/server/content-security-policy.js:143`), so `frame-src` is not
missing an entry either.

- **`privacy-policy` next to `privacy` is not a dead duplicate** — see F6.
- **The CI skill-mirror step does not "report clean while the tree differs".** `ci.yml:18-20` runs
  `python3 scripts/sync-convex-skills.py` **without** `--apply`, and the script exits 1 on any difference
  (`scripts/sync-convex-skills.py:22-25`); only `--apply` writes. Ran it read-only:
  `Checked 62 mirrored files; 0 differences.` (exit 0). `.agents/skills` and `.claude/skills` are byte-identical.
- **The app's canonical base is the app origin, not the marketing origin**: `src/app/layout.tsx:23`
  `metadataBase: new URL(siteUrl)` with `src/lib/site.ts:1-5` reading `NEXT_PUBLIC_SITE_URL`
  (`https://relay-app.cc.cd`, `.env.production:5`, `wrangler.jsonc` vars). The marketing app has its own
  separate `website/lib/site-metadata.ts` reading `NEXT_PUBLIC_MARKETING_SITE_URL` (commit `83d6df9`).
- **`/early-access` strings in `scripts/verify-browser-smoke.mjs:89-90` are intentional**: they are the
  expected-404 list, not a live route.

**Clean results, for the record** (checked, nothing to report):

- Sitemap: all four URLs map to real pages — `/accessibility`, `/contact`, `/privacy`, `/terms`
  (`src/app/sitemap.ts:4`; the four `src/app/<name>/page.tsx` files exist). Live
  `https://relay-app.cc.cd/sitemap.xml` matches the file and uses the app origin. The app root's absence
  is deliberate: it serves `noindex, nofollow`.
- Robots: every `disallow` entry in `src/app/robots.ts` corresponds to a real route under
  `src/app/(workspace)/` (route group) or a top-level directory, with one harmless leftover, `/api/`
  (no route handlers exist under `src/app/api`). Private surfaces are excluded twice over —
  `robots.ts` plus per-layout `robots: { index: false, follow: false }` in
  `src/app/(workspace)/layout.tsx:6`, `client-hub/layout.tsx:5`, `client-portal/layout.tsx:5`,
  `organization-profile/layout.tsx:5`, `sample-studio/layout.tsx:7`.
- `src/app/llms.txt/route.ts` names the app origin for its own pages and the marketing origin for
  product copy; live `/llms.txt` returns that exact body.
- Deleted files with surviving references (item 6): I extracted the deletions with
  `git log --diff-filter=D --name-only --pretty=format:%h -45` and grepped the current tree for
  `ProductStory`, `WaitlistForm`, `contact-form`, `contact-email`, `workspace-page`, `team-api`,
  `template-controller`, `subscription-entitlements`, `early-access`, `jsrepo`, `GlassCursor`,
  `SiteButton`. No import hits. The only surviving mentions are the prose ones in F4, the expected-404
  strings above, and `/u/…` in `docs/APP-OVERVIEW.md:381` (which is a live route). The doc reference to
  `@/components/workspace-page` is also fine — `src/components/workspace-page/` exists.

---

## 3. NOT VERIFIED

- **Whether Vercel is the DNS origin of `relay-app.cc.cd`, as opposed to a Cloudflare Worker forwarding
  Vercel's headers.** I read only public responses; I hold no Cloudflare or Vercel credentials, so I could
  not read the zone's origin record or the deployment list. The inference rests on `x-vercel-id` /
  `x-vercel-cache` on every app response and their total absence on the marketing host, plus the absence
  of any proxy-to-Vercel code in this repo.
- **Whether the OpenNext/Cloudflare build registers `src/proxy.ts`.** No production build exists in the
  checkout (`.next/server/middleware-manifest.json` is `{"version":3,"middleware":{},"sortedMiddleware":[],"functions":{}}`,
  but `.next/BUILD_ID` is empty and `.next/dev/` is present, so these are dev artifacts), and my brief
  forbids `pnpm build`. So I cannot say whether Next 16's `proxy.ts` survives `opennextjs-cloudflare build`
  or whether `/__clerk` would work on the Worker. I also could not reach a `*.workers.dev` deployment of
  Worker `relay` to test it.
- **The `computedHash` algorithm in `skills-lock.json`.** I tested sha256 of raw bytes, stripped bytes,
  CRLF-normalised bytes and the concatenated directory; none matched, and the upstream file at `main`
  matched neither. I could not determine what the field hashes, so I cannot say whether the lock is stale
  or simply defined differently.
- **The Clerk dashboard.** I inferred the missing proxy registration from the instance's public
  environment document (`grep -c proxy /tmp/env.json` → 0) and the `host_invalid` code; the dashboard
  setting itself is behind a login I do not have.
- **`docs/testing.md`'s dependency-audit claims** ("18 existing vulnerabilities" resolved,
  `pnpm audit --prod` clean, lines 110-118) — the audit is part of `pnpm check:full`, which the parent
  owns and I was told not to run.
- **`docs/visibility.md`'s search/AI-console items** (indexing, impressions, referrals, ownership) stay
  owner-access work; nothing in this run touched them.
