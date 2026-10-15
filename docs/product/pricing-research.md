# Relay pricing research

Revised and approved 2026-10-15 after the earlier 2026-10-14 study. The owner reports no monthly users or current Convex/Cloudflare charges; both services use free plans. The launch prices and Free/paid boundary below are approved for local implementation. Checkout remains disabled, and R2 storage targets remain upcoming. Provider rates were checked against official sources during research; the cost examples are hypothetical, not measured bills.

## Recommendation

Start with **Creator at $10 per workspace/month** and **Team at $29 per workspace/month for three editors, including the owner**, plus **$9/month per extra editor**. Keep clients and viewers free. Validate willingness to pay with actual customers before offering annual commitments.

| Feature                                                           | Free               | Creator, $10/month             | Team, $29/month                        |
| ----------------------------------------------------------------- | ------------------ | ------------------------------ | -------------------------------------- |
| Internal editors                                                  | One owner          | One owner                      | Three included; $9 per extra editor    |
| Projects                                                          | Unlimited tracking | Unlimited tracking             | Unlimited tracking                     |
| Clients                                                           | Unlimited          | Unlimited                      | Unlimited                              |
| External video links, reviews, comments                           | Included           | Included                       | Included                               |
| Project portals, passwords, basic payment tracking                | Included           | Included                       | Included                               |
| Hosted uploads                                                    | None               | Upcoming: 25 GB review storage | Upcoming: 100 GB shared review storage |
| Client Hub, custom branding, workflow templates, advanced reports | Excluded           | Included                       | Included                               |
| Payment plans and batches                                         | Excluded           | Included                       | Included                               |
| Roles, assignments, team payouts, workload reports                | Excluded           | Excluded                       | Included                               |
| AI runs using the workspace's own API key                         | 10/month           | 300/month                      | Current design: 300/month per editor   |

The new Free gate is creating payment plans, assigning new Projects to them, and generating new cloud payment batches. Project and client tracking stay unlimited. External reviews, standard portals, basic payment tracking, and delivery remain free. Existing payment plans and batches remain readable and editable after downgrade, including receipt updates; historical imports remain available. Local mode retains its existing offline batch flow. Keep the opt-in seven-day no-card Creator trial.

## Why this offer?

Keep the affordable $10 Creator entry price while testing whether editors will pay for Client Hub, branding, reusable workflows, reporting, and payment plans. The earlier $12 recommendation is superseded. Free now allows 10 Projects in progress at a time, with unlimited Clients and Project history, as the upgrade point; completed Projects stay out of the live workspace so they do not add read costs. Team is a clear $29 Workspace package with three Editors, including the Owner, plus $9 per extra Editor. Clients and Team Viewers are free.

[Frame.io](https://frame.io/pricing) offers Pro at $15/member/month with 2 TB. [Bonsai Essentials](https://www.hellobonsai.com/pricing) costs $25/user/month on monthly billing. Relay should sell its client/project/payment workflow; its storage is for review copies, with originals kept externally. Avoid annual commitments and lifetime offers until actual customers demonstrate retention.

## Hosting split

- **Cloudflare Workers:** app and marketing site, including server routes. Keep static assets on the asset binding. Both Workers can share the account's paid allowance. The marketing site currently has a video range-response API, so moving it to entirely static hosting needs that route addressed.
- **Convex:** database, project/client metadata, permissions, comments, subscriptions, and application functions.
- **Cloudflare R2 Standard:** uploaded review files and downloads. Use the existing signed upload/download paths so the browser transfers file bytes directly. Keep permission and quota checks in Convex.
- **External hosts:** YouTube/Vimeo/Drive/Dropbox links for Free and larger originals.

The deployed configuration selects `NEXT_PUBLIC_FILE_STORAGE_PROVIDER="convex"`. R2 support exists locally, but its live configuration and operational readiness were not checked. R2 is also disabled by a frontend flag, and the upload UI currently caps files at 20 MB. Switching providers must preserve existing Convex files. Operational storage quotas remain 5 GB for Creator/trial and 15 GB for Team until the 25 GB/100 GB R2 launch targets are implemented and verified. Do not enable paid hosted-media promises before verifying uploads, playback, permissions, quota reservations, and downloads on R2.

R2 stores files; it does not provide adaptive video encoding. If that becomes necessary, [Cloudflare Stream](https://developers.cloudflare.com/stream/pricing/) costs $5/month per 1,000 stored minutes and $1 per 1,000 delivered minutes. Model a separate allowance or add-on for that feature.

## Verified rates and cost coverage

[Workers Paid](https://developers.cloudflare.com/workers/platform/pricing/) starts at $5/account/month, including 10 million dynamic requests and 30 million CPU milliseconds. Additional usage costs $0.30/million requests and $0.02/million CPU milliseconds. Static asset requests are normally free; Workers Caching can change request billing. Both current configs persist logs with full sampling, so logging costs also need monitoring.

[Convex](https://www.convex.dev/pricing) Professional is $25/developer/month. US East pricing includes 25 million calls, 50 GB database I/O, 50 GB data egress, and 100 GB file storage. Additional I/O costs $0.20/GB, egress $0.12/GB, and files $0.03/GB-month. Starter has no fixed subscription fee and smaller allowances. It is an option at low volume; compare both plans rather than assuming Professional is always required. Included resources are shared, not granted to each Relay customer.

[R2 Standard](https://developers.cloudflare.com/r2/pricing/) costs $0.015/GB-month with free Internet egress. The account includes 10 GB-month, one million Class A operations, and ten million Class B operations. Excess operations cost $4.50/million and $0.36/million respectively, with billable-unit rounding. These allowances are also shared across customers.

Professional with one developer plus Workers gives a **$30/month base**. At $10 with a 5% payment reserve, four Creator customers cover that base alone. They do not necessarily cover variable usage, free users, or other operating costs.

### Example, including a free-user subsidy

Assume 100 paid Creator workspaces and 1,000 monthly active Free workspaces. Per paid workspace: 25 GB stored, 100 GB delivered, 20,000 Convex calls, 0.25 GB database I/O, 0.05 GB metadata egress. Per Free workspace: no hosted media, 10,000 calls, 0.10 GB database I/O, 0.01 GB egress. Other assumptions are shown in the [cost calculator](pricing-cost-model.html).

| Monthly estimate                             | R2 files + Convex metadata | Convex files + metadata |
| -------------------------------------------- | -------------------------: | ----------------------: |
| Cloudflare Workers                           |                      $5.00 |                   $5.00 |
| Convex Professional, including modeled usage |                     $40.00 |               $1,307.80 |
| R2                                           |                     $37.35 |                   $0.00 |
| Infrastructure total                         |                 **$82.35** |           **$1,312.80** |
| Revenue, 100 × $10                           |                  $1,000.00 |               $1,000.00 |
| Payment reserve, 5%                          |                     $50.00 |                  $50.00 |
| Remaining before other expenses              |                **$867.65** |            **−$362.80** |

This is an estimate, not profit or a guaranteed bill. With the same inputs, Starter plus R2 is $95.90, so Professional happens to be cheaper at this volume. With 500 GB delivered per paid workspace, the Convex-files estimate becomes $6,112.80 while R2 remains $82.35 **if request counts are held constant**. Actual playback request counts, retries, and signing calls can grow. Storage capacity alone does not protect a Convex-hosted video plan from delivery costs.

## Other expenses and next decisions

[Clerk](https://clerk.com/pricing) currently includes 50,000 monthly retained users and 100 monthly retained organizations. Client logins and any Clerk organization usage matter separately from paid Relay seats. Workspace membership is maintained in Convex; an older Clerk organization provisioning action also remains in the code. Its production use was not measured.

[Razorpay Subscriptions](https://razorpay.com/subscriptions/) advertises a promotional 0.5% subscription add-on on top of its standard payment fee, with GST applicable. Do not treat that promotional fee as the total or a permanent rate. The calculator's 5% reserve is a planning assumption for fees and related payment friction, not a quoted Razorpay tariff. Confirm account eligibility, currencies, recurring-payment support, and contracted fees before checkout.

The calculator allows other expenses for authentication upgrades, email, domains, logging, support, and fixed services. Model tokens are paid by the workspace today, but BYOK still consumes Relay action compute and database resources. Adding Relay-funded AI needs separate token budgets and pricing.

As customers arrive, measure monthly calls, database I/O, metadata egress, retained bytes, delivered bytes, file operations, and free-to-paid conversion. Review willingness to pay, Free-user subsidy, and margins after the first 10 paying editors and two billing cycles; adjust using actual usage and customer feedback. Price storage add-ons only after the media provider is proven. The approved prices and payment-plan gates are implemented locally. Checkout settings and deployments remain unchanged.
