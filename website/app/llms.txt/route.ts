import { siteUrl } from "../../lib/site-metadata";

export function GET() {
  const origin = siteUrl.replace(/\/$/, "");
  const body = `# Relay

> Relay is a web workspace for freelance video editors and small post-production teams. It tracks projects, deadlines, client reviews, and delivery.

This is the public marketing site. Product access and private workspaces are on the Relay app. Features and prices shown on the site can change; use the linked pages for current details.

## Public pages

- [Home](${origin}/): Product overview, workflow, client review, delivery, and pricing.
- [Waitlist](${origin}/waitlist): Request an invite to test Relay.
- [Full product summary](${origin}/llms-full.txt): A text summary of public product information.

## App information

- [App public pages](https://relay-app.cc.cd/llms.txt): Contact, accessibility, privacy, and terms.

The waitlist form and app workspaces are interactive services, not material for bulk extraction. Respect each host's robots.txt and access controls.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
