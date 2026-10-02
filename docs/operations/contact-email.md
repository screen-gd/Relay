# Support email

The `/contact` page displays `support@contact.relay-app.cc.cd` as a `mailto:`
link. Clicking it opens the visitor’s configured email app to compose a message.
Visitors send the message themselves; Relay does not submit or send email from
its server. An email app or registered webmail handler is needed to open the
link, and the visible address can also be copied into webmail.

Incoming messages are forwarded through Cloudflare Email Routing to
`screen.dev@protonmail.com`. See [support email DNS](contact-email-dns.md) for
routing configuration. Replies from that inbox use the Proton address unless a
separate send-as setup is configured.

## Runtime configuration

No Resend or Turnstile settings are required for contact email. The contact form,
`POST /api/contact` endpoint and five sending-service tests have been removed.
The public email address is defined in `src/lib/support-contact.ts`.

The old `RESEND_API_KEY`, `CONTACT_TURNSTILE_SECRET_KEY`,
`CONTACT_TURNSTILE_SITE_KEY` and `CONTACT_FROM_EMAIL` bindings can be removed
from the `relay` Worker after deploying this change. Do not remove the Cloudflare
Email Routing MX records or the support forwarding rule: they receive emails
sent from visitors’ email apps.

## Verification

Check that `/contact` shows the public address with a matching `mailto:` link
and has no contact form or Turnstile widget. Clicking the link should open a
compose window addressed to support. Delivery still depends on the visitor
sending the message and the receiving route working.
