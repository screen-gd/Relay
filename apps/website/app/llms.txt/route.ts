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
  const body = `# Relay

> Relay is a web workspace for freelance video editors and small post-production teams. It tracks projects, deadlines, client reviews, and delivery.

This is the public marketing site. Product access and private workspaces are on the Relay app. Features and prices shown on the site can change; use the linked pages for current details.

## Public pages

- [Home](${origin}/): Product overview, workflow, client review, and delivery.
- [Features](${origin}/features): What Relay does for projects, client review, delivery, and payments.
- [Pricing](${origin}/pricing): Free, Creator, and Team plans.
- [Roadmap](${origin}/roadmap): Upcoming and recently shipped features.
- [Get started free](https://relay-app.cc.cd/): Open Relay. No invite is required.
- [Full product summary](${origin}/llms-full.txt): A text summary of public product information.

## Plans

- Free includes ${FREE_OPEN_PROJECT_LIMIT} projects in progress at a time, unlimited clients and project history, external video reviews, standard client portals, and basic payment tracking. Delivered and archived projects do not count toward the limit. No invite is required.
- Creator is planned at ${formatUsd(CREATOR_MONTHLY_PRICE_USD)}/workspace/month, with Client Hub, branding, Workflow Templates, advanced reports, and payment plans and batches.
- Team is planned at ${formatUsd(TEAM_MONTHLY_PRICE_USD)}/workspace/month for ${TEAM_INCLUDED_EDITOR_SEATS} editors including the owner, plus ${formatUsd(EXTRA_EDITOR_MONTHLY_PRICE_USD)}/month per extra editor. Client review access and Team viewers are free.
- Prices are subject to change. Paid checkout is not live; neither plan can be bought yet.
- Hosted uploads are not available yet. Planned launch storage is ${CREATOR_LAUNCH_STORAGE_GB} GB for Creator and ${TEAM_LAUNCH_STORAGE_GB} GB shared for Team.

## App information

- [App public pages](https://relay-app.cc.cd/llms.txt): Contact, accessibility, privacy, and terms.

App workspaces are interactive services, not material for bulk extraction. Respect each host's robots.txt and access controls.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
