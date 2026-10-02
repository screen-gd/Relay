import { siteUrl } from "../../lib/site-metadata";

export function GET() {
  const origin = siteUrl.replace(/\/$/, "");
  const body = `# Relay: public product summary

Relay helps freelance video editors and small post-production teams manage video work in one web workspace. Editors can track clients, projects, deadlines, revisions, deliverables, and payments. The public marketing site is ${origin}/. The app is https://relay-app.cc.cd/.

## Product workflow

- Track a project through editing, client review, revisions, approval, and delivery.
- Keep outputs and their versions with the project. Editors can share a project-scoped client portal for review.
- The Free plan includes client comments on embedded videos and linked video versions.
- Track delivery and payment status. Free includes payment tracking and embedded video comments. YouTube and Vimeo support playback timestamps; Drive and Dropbox support manual timestamps. Planned paid upgrades include hosted uploads and review, custom templates, advanced reports, and team roles. Paid prices are not finalized. Workspace accounting supports multiple currencies.

## Access and availability

Relay is open to everyone on the Free plan; no invite is required. The marketing site describes Free, Creator, and Team plans. Creator and Team are marked as coming later on the pricing section. For current prices, limits, and availability, read ${origin}/#pricing rather than treating this summary as a price list.

## Official public links

- Product overview and pricing: ${origin}/
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
