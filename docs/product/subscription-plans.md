# Relay subscription plans

Status: launch pricing approved 2026-10-15; Free open, opt-in 7-day Creator trial; paid checkout disabled

The Free plan is open to everyone without an invite. Creator, Team, extra Editor
Seats, and Storage Add-ons are future offers, not available for purchase. Free-only
does not unlock paid capabilities for everyone: the existing Free limits apply.
A Workspace owns one Subscription Plan. Clerk remains the authentication provider;
Razorpay is the selected future payment provider. Convex remains the authority for
Workspace entitlements, including the no-card Creator trial. Clients and Client Contacts do not consume internal seats.

Paid checkout stays disabled. Do not connect Stripe or activate Clerk
Billing. Razorpay integration and migration of the existing Clerk-specific billing
code are separate work. Workspace accounting supports multiple currencies. Monthly
launch pricing is approved below. Annual pricing, paid subscription cancellations,
and refund terms remain deferred. The
7-day no-card Creator trial is approved separately. No former
Clerk or Stripe commercial terms carry forward. The implementation checklist lives in
`.scratch/subscription-plans/`.

## Plan summary

| Plan    | Monthly |   Annual | Trial  | Storage                 | Internal Editors   |
| ------- | ------: | -------: | ------ | ----------------------- | ------------------ |
| Free    |      $0 |       $0 | None   | No Relay-hosted uploads | 1 Workspace owner  |
| Creator |     $10 | Deferred | 7 days | 25 GB launch target     | 1 Workspace owner  |
| Team    |     $29 | Deferred | None   | 100 GB launch target    | 3 included Editors |

Team costs $29 per Workspace per month for three Editors, including the Owner,
plus $9/month per extra Editor. Clients and internal Team Viewers remain free.
Annual discounts and negotiated bundles are not approved.

Hosted uploads remain upcoming. The 25 GB/100 GB launch targets depend on a verified
R2 upload and playback path. Current operational quotas remain 5 GB for Creator
(including its trial), 15 GB for Team, and 2 GB per extra Editor. These are not
the advertised launch storage offer; do not increase them or enable R2 as part
of a pricing-copy change.

## Free

Free is for trying Relay and managing basic solo work.

Included:

- 10 Projects in progress at a time
- Unlimited Project history and Clients
- Basic workflow tracking
- Basic Reviews and delivery
- Standard project-specific Client Portals
- Embedded video review and comments
- Basic payment tracking, including updates to existing payment records

Limits:

- No Relay-hosted file uploads
- No Relay storage quota
- No internal Team Members
- Creating payment plans, assigning new Projects to payment plans, and generating
  new payment batches require Creator or Team. Existing plans and batches remain
  readable and editable; receipt/payment updates and historical imports remain available.
- 10 Projects in progress at a time (`FREE_OPEN_PROJECT_LIMIT` in
  `shared/subscription-plans.ts`). A Project counts while it is not delivered,
  cancelled, or archived, so delivering one frees a slot. Creating, reopening a
  delivered Project, and unarchiving all check the limit on the server.
  Workspaces already over the limit keep every Project and can add more once
  they are under it. No active-client cap.
- The Timeline and Calendar show Projects in progress; completed Projects there
  require Creator or Team. History, Reports, and the Dashboard include completed
  Projects on every plan.

## Project history

A Project moves to history when it is archived or cancelled, or when it is
delivered and settled: marked paid, delivered with no agreed amount, or included
in a Salary Batch. Delivered work that is still unpaid stays in the live list.
The rule lives in `convex/projectLifecycle.ts` and is stored on each Project as
`lifecycle`, so the live list and history read separate index ranges.

The workspace subscribes only to the live list. History loads on the History
page (25 at a time, on request) and while Reports, the Dashboard, or a paid
Timeline or Calendar is open. Opening a completed Project loads it on its own,
and it stays editable; reopening it moves it back to the live list.

YouTube and Vimeo embed directly in shared portals and support playback timestamps through their player APIs. Drive, Dropbox and other links support general comments and manual timestamps; clients open those videos with their host. Embedded and linked videos do not use Relay storage.

## Creator (post-launch)

Creator is $10 per Workspace per month for a professional client workflow.

Includes everything in Free, plus:

- Relay-hosted file uploads and 25 GB review storage, upcoming after R2 verification
- Client Hub
- Custom portal branding
- Custom Workflow Templates
- Advanced reports
- New payment plans and batches

Creator supports one internal Workspace owner. Client Contacts remain free and do not become Team Members.

### Free Creator trial

An eligible Free Workspace Owner can start a 7-day Creator trial from Plans and
billing. It is opt-in, requires no card, creates no paid subscription, and makes
no automatic charge. Only Creator has a trial; Team does not.

Trials last 168 hours from the server-recorded start. A Convex scheduled mutation
expires the trial and restores Free entitlements. Capability mutations also check
the server deadline, so a delayed expiry job cannot extend trial privileges. Existing files and projects
remain; new hosted uploads and other Creator-only capabilities become locked.
The trial includes the Creator AI allowance, but does not opt the Workspace into
AI or reset any consumed monthly AI quota.

There is one trial per account and per Workspace. Repeated start requests do not
extend its deadline. Changing Workspace ownership or recreating a Workspace
does not grant another trial to an account that has used one. Paid or delinquent
subscriptions cannot start a trial. Confirmed paid billing takes precedence over
the local trial, and trial expiry never cancels a paid subscription.

Trial records live in `creatorTrials`, separate from provider billing projections,
so a Free-plan reconciliation cannot overwrite an active local trial. Paid
checkout and Clerk Billing activation remain disabled.

## Team (deferred)

Team is for a small editing team working in one shared Workspace.

Includes everything in Creator, plus:

- 3 included paid Editor seats, including the Workspace owner
- 100 GB shared review storage, upcoming after R2 verification
- Team Workspace access
- Team roles
- Project assignments
- Team payouts
- Workload reports
- Free internal Viewer access

The approved extra Editor price is $9/month. Checkout remains disabled.
The current operational capacity design adds 2 GB per extra Editor; launch storage
must be wired and verified separately before hosted uploads are advertised as live.

Current operational quotas, before the R2 launch targets are enabled:

- 3 included paid Editors, including the owner: 15 GB shared
- 4 paid Editors, including the owner: 17 GB shared
- 5 paid Editors, including the owner: 19 GB shared

## Storage add-ons (deferred)

Storage add-ons increase the Workspace's shared Storage Quota.

| Add-on |  Monthly |   Annual |
| ------ | -------: | -------: |
| 50 GB  | Deferred | Deferred |

Storage pack pricing and billing mechanics require a later review of real Convex
and Cloudflare R2 usage and Razorpay support. No custom bundle is approved.

## Access rules

### Team Members

- Owners and Editors are internal Workspace users.
- Included and added Editors consume paid Editor seats.
- Viewers do not consume paid seats.

### Clients

- A Client is separate from Workspace membership.
- A Client can have multiple Client Contacts.
- Client Contacts do not consume paid seats.
- Client Contacts can sign in to the Client Hub.
- The Client Hub shows only Projects explicitly published to that Client.
- The Client Portal remains a project-specific review and delivery page.

## Storage behavior

When a Workspace reaches its Storage Quota:

1. Relay blocks new file uploads.
2. Existing files remain available.
3. Relay shows storage usage and an upgrade notice.
4. Users can delete old archived files, add a Storage Add-on, or use External Video Embeds for future media.
5. Relay never deletes files automatically.

Removing an Editor does not immediately remove storage from the Workspace. If the Workspace remains over quota, new uploads stay blocked until the user removes files or adds storage.

## Out of launch scope

These items are not included in the current launch promise:

- Relay-generated invoices and client payment collection
- Priority support tiers
- Unlimited storage
- Automatic storage overage billing
- A fourth Enterprise plan

## Review points

- Verify Razorpay account eligibility, recurring-payment support, currencies, prices, and trial handling before enabling checkout.
- Design Razorpay subscription-to-Workspace mapping, signed webhooks, reconciliation, and safe migration before replacing the existing Clerk billing paths.
- Confirm Convex and Cloudflare R2 cost assumptions before publishing Team storage add-ons.
- Retire Clerk purchase surfaces and billing authority during the Razorpay migration; keep Clerk authentication.
