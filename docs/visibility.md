# Relay visibility and promotion

Research date: 2026-10-02. All external sources below were accessed on that date.

Marketing site: https://web.relay-app.cc.cd/ . App: https://relay-app.cc.cd/ . Framework: Next.js 16.3.6, deployed through OpenNext on Cloudflare Workers.

Primary audience: freelance video editors working with creators and brands. Small post-production teams are a future commercial audience, because Creator and Team are currently planned offers. Geography: English-speaking users worldwide, inferred from the site; no narrower customer market was supplied. Primary conversion: create a first real project on Free. Supporting outcomes: return within a week, send a client review link, and deliver a project. Account creation alone does not prove activation.

Scope: public discovery, technical fixes, search-account handoff, AI access, content, organic marketing, and earned publicity. No deployment, DNS change, account submission, outreach, publication, or spending occurred. No browser testing was performed.

## Findings and actions

| Priority | Finding and evidence                                                                                                                                                                                                                                                                                     | Status                                | Next action                                                                                                                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0       | Production marketing HTML declares `https://relay-app.cc.cd` as its canonical and Open Graph URL. Its robots file points to the app sitemap; its own sitemap lists the app root. The app root returns 200 with `noindex, nofollow`. These are different pages, not duplicate product pages.              | Fixed locally, not deployed           | Deploy the marketing build with its own origin, then inspect the live canonical and sitemap before requesting indexing.                                                                                      |
| P0       | Marketing schema and both existing AI text summaries also inherit the app origin, including a pricing link that lands on the app rather than the marketing pricing section. The shared `NEXT_PUBLIC_SITE_URL` is used by both apps; the root production environment assigns it the app host.             | Fixed locally, not deployed           | Use `NEXT_PUBLIC_MARKETING_SITE_URL=https://web.relay-app.cc.cd` for the marketing build. Keep the app's `NEXT_PUBLIC_SITE_URL` unchanged.                                                                   |
| P1       | Google and Bing ownership, sitemap submission, selected canonical, indexing, impressions, and search referrals are unknown. No provider account reports were available.                                                                                                                                  | Blocked on owner access               | Follow the account steps below. A public HTTP 200 is not indexing evidence.                                                                                                                                  |
| P1       | HTTP marketing root returns 200 rather than redirecting to HTTPS. HTTPS also returns 200.                                                                                                                                                                                                                | Hosting handoff                       | In the Cloudflare account for this exact host, review and enable an HTTP-to-HTTPS redirect. Recheck the HTTP status and Location after an authorized change. Do not redirect this marketing host to the app. |
| P1       | The marketing site has no analytics integration in its layout. The app already has Vercel Analytics, Speed Insights, and typed, consent-based activation events. A configured collector and usable reports were not verified. Campaign attribution across the marketing-to-app transition is unverified. | Measurement gap                       | Check the existing dashboards and collector before adding tracking. Do not infer campaign activation from a marketing page view.                                                                             |
| P2       | Meaningful product, review, payment, and pricing text appears in the initial marketing HTML despite client components. There is one H1, and all in-page navigation anchors resolve. Home is the only intended indexable marketing page; `/waitlist` redirects to the app.                                | Verified over HTTP and generated HTML | Keep the current public route inventory; add a content page only when there is useful original material.                                                                                                     |
| P2       | Marketing root, robots, sitemap, AI summaries, and social image return 200; a nonexistent path returns a genuine 404. App contact, accessibility, privacy, and terms all return 200 with appropriate titles and self-canonicals.                                                                         | Verified over HTTP                    | Preserve app workspace and portal exclusions and genuine 404s.                                                                                                                                               |
| P2       | Social preview is PNG, 1774 × 887, 1,248,781 bytes. Metadata dimensions match. Font configuration already uses `display: swap`.                                                                                                                                                                          | No change needed                      | The image size alone does not establish a page-load bottleneck. Measure field performance before optimizing assets or animation.                                                                             |
| P2       | Sample clients and projects are explicitly fictional. There are no verified customer results available for this run. Free is open; Creator and Team are not purchasable.                                                                                                                                 | Content constraint                    | Use product demonstrations. Collect a permission-backed customer story before making outcome claims or pitching a success story.                                                                             |

Google treats canonicals as signals for equivalent content; the marketing page should identify itself, not an unrelated application entry screen. The URL fix uses the existing shared marketing metadata helper, so every caller receives the same correction. The new setting is documented in `website/.env.example` and the marketing Worker configuration. Next.js resolves relative metadata against `metadataBase`. Sources: [Google canonical guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [Next.js metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata).

### Verification

- Installed existing dependencies with `pnpm install --frozen-lockfile`; no dependency or lockfile change was needed.
- `pnpm --dir website lint` passed.
- `pnpm --dir website build:next` passed on Next.js 16.3.6.
- `pnpm --dir website test:visibility` passed. One runnable check covers the shared app-origin collision, empty/whitespace defaults, and a normalized marketing override.
- Generated homepage HTML, robots, and sitemap checks passed for the marketing canonical, Open Graph URL, image URL, schema URL, indexability, and navigation anchors.
- HTTP checks against the local production server confirmed both AI text routes use the marketing host while preserving app-access links, and `/waitlist` retains its 308 redirect to the app.

Before: five discovery surfaces used the app origin: canonical, Open Graph URL, schema, sitemap/robots, and AI summaries. After: all five use the marketing origin in the local build/runtime. Production still has the earlier configuration until deployment. This is a correctness comparison, not a measured performance improvement. LCP, INP, CLS, actual crawler visits, rankings, and traffic remain unmeasured.

## Search and AI discovery handoff

1. At the next authorized marketing deployment, set `NEXT_PUBLIC_MARKETING_SITE_URL` in the **build environment**. Worker runtime variables alone do not rewrite statically generated metadata. The fallback also uses the correct marketing host and ignores the app's setting.
2. Fetch the deployed `/`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`, and `/llms-full.txt`. Confirm marketing URLs use `https://web.relay-app.cc.cd`, while Get started links still use the app. Check missing URLs still return 404.
3. Open [Google Search Console](https://search.google.com/search-console/). Select the owner's existing property if it covers this host. Otherwise create a URL-prefix property for `https://web.relay-app.cc.cd/`, or a Domain property for `relay-app.cc.cd` if the owner controls its DNS. Use the actual supplied verification tag or DNS record; none was invented or added. URL-prefix properties cover the exact prefix, while Domain properties cover subdomains and protocols. [Ownership instructions](https://support.google.com/webmasters/answer/9008080).
4. After verification and deployment, submit `https://web.relay-app.cc.cd/sitemap.xml`. Inspect the marketing homepage, compare user-declared and Google-selected canonical, and request indexing once if appropriate. Record ownership verified, sitemap submitted, and indexing observed separately.
5. In [Bing Webmaster Tools](https://www.bing.com/webmasters/), import the verified Search Console property or verify this exact marketing host with the owner's supported method. Submit the same marketing sitemap. [Bing setup instructions](https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b).
6. Review indexing after 7 and 28 days from deployment. Record dates and provider results here. These are review intervals, not promises about indexing speed.

The marketing robots policy allows public crawling except `/api/`. No bot-specific training choice was present in the returned file; this run did not change crawler policy. Diagnostic requests naming Googlebot and OAI-SearchBot returned 200 without a `cf-mitigated` header. They do not prove access for verified crawlers. Cloudflare also injects a challenge-platform script into some returned pages; review Search Console inspection and actual crawler logs before changing WAF rules.

Preserve the existing `llms.txt` files as product summaries; the origin correction fixes their links. Google does not use these files as a special visibility mechanism. OpenAI documents OAI-SearchBot for search separately from GPTBot for training. No new bot allow group, WAF exception, or AI markup was added. Sources: [Google AI guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots).

Keep existing WebApplication data. Do not invent ratings to qualify for software-app rich results. There is no need for breadcrumbs on a single-page marketing site. IndexNow automation is deferred because there is one slowly changing public page and no verified key/submission workflow. Sources: [Google software-app eligibility](https://developers.google.com/search/docs/appearance/structured-data/software-app), [IndexNow protocol](https://www.indexnow.org/documentation).

## Positioning and content

Working message: **Relay keeps editing projects, client review, delivery, and payment status in one workspace. Start on Free.**

Use current product facts: unlimited projects and clients on Free, embedded video review and comments, client portals, and payment tracking. YouTube and Vimeo support playback timestamps; Drive and Dropbox use manual timestamps. Relay manages work around editing; it does not replace an NLE or collect client payments. Cloud client review requires an account. Do not promote planned paid uploads, storage, team seats, or advanced reports as current Free features.

The strongest content opportunity is one demonstrated workflow, reused across channels. Adjacent industry content discusses client-review practices and keeping project work together; this supports the topic, not a traffic or revenue estimate. [Frame.io's editor workflow article](https://blog.frame.io/2020/04/06/10-things-editors-need-to-know-before-working-from-home/).

| Intent hypothesis, not measured search volume  | Existing destination            | Useful evidence to publish next                                                                                 |
| ---------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Project management for freelance video editors | Marketing home and `/#workflow` | One real example from brief to delivered output, with fictional data clearly labeled if necessary.              |
| Collect feedback on a client video             | `/#client-review`               | Demonstrate linked video, timecoded comment, revised version, and approval; explain cloud-account requirements. |
| Track editing deadlines and unpaid projects    | `/#delivery` and `/#payments`   | Show due date, delivered state, agreed fee, and paid/unpaid status. Do not imply payment collection.            |
| Free editing project tracker                   | `/#pricing`                     | Explain current Free access and the distinction between available and planned plans.                            |

### Ready-to-review resource draft

**Title:** A client review checklist for freelance video editors

Before sending a cut, agree on the output, format, due date, and who can approve it. Attach the current version to its project and make sure the review link opens for the intended client. In Relay, use a cloud account for a client portal.

Ask for each note to name the timecode, requested change, and reason. YouTube and Vimeo playback can supply timestamps; add timestamps manually for Drive or Dropbox links. Keep comments attached to the version the client watched.

When you revise the cut, add the next version and keep the previous notes available. Resolve completed feedback, confirm approval, then mark the output and project delivered. Record the agreed fee and payment status separately from approval.

Try the workflow on your next project: https://relay-app.cc.cd/ . Relay's Free plan includes embedded video comments and payment tracking.

Status: draft, not published. First use as a social caption or newsletter resource. If readers find it useful, turn it into a public guide with original screenshots and a home-page link. Do not create a blog engine or thin keyword pages for this experiment.

## Four-week organic plan

All timing starts after the live origin fix is verified. No ad budget is assumed. Effort estimates and continuation thresholds are recommendations, not measured forecasts.

| When   | Audience and channel                                                                                                       | Destination / asset                                                        | Outcome and review                                                                               | Effort / status                                                                          |
| ------ | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Week 1 | Search users evaluating a project tracker                                                                                  | Verified marketing home and sitemap                                        | Capture indexing and impression baseline; review after 7 and 28 days                             | About 1 hour of owner setup; blocked on deployment/account access                        |
| Week 1 | Freelance editors via existing [X](https://x.com/znsstudios) and [Instagram](https://www.instagram.com/zns.studios/) links | Existing social preview plus the drafts below; review section landing page | Relevant replies, app visits if measured, first real project, weekly return; review after 7 days | About 2 hours to prepare a short demonstration; copy drafted, account control unverified |
| Week 2 | Post-production readers via Cut/daily                                                                                      | Product overview, checklist draft, 20-second demo if recorded              | Editorial response and qualified referrals; review after 14 days                                 | About 1 hour; pitch drafted, not sent                                                    |
| Week 3 | Editors following ProVideo Coalition                                                                                       | Free workflow evaluation pitch and product link                            | Relevant coverage, questions, and activated users; review after 14 days                          | About 1 hour; pitch drafted, not sent                                                    |
| Week 4 | Users acquired from the above                                                                                              | Ask willing users for feedback and permission to document one workflow     | A credible case study or specific product objection                                              | About 2 hours; no customers or outcome claims supplied                                   |

Choose one distribution asset first. Proposed demo script: 0–5 seconds, open a fictional project and show its deadline; 5–10, open the linked video version; 10–15, show one timecoded review note; 15–20, show delivery and unpaid status, then “Get started free.” Keep fictional names labeled. Record only current Free functionality. This script is a draft, not a completed video.

Reuse `website/public/brand/relay/social-preview.png` for the first image post. The existing logo pack is in the same folder. Do not use fictional demo activity as customer proof.

### Social drafts

Intended account: the site's linked `znsstudios` X account, subject to confirming owner control before publication. Asset: existing social preview. Destination:
`https://web.relay-app.cc.cd/?utm_source=x&utm_medium=organic_social&utm_campaign=free_workflow#client-review`

> I’m building Relay for freelance video editors: projects, deadlines, client feedback and payment status in one workspace. The Free plan is open. Take a look: [campaign link above]

Instagram account: the site's linked `zns.studios`, subject to confirming owner control. Asset: the same preview, followed by the proposed demo when ready. Caption:

> One project. One current cut. One place for client notes.
>
> Relay tracks editing deadlines, embedded video feedback, delivery and payment status. Start on Free. No invite required.
>
> Product link in bio.

Proposed bio destination, not changed:
`https://web.relay-app.cc.cd/?utm_source=instagram&utm_medium=organic_social&utm_campaign=free_workflow`

Both drafts are unpublished. Public social profiles could not be inspected through the research tool, so follower counts, engagement, account ownership, and posting eligibility are unknown. These are first-party channel experiments selected from existing site links, not claims about current audience reach.

## Publicity shortlist and pitches

### 1. Cut/daily, first priority

Fit: a specialist post-production newsletter. Its September 25, 2026 issue, **DIY Post Production Tools**, covers solo-built tools for real workflow gaps and invites builders to get in touch. Its current contact page explicitly accepts material for subscribers through a form. This is a stronger fit than generic startup press. [Recent issue](https://www.cut-daily.com/514-diy-post-production-tools/), [contact form](https://www.cut-daily.com/contact/).

Destination: the public contact form. Editorial consideration only; no sponsorship budget. Proposed sender: Screen, Relay's maker, using an owner-selected reply address. Evidence: live product, visible Free-plan terms, checklist above, approved logo/preview. A recorded demo and founder availability still need to be supplied.

**Subject:** Relay: a free project and client-review workspace for freelance editors

> Hi,
>
> Your September 25 issue on DIY post-production tools caught my attention. I’m Screen, a solo product developer building Relay for freelance video editors.
>
> Relay tracks projects, deadlines, linked video versions, client comments, delivery and payment status. Its Free plan is open without an invite. Creator and Team are planned, rather than available paid offers.
>
> The workflow is demonstrated here: https://web.relay-app.cc.cd/ . The app is at https://relay-app.cc.cd/ . I’ve also prepared a short client-review checklist if that would be useful to your subscribers.
>
> Would Relay fit a future tools roundup?
>
> Screen

Status: draft, not sent. No quotation, endorsement, customer savings, or editorial acceptance claimed.

### 2. ProVideo Coalition, second priority

Fit: a publication for video and post-production professionals. Scott Simmons is listed as PVC Staff and has current editing coverage, including a September 29, 2026 Premiere workflow tip. Proposed angle: evaluate how a free web workspace handles freelance deadlines, review notes, and payment records around the NLE. This is a product evaluation idea, not a claim that Relay changes editing itself. [Staff profile](https://www.provideocoalition.com/author/ssimmons/), [recent article](https://www.provideocoalition.com/tool-tip-tuesday-for-adobe-premiere-pro-why-cant-i-drag-my-clip-to-the-timeline/).

Destination: the publication's general `contact@provideocoalition.com`, as displayed on its [current contact page](https://www.provideocoalition.com/contact-us/), requesting routing to the relevant editor. No personal contact preference for Scott was verified. Do not use the site's app-support contact or the old 2008 news address. Evidence: live app, Free feature list, clearly labeled demonstration data. No independent customer study yet.

**Subject:** Review idea: tracking freelance video work around the edit in Relay

> Hello ProVideo Coalition team,
>
> I’m Screen, the maker of Relay. Could you route this product evaluation idea to the editor covering post-production workflows?
>
> Relay is a web workspace for freelance video editors. Free includes projects, clients, embedded video comments, client portals, delivery tracking and payment status. Editors continue using their existing editing software. Relay does not process client payments, and paid uploads and team plans are still planned.
>
> Product and workflow examples: https://web.relay-app.cc.cd/ . The app is open at https://relay-app.cc.cd/ . A useful evaluation would be to take one edit through deadline planning, client notes, delivery and payment tracking.
>
> Would that be useful for your readers?
>
> Screen

Status: draft, not sent. No review, backlink, or coverage is assured. Send only after the live fix and explicit outreach authorization; use the owner's approved sender/reply address. Recheck contact details before sending and respect any opt-out.

### Channels deferred

- Product Hunt: plausible later once the demo and account are ready, but weaker initial audience fit than editor publications. Organic sharing is allowed; coordinated voting and mass vote requests are not. [Promotion rules](https://help.producthunt.com/en/articles/2690626-how-do-i-share-my-post).
- Show HN: technically plausible because Local Mode lets visitors try the app, but the intended buyers are editors. Do not submit only the marketing page or a sign-up gate. [Show HN rules](https://news.ycombinator.com/showhn.html).
- r/editors and r/VideoEditing: do not launch with promotional posts. A current moderator removal explicitly says both communities prohibit self-promotion; full current rule pages were not readable without further access. Obtain exact moderator permission for any proposed exception rather than assuming it. [Moderator statement](https://www.reddit.com/r/VideoEditing/comments/1tuo3j2/removed/).
- Broad press releases, mass directory submissions, paid placements, new social accounts, and automated outreach: insufficient evidence or budget to justify them in this run.

## Measurement and resume checklist

Baseline: unknown, not zero. Record the last 28 days of marketing impressions, clicks, indexed URLs, branded/non-branded queries, referral visits, first-project creation, and weekly return if the existing tools expose them. App event names include `activation` with milestone `first_project_created`, `weekly_return`, and `project_delivered`; their existence in code does not prove delivery to a dashboard.

Use the UTM convention above only for external campaign links. Leave internal navigation and canonicals clean. If existing reports cannot connect the two hosts, report visits and app activation separately and use voluntary feedback about discovery. Do not silently add identifiers or attribute all activation to the latest post. [Campaign parameter guidance](https://support.google.com/analytics/answer/10917952).

For each experiment, record publication/send date, exact destination, approved message, referral count if available, qualified replies, and activation evidence. Suggested continuation rule: repeat a channel when the first two posts or one pitch produce useful conversations with editors or attributable activation. With no useful response, change the demonstration or stop that channel before spending money. Review organic search over a longer window than a social post.

Outstanding owner steps: authorize the concrete marketing deployment when ready; verify the search property; provide account access or actual verification values if setup is delegated; approve the sender and exact recipients/messages before outreach; confirm control of linked social accounts before posting; record a demo or approve use of the existing preview. No external action has been attempted, so there are no uncertain submissions to retry.
