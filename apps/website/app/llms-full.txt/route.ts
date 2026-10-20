import { siteUrl } from "../../lib/site-metadata";
import {
  CREATOR_MONTHLY_PRICE_USD,
  TEAM_MONTHLY_PRICE_USD,
  TEAM_INCLUDED_EDITOR_SEATS,
  EXTRA_EDITOR_MONTHLY_PRICE_USD,
  CREATOR_LAUNCH_STORAGE_GB,
  TEAM_LAUNCH_STORAGE_GB,
  FREE_OPEN_PROJECT_LIMIT,
  formatUsd,
} from "@relay/shared/plans";

export function GET() {
  const origin = siteUrl.replace(/\/$/, "");
  const body = `# Relay: public product summary

Relay helps freelance video editors and small post-production teams manage video work in one web workspace. Editors can track clients, projects, deadlines, revisions, deliverables, and payments. The public marketing site is ${origin}/. The app is https://relay-app.cc.cd/.

## Product workflow

- Track a project through editing, client review, revisions, approval, and delivery.
- Keep outputs and their versions with the project. Editors can share a project-scoped client portal for review.
- The Free plan includes client comments on embedded videos and linked video versions.
- Track delivery and payment status. Free includes payment tracking and embedded video comments. YouTube and Vimeo support playback timestamps; Drive and Dropbox support manual timestamps. Workspace accounting supports multiple currencies.

## Plans and availability

- Free includes ${FREE_OPEN_PROJECT_LIMIT} projects in progress at a time, unlimited clients and project history, external video reviews, standard client portals, and basic payment tracking. Delivered and archived projects do not count toward the limit. No invite is required.
- Creator is planned at ${formatUsd(CREATOR_MONTHLY_PRICE_USD)}/workspace/month, with Client Hub, branding, Workflow Templates, advanced reports, and payment plans and batches.
- Team is planned at ${formatUsd(TEAM_MONTHLY_PRICE_USD)}/workspace/month for ${TEAM_INCLUDED_EDITOR_SEATS} editors including the owner, plus ${formatUsd(EXTRA_EDITOR_MONTHLY_PRICE_USD)}/month per extra editor. Client review access and Team viewers are free.
- Payment plans and payment batches require Creator or Team. Batches made on a paid plan stay visible on Free but cannot be updated.
- Prices are subject to change. Paid checkout is not live; neither plan can be bought yet.
- Hosted uploads are not available yet. Planned launch storage is ${CREATOR_LAUNCH_STORAGE_GB} GB for Creator and ${TEAM_LAUNCH_STORAGE_GB} GB shared for Team.

For current plan details, read ${origin}/pricing rather than treating this summary as a price list.

## Official public links

- Product overview: ${origin}/
- Features: ${origin}/features
- Pricing: ${origin}/pricing
- Get started free: https://relay-app.cc.cd/
- Contact: https://relay-app.cc.cd/contact
- Accessibility: https://relay-app.cc.cd/accessibility
- Privacy policy: https://relay-app.cc.cd/privacy
- Terms of service: https://relay-app.cc.cd/terms

Private workspaces and client portals are outside this public summary. Follow each host's robots.txt. This file describes the product; it does not grant access to private content or set permissions for AI training.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
