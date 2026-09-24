import { siteUrl } from "../../lib/site-metadata";

export function GET() {
  const origin = siteUrl.replace(/\/$/, "");
  const body = `# Relay: public product summary

Relay helps freelance video editors and small post-production teams manage video work in one web workspace. Editors can track clients, projects, deadlines, revisions, deliverables, and payments. The public marketing site is ${origin}/. The app is https://relay-app.cc.cd/.

## Product workflow

- Track a project through editing, client review, revisions, approval, and delivery.
- Keep outputs and their versions with the project. Editors can share a project-scoped client portal for review.
- Clients can view shared work and leave comments where the plan and media type support it.
- Track delivery and payment status. Higher-tier features shown on the site include custom templates, salary plans, reports, and team roles.

## Access and availability

Relay has a waitlist for early testers. The marketing site describes Free, Creator, and Team plans. Creator and Team are marked as coming later on the pricing section. For current prices, limits, and availability, read ${origin}/#pricing rather than treating this summary as a price list.

## Official public links

- Product overview and pricing: ${origin}/
- Waitlist: ${origin}/waitlist
- Contact: https://relay-app.cc.cd/contact
- Accessibility: https://relay-app.cc.cd/accessibility
- Privacy policy: https://relay-app.cc.cd/privacy
- Terms of service: https://relay-app.cc.cd/terms

Private workspaces, client portals, and the waitlist API are outside this public summary. Follow each host's robots.txt. This file describes the product; it does not grant access to private content or set permissions for AI training.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
