# Relay subscription plans

Status: Free-only launch on September 18, 2026; future payments use Razorpay

Only Free is available for the September 18 launch. Creator, Team, extra Editor
Seats, and Storage Add-ons are future offers, not available for purchase. Free-only
does not unlock paid capabilities for everyone: the existing Free limits apply.
A Workspace owns one Subscription Plan. Clerk remains the authentication provider;
Razorpay is the selected future payment provider. Convex remains the authority for
Workspace entitlements. Clients and Client Contacts do not consume internal seats.

Checkout stays disabled for launch. Do not connect Stripe or activate Clerk
Billing. Razorpay integration and migration of the existing Clerk-specific billing
code are separate post-launch work. Paid prices, currencies, billing periods,
trials, cancellations, and refund terms await ticket 02 approval. No former
Clerk or Stripe commercial terms carry forward. The implementation checklist lives in
`.scratch/subscription-plans/`.

## Plan summary

| Plan    |  Monthly |   Annual | Trial    | Storage                 | Internal Editors   |
| ------- | -------: | -------: | -------- | ----------------------- | ------------------ |
| Free    |       $0 |       $0 | None     | No Relay-hosted uploads | 1 Workspace owner  |
| Creator |  Pending |  Pending | Pending  | 5 GB                    | 1 Workspace owner  |
| Team    | Deferred | Deferred | Deferred | 15 GB shared            | 3 included Editors |

Paid capacities describe the current product design, not approved commercial
offers. Annual discounts and negotiated bundles are not approved.

## Free

Free is for trying Relay and managing basic solo work.

Included:

- Unlimited Projects
- Clients
- Basic workflow tracking
- Basic Reviews and delivery
- Standard project-specific Client Portals
- External Video Embeds
- Owner-managed Salary Plans and Salary Batches

Limits:

- No Relay-hosted file uploads
- No Relay storage quota
- No internal Team Members

External Video Embeds let users reference video hosted on Vimeo, YouTube, Frame.io, or another external service without using Relay storage.

## Creator (post-launch)

Creator is for one freelance editor managing stored project media and client relationships.

Includes everything in Free, plus:

- Relay-hosted file uploads
- 5 GB Storage Quota
- Client Hub
- Custom portal branding
- Custom Workflow Templates
- Advanced reports

Creator supports one internal Workspace owner. Client Contacts remain free and do not become Team Members.

## Team (deferred)

Team is for a small editing team working in one shared Workspace.

Includes everything in Creator, plus:

- 3 included paid Editor seats, including the Workspace owner
- 15 GB shared Storage Quota
- Team Workspace access
- Team roles
- Project assignments
- Team payouts
- Workload reports
- Free internal Viewer access

The current capacity design adds 2 GB per extra Editor. Seat pricing and billing
terms remain deferred, and this capacity is not available for purchase.

Examples:

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
