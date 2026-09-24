import { siteUrl } from "@/lib/site";

export function GET() {
  const body = `# Relay app

> Relay is a video production workspace for editors and small teams. This host serves the app and its public legal and support pages.

The workspace, account pages, client hub, and token-based client portals may contain private information. They are not part of the public content index. Use the marketing site for product descriptions.

## Public pages on this host

- [Contact](${siteUrl}/contact): Product support and inquiries.
- [Accessibility](${siteUrl}/accessibility): Accessibility goals, support, and known limitations.
- [Privacy policy](${siteUrl}/privacy): How Relay handles information.
- [Terms of service](${siteUrl}/terms): Terms for using Relay.
- [Sitemap](${siteUrl}/sitemap.xml): Public pages listed for crawlers.

## Product information

- [Marketing site](https://web.relay-app.cc.cd/): Product overview and waitlist.
- [Full product summary](https://web.relay-app.cc.cd/llms-full.txt): Text summary for readers and agents.

Follow ${siteUrl}/robots.txt and each page's access controls. This file does not grant access to private content or set permissions for AI training.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
