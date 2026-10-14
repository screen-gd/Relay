import { siteUrl } from "../../lib/site-metadata";
import {
  CREATOR_MONTHLY_PRICE_USD,
  TEAM_MONTHLY_PRICE_PER_SEAT_USD,
  formatUsd,
} from "../../lib/plans";

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
- [About](${origin}/about): What Relay is, who builds it, and where the product stands.
- [Privacy & Data](${origin}/privacy-and-data): Where Relay keeps your work, and how to export or delete it.
- [Get started free](https://relay-app.cc.cd/): Open Relay. No invite is required.
- [Full product summary](${origin}/llms-full.txt): A text summary of public product information.

## Plans

- Free is available to everyone. No invite is required.
- Creator costs ${formatUsd(CREATOR_MONTHLY_PRICE_USD)} per month and Team costs ${formatUsd(TEAM_MONTHLY_PRICE_PER_SEAT_USD)} per member per month. Prices are subject to change. Both are still in development, and checkout is not live, so neither can be bought yet.
- File uploads are not available yet.

## App information

- [App public pages](https://relay-app.cc.cd/llms.txt): Contact, accessibility, privacy, and terms.

App workspaces are interactive services, not material for bulk extraction. Respect each host's robots.txt and access controls.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
