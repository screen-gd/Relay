# Marketing relaunch audit (website/, videos/, metadata) — RELA-15

Repo `screen-gd/relay` at `/workspace/relay`, branch `main`, HEAD `302d444`, working tree clean. Read-only audit; no repository state changed.

Baseline facts used throughout:

```
$ git rev-parse HEAD origin/main
302d4445c52437d6c9bfdf42463720190384c9c8
302d4445c52437d6c9bfdf42463720190384c9c8
$ git ls-remote origin refs/heads/main
302d4445c52437d6c9bfdf42463720190384c9c8	refs/heads/main
$ git status --short
(empty)
```

Live marketing origin is `https://web.relay-app.cc.cd` (`website/wrangler.jsonc` `NEXT_PUBLIC_MARKETING_SITE_URL`, `website/lib/site-metadata.ts:3-6`); app origin is `https://relay-app.cc.cd` (`wrangler.jsonc`, `src/lib/site.ts`).

---

## 1. FINDINGS

### F1 — Production is served from the unmerged `feature/marketing-relaunch` branch, with further edits that exist in no commit, and it publishes `$6.99` / `$9.99` prices for plans the app will not sell — HIGH

**Title.** The deployed marketing site is not `main` (302d444). It matches the unmerged branch `feature/marketing-relaunch` on the markers `main` lacks, and on top of that ships prices (`$6.99` / `$9.99`) and hero markup that exist in no commit of either.

**Evidence.**

Deployed `/pricing` (live HTML, text extraction after stripping tags):

```
$ curl -sS https://web.relay-app.cc.cd/pricing | ... (text) ...
Pricing | Start free. Creator and Team prices are set, and checkout opens later. | Plans | Free | ... | $0 | forever | Available now |
Creator | ... | $6.99 | / month | Not available yet | ... | Planned launch price. Checkout is not live yet. |
Team | ... | $9.99 | per member / month | Not available yet | ... | Planned launch price. Checkout is not live yet. |
Compare plans | ... | Price | $0 forever | $6.99 / month | $9.99 per member / month | ...
```

Deployed `/llms.txt` (the AI-summary route the site serves to crawlers):

```
- Creator costs $6.99 per month and Team costs $9.99 per member per month. Both are still in development, and checkout is not live, so neither can be bought yet.
```

Committed values:

```
$ grep -n 'price:\|period:' website/lib/plans.ts
31:    name: "Creator",
33:    price: "TBD",
34:    period: "price not set",
50:    name: "Team",
52:    price: "TBD",
53:    period: "price not set",

$ git grep -n '6\.99' HEAD -- website
(empty)
$ git log --all -S '6.99' --oneline | head -5
557cc6d Merge pull request #41 from zaid-gd/move-to-relay
b8a6390 fix(subscription): recognize Clerk organization free plan
    # both hits are an unrelated SVG data-URI blob in .firecrawl/reactbits-home.md, not a price
```

The committed AI summary says the opposite of what is served (`website/app/llms.txt/route.ts:23,25`: "Creator and Team are not available yet. There is no trial and no way to buy them." / "Paid prices are not set."), and `docs/product/subscription-plans.md:14-15` says "Paid prices, billing periods ... await ticket 02 approval".

**Where the deployed build comes from.** `git ls-remote --heads origin` shows an unmerged `refs/heads/feature/marketing-relaunch` (`0036adc`). Inspecting it without touching this checkout (`git init ~/.capy/work/probe && git fetch --filter=blob:none --depth=1 origin feature/marketing-relaunch`, outside the repository) matches production on the three markers `main` does not have:

| Marker               | Live `web.relay-app.cc.cd`                                                                                                                          | `main` (302d444)                                                 | `feature/marketing-relaunch` (0036adc)                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Footer "Legal" links | `/privacy`, `/terms`, `/accessibility` (`grep -o 'href="https://relay-app.cc.cd/[a-z-]*"' live-home.html` → terms, accessibility, privacy, 6× root) | `website/components/site/SiteFooter.tsx:23` — Privacy only       | `SiteFooter.tsx:5,16` uses `LEGAL_LINKS` (Privacy, Terms, Accessibility) |
| Hero note            | absent (`grep -c 'Free plan' live-home.html` → `0`)                                                                                                 | `website/components/Home.tsx:77` — "Free plan. No card needed."  | absent (hero is "Get started free" + `<a href={APP_URL}>Sign in</a>`)    |
| Hero secondary CTA   | no "See pricing" (`grep -c 'See pricing' live-home.html` → `0`)                                                                                     | `Home.tsx:74` — `<Link href="/pricing">See pricing</Link>`       | `Sign in` link instead                                                   |
| Contact mailto       | `mailto:contact@relay-app.cc.cd` (never in git)                                                                                                     | `website/lib/links.ts:4` — `mailto:connect.relay@protonmail.com` | `links.ts:3-4` — `CONTACT_EMAIL = "contact@relay-app.cc.cd"`             |

The live hero also carries a `class="hero-video-media"` video and a sibling `<button type="button" class="hero-video-toggle" aria-label="Play the product walkthrough">`, neither of which appears under `website/` in this tree nor on that branch; and the live home page has no `hero-note` element at all.

Two further mismatches exist in neither `main` nor that branch tip:

```
$ curl -sS 'https://web.relay-app.cc.cd/?cb=1' | grep -c 'hero-video-toggle'
1                       # live markup: <button class="hero-video-toggle" aria-label="Play the product walkthrough">
$ grep -rn 'hero-video-toggle' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next .
(none)                  # not in this tree
$ git log --all -S 'hero-video-toggle' --oneline
(empty)                 # not in any reachable commit

$ curl -sS https://web.relay-app.cc.cd/robots.txt >/dev/null; curl -sS https://web.relay-app.cc.cd/ | grep -o 'mailto:[^"\\]*' | sort | uniq -c
      3 mailto:contact@relay-app.cc.cd
$ grep -rn 'contact@relay-app.cc.cd' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next .
(none)                  # website/lib/links.ts:4 is mailto:connect.relay@protonmail.com
$ git log --all -S 'contact@relay-app.cc.cd' --oneline
(empty)
```

**User-visible consequence.** Visitors are told Creator and Team have set prices and that "checkout opens later" for products the app refuses to sell (`.env.production:2 NEXT_PUBLIC_BILLING_PURCHASES_ENABLED=false`; `convex/creatorTrials.ts:18` `return process.env.CREATOR_TRIALS_OPEN === "true"`; `src/components/subscription-plans.tsx:156,162,234` renders "Creator is not available yet"). For the team the consequence is bigger than the copy: production runs an unmerged branch, so `main` is not a description of the live site, the price copy cannot be reviewed, diffed or reverted, and a deploy from `main` replaces live copy wholesale (losing the terms/accessibility footer links, the contact address and the video toggle with it). Any repo-based audit of marketing copy — including this one — does not describe production on its own.

**How a reviewer proves it.** `git ls-remote --heads origin | grep marketing-relaunch`; then, outside any checkout, `git init /tmp/probe && cd /tmp/probe && git remote add origin <origin> && git fetch --filter=blob:none --depth=1 origin feature/marketing-relaunch && git show FETCH_HEAD:website/components/site/SiteFooter.tsx | grep -n LEGAL`; compare with `curl -sS https://web.relay-app.cc.cd/ | grep -o 'href="https://relay-app.cc.cd/[a-z-]*"'`. For the prices: `curl -sS https://web.relay-app.cc.cd/pricing | grep -o '\$6\.99'` and `git grep -n '6\.99' $(git rev-list --all) -- website` (empty).

**Confidence.** High that production is the unmerged branch plus uncommitted edits (four independent markers, all listed above). Unverified: which exact revision was deployed and whether the extra edits (prices, hero toggle) are uncommitted work on that branch, work on another branch I did not enumerate, or lost commits. I could not read the Cloudflare deploy history.

### F2 — The home-page hero video promises a closed 7-day trial and points at a domain that does not resolve — HIGH

**Title.** The launch video the home page plays ends on "Free plan. 7-day Creator trial, no card needed." and "workrelay.dev"; the trial is closed and `workrelay.dev` has no DNS.

**Evidence.** The home hero loads one asset, `website/components/Home.tsx:80-83`:

```tsx
            <HeroVideo
              video={{
                src: "/videos/relay-launch.mp4",
                poster: "/videos/relay-launch-poster.jpg",
              }}
```

The deployed bytes are the committed bytes (so the frame evidence below is production evidence):

```
$ curl -sS -o deployed-relay-launch.mp4 https://web.relay-app.cc.cd/videos/relay-launch.mp4
$ sha256sum deployed-relay-launch.mp4 website/public/videos/relay-launch.mp4
b7dbc07c377444ceab7b956a314142bc0cc9b60e013f195b508a234c51acce89  deployed-relay-launch.mp4
b7dbc07c377444ceab7b956a314142bc0cc9b60e013f195b508a234c51acce89  website/public/videos/relay-launch.mp4
$ ffmpeg -v error -ss 50.5 -i deployed-relay-launch.mp4 -frames:v 1 -y deployed-50.5.png
```

Frame at 50.5 s (of the 52.35 s loop) shows: `Relay` lockup, "Manage editing projects.", "Get started free", then `workrelay.dev` and `Free plan. 7-day Creator trial, no card needed.` — also present in the source that rendered it, `videos/source/claude/remotion/launch/scenes/OutroScene.tsx:100,103` (and identically in the alternate cut, `videos/source/gpt/remotion/launch/scenes/OutroScene.tsx:100,103`).

```
$ getent hosts workrelay.dev ; curl -sS -o /dev/null -w '%{http_code}\n' http://workrelay.dev
(no output)
curl: (6) Could not resolve host: workrelay.dev
000
```

The trial is closed: commit `07dd67c` "Close Creator trials while paid plans are unavailable" ("creatorTrials.start now refuses new trials unless the `CREATOR_TRIALS_OPEN` deployment env var is 'true'"), implementation `convex/creatorTrials.ts:18,59-63`, UI `src/components/subscription-plans.tsx:156,162,234`. The committed site copy agrees with the app, not the video: `website/lib/plans.ts:5-6` ("Only Free is available; Creator and Team are not available yet (no trial, no purchase)"), `website/components/Home.tsx:77` "Free plan. No card needed.", `website/app/llms.txt/route.ts:23`.

**User-visible consequence.** The hero video autoplays muted and loops (`website/components/site/HeroVideo.tsx:11-16,31-38`), so its closing card returns roughly every 52 seconds on the highest-traffic page: it advertises a trial that cannot be started and sends viewers to `workrelay.dev`, a domain with no DNS, instead of `relay-app.cc.cd`. Anyone who follows the video is dead-ended, and the promise contradicts the site's own hero note and pricing page.

**How a reviewer proves it.** The sha256 match above, then play the last three seconds of `https://web.relay-app.cc.cd/videos/relay-launch.mp4`, or extract the frame at 50.5 s and read it. `dig +short workrelay.dev` returns nothing.

**Confidence.** High. Both the media bytes and the trial gate are verified directly.

### F3 — The live `/roadmap` page shows an error; the home page's "What's next." section silently disappears — MEDIUM

**Title.** `/roadmap` renders "We couldn't load the roadmap right now. Try again later." in production, and the home page's roadmap section renders nothing.

**Evidence.**

```
$ curl -sS https://web.relay-app.cc.cd/roadmap | grep -o "We couldn[^<]*"
We couldn&#x27;t load the roadmap right now. Try again later.
$ curl -sS https://web.relay-app.cc.cd/roadmap | grep -o '<h2[^>]*>[^<]*</h2>'
<h2 id="roadmap-idea" ...>Have an idea?</h2>
<h2>Product</h2><h2>Contact</h2><h2>Social</h2><h2>Legal</h2>
   # no "In progress" / "Planned" / "Recently shipped" group headings
$ curl -sS https://web.relay-app.cc.cd/ | grep -o "What's next\.\|Loading roadmap…" | sort | uniq -c
      1 Loading roadmap…
      1 What's next.
```

That text is the `RoadmapError` branch (`website/components/roadmap/RoadmapMessage.tsx:5-9`) reached from `website/components/roadmap/RoadmapGroups.tsx:24` when `getRoadmap()` returns `{ ok: false }`. On the home page the same failure makes `RoadmapPreview` `return null` (`website/components/roadmap/RoadmapPreview.tsx:46`), so the Suspense fallback ("Loading roadmap…") is replaced by nothing.

The cause is server-side and bounded by `website/lib/roadmap.ts:348-351` (`const token = process.env.GITHUB_TOKEN; if (!token) … return { ok: false }`), documented as a manual step in `website/.env.example:5-9` ("Set it in production with `wrangler secret put GITHUB_TOKEN`. Without it the roadmap shows its error state"). `website/wrangler.jsonc` `vars` contains no `GITHUB_TOKEN`, and `.github/workflows/ci.yml` (the only workflow) never sets one. A cached-success path cannot explain this: the module memo is only set on success (`lib/roadmap.ts:356`) and the Workers cache only stores nodes after a successful fetch.

**User-visible consequence.** A page that is in the sitemap (`website/app/sitemap.ts:5`), the header nav (`website/lib/links.ts:11-15`), the pricing FAQ (`website/components/pricing/PricingFaq.tsx:26`) and linked from the home page advertises an error to every visitor and to crawlers. The home page loses its closing "What's next." section entirely — a blank gap where content was promised.

**How a reviewer proves it.** `curl -sS https://web.relay-app.cc.cd/roadmap | grep -o "We couldn[^<]*"`; then read the Worker's environment (`wrangler secret list` for `relay-web`) and the Worker logs for `Roadmap: GITHUB_TOKEN is not set.` (`lib/roadmap.ts:350`).

**Confidence.** High on the symptom. Medium on the cause: I cannot read the `relay-web` Worker secret list or its logs, so I have not shown whether the token is absent, invalid, or rejected by GitHub. Either way the page fails for every visitor.

### F4 — `website/$($i` is a committed stray file from a broken shell redirect — LOW

**Evidence.** Name is a literal, unexpanded command substitution; content is a truncated Tailwind CSS dump:

```
$ git ls-files website | head -1
website/$($i
$ git log --oneline -- 'website/$($i'
f28eb91 Add Relay landing page concepts and launch video
$ ls -la 'website/$($i'
-rw-r--r-- 1 user user 866 Oct 12 12:02 website/$($i
$ cat -n 'website/$($i'
     1	active\:scale-\[0\.98\] - -ge 0)
     2	active\:scale-\[0\.98\]:active{scale:.98}.disabled\:pointer-events-none:disabled{pointer-events:none}...
     3	group-hover\/button\:translate-x-0\.5 - -ge 0)
...
```

Nothing references it (`grep -rn '[$]($i'` over the repo excluding `node_modules`/`.git` returns nothing), and it cannot reach the build or the served bundle: `website/tsconfig.json` `include` is `["next-env.d.ts","**/*.ts","**/*.tsx",".next/types/**/*.ts",".next/dev/types/**/*.ts"]` (no extension, so typecheck skips it), it is not under `website/public/`, and `website/wrangler.jsonc` serves `assets.directory: ".open-next/assets"` from `public/` plus traced imports. So neither the Next server bundle nor the Cloudflare asset upload picks it up.

**User-visible consequence.** None. It costs 866 bytes in every checkout, appears in `git ls-files`/`find` output, and is a misleading path for anyone grepping the marketing tree — that is the whole of its severity.

**How a reviewer proves it.** `git show f28eb91 -- 'website/$($i'`; `grep -rn 'hero' website/tsconfig.json`-style include check; `git rm 'website/$($i'` removes it with no other change.

**Confidence.** High that it is inert. Medium on the exact command: the filename records an unescaped `$($i` redirect and the body is interleaved CSS-rule output with a mangled ` - -ge 0)` prefix, which is consistent with a shell loop that dumped matched CSS rules, but the original command is not recoverable from the repo.

### F5 — `website/public/_headers` caches a file the marketing build does not have — LOW

**Evidence.**

```
$ cat website/public/_headers          # byte-identical to public/_headers
/_next/static/*
  Cache-Control: public,max-age=31536000,immutable

/brand/relay/social-preview.png
  Cache-Control: public,max-age=300,must-revalidate
$ ls website/public/brand/relay | grep social ; ls website/public/social
(nothing)
hero.png
```

The marketing link-preview image is `/social/hero.png` (`website/lib/site-metadata.ts:16-17`, referenced by OG/Twitter/schema in `website/app/layout.tsx`), and `website/public/brand/relay/social-preview.png` does not exist in the marketing `public/` (it exists only in the app's `public/brand/relay/`).

**Consequence.** A stale header rule; the actual preview image gets default caching instead of the intended 5-minute revalidate. Cosmetic for users; the practical risk is that the app's `public/_headers` and the marketing copy have drifted while sharing the same filename.

**Confidence.** High (file listing and file contents read directly).

---

## 2. LOOKS WRONG BUT IS DELIBERATE

- **Marketing and app metadata are correctly separated.** `website/lib/site-metadata.ts:3-6` defaults to `https://web.relay-app.cc.cd` and ignores `NEXT_PUBLIC_SITE_URL`, with `scripts/check-marketing-origin.test.mjs` asserting exactly that; `wrangler.jsonc` keeps `NEXT_PUBLIC_SITE_URL=https://relay-app.cc.cd` for the app. Verified live: `curl -sS https://web.relay-app.cc.cd/ | grep canonical` → `<link rel="canonical" href="https://web.relay-app.cc.cd"/>`, and `/sitemap.xml` lists only `https://web.relay-app.cc.cd/{,features,pricing,roadmap}`. Note that `docs/visibility.md:40` still says "Production still has the earlier configuration until deployment" — that doc is stale, the fix is deployed.
- **`NEXT_PUBLIC_MARKETING_SITE_URL` in `website/wrangler.jsonc:10` is a runtime var, which cannot rewrite statically generated metadata.** `docs/visibility.md:40` says so explicitly, and the hardcoded fallback in `site-metadata.ts:4-6` is the value that actually ships — which is why metadata is correct anyway.
- **`/waitlist` redirecting instead of collecting signups.** `website/app/waitlist/page.tsx:4-6` is a `permanentRedirect` to the app root; the form endpoint was removed in `a23b07e` (`website/app/api/waitlist/route.ts`, 102 deletions). Live: `HTTP 308 loc=https://relay-app.cc.cd/`. `docs/visibility.md` records the intent ("`/waitlist` redirects to the app", "Keep the current public route inventory"). No form, no dead endpoint.
- **The two unreferenced videos are an archive, not orphans.** `grep -rn 'relay-launch-gpt\|relay-site-showcase-dark'` outside `videos/` returns nothing, but `videos/README.md` documents both in a table (Claude final cut / GPT alternate cut / site showcase) with their sources and rendering commands. `du -h` gives `videos/relay-launch-gpt.mp4` 22M, `videos/relay-site-showcase-dark.mp4` 23M, `videos/relay-launch.mp4` 26M, `videos/source/` 9.9M. The site plays the re-encoded 6.1 MB `website/public/videos/relay-launch.mp4` (`d1a2b3d` commit message: "the web copy has no audio track and is 6.2 MB instead of 26.6 MB"), so no page downloads the 26 MB master.
- **`videos/relay-launch-gpt.mp4` is byte-identical to the file `f28eb91` committed as `relay-launch.mp4`** — `git rev-parse f28eb91:videos/relay-launch.mp4` and `git rev-parse HEAD:videos/relay-launch-gpt.mp4` both return `da9becf0073631e021ffb8d91b7d9e790300d1c4`. That is explained by `cb801f1` replacing `relay-launch.mp4` with the 52.35 s Claude cut: the earlier `relay-launch.mp4` was the 54.87 s render, and `ffprobe` on the archived GPT file gives `duration=54.869000`, matching `videos/source/gpt/beat-verification.json` (`"duration": 54.866667`) and `videos/README.md`'s "54.9 s". So the blob is the GPT cut and the _earlier_ filename was the mislabel — one blob, not a duplicate in `HEAD`.
- **Pricing copy in the repository is consistent with the disabled product.** `website/lib/plans.ts` gives Creator and Team `price: "TBD"`, `status: "Not available yet"`, `cta: null`, which `PricingPlans.tsx:78-84` renders as a disabled "Not available yet" button; `PricingFaq.tsx:22-31` says "Not available yet, and prices are not set"; `Home.tsx:77` says "Free plan. No card needed." The only "coming soon" items (`plans.ts:24,29,38,60`, `PlanComparison.tsx:35`) match `docs/product/subscription-plans.md` (uploads, Team storage). Free's features check out against the app and the doc: password-protected portals exist (`convex/clientPortals.ts:126-163`), embedded-video review for YouTube/Vimeo with timestamps and payment tracking are documented as Free capabilities. No trial-length or checkout claim survives in the committed marketing tree — only in the video (F2) and in uncommitted production (F1).
- **The hero video is CSP-safe.** `website/next.config.mjs` sets no `media-src`, so media falls back to `default-src 'self'`; the video is served same-origin at `/videos/relay-launch.mp4` (`HTTP 200 type=video/mp4`). Nothing external is loaded by it.
- **The committed repo's own link inventory resolves.** Internal hrefs used by the site are `/`, `/features`, `/pricing`, `/roadmap` and all four have route files under `website/app`; `sitemap.ts` lists exactly those four, and `robots.ts` disallows only `/api/`. External: `relay-app.cc.cd/` `privacy` `terms` `contact` `accessibility` `llms.txt` all return `HTTP 200`; `/early-access` and `/api/early-access` return `HTTP 404` matching `scripts/verify-browser-smoke.mjs:89-90`; `x.com/znsstudios` returns 200; the footer mailto and the app's own contact address are consistent with `website/lib/links.ts:4`. (The _deployed_ mailto differs from the repo's — that is F1, not a broken link.)

---

## 3. NOT VERIFIED

- **Which exact revision production runs (F1).** I proved the deployed build is not `main` and matches the unmerged `feature/marketing-relaunch` branch on four markers, plus two details present in no commit I can reach. I could not read the Cloudflare Workers deploy history, the `relay-web` build logs, or any other deployment source, and I did not enumerate every remote branch's full tree (only the three named `marketing-relaunch`, `contact-mailto`, `hero-launch-video` were inspected).
- **`GITHUB_TOKEN` on the `relay-web` Worker (F3).** No Cloudflare credentials, so I could not run `wrangler secret list` or read Worker logs to distinguish "secret absent" from "secret present but rejected by GitHub". I also could not check whether `screen-gd/Relay` issues carry the `roadmap` / `ai-roadmap` labels (`website/lib/roadmap.ts:4`): the repo is private, and the only authenticated GitHub identity on this machine is `git.capy.ai` (`gh auth status`), while `https://api.github.com/repos/screen-gd/Relay/issues` returns `HTTP 404` unauthenticated. So even after the token is fixed, an empty roadmap (`RoadmapEmpty`, "No upcoming features are listed yet.") has not been ruled out.
- **The committed alternative-host routing.** `website/wrangler.jsonc` declares no `routes` or custom-domain entry (only `workers_dev: true`), so I cannot tell from the repo whether `web.relay-app.cc.cd` is bound by dashboard configuration. The live host answers, so it is bound somewhere outside the repo.
- **Video content beyond the closing card.** I read the last frames and the sources' outro; I did not audit the whole 52 s for other stale product claims (e.g. the "workrelay.dev/..." browser chrome in the mockups of both cuts is presumably the same stale host, but I only verified the outro and the source strings).
- **Whether the Instagram link is live.** `https://www.instagram.com/zns.studios/` returned `HTTP 429` from this machine (rate limited), not a 404; I could not confirm the profile exists.
- **The 23 MB site-showcase video's content.** I confirmed it is committed, documented and unreferenced; I did not re-watch it for stale copy from the pre-`06739c5` marketing site.
