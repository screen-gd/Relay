# Direct support email

The `/contact` form submits to Relay’s same-origin `POST /api/contact` endpoint.
The server verifies Cloudflare Turnstile and sends a plain-text email through
Resend to `screen.dev@protonmail.com`. Visitors do not need an email app or
Relay account. The public contact address is `support@contact.relay-app.cc.cd`, forwarded to the selected Proton inbox through Cloudflare Email Routing. Form messages go directly to that inbox, so they do not depend on forwarding.

Their validated email address becomes the reply-to address; they
cannot choose the recipient or sender.

## Enable sending

1. Verify `contact.relay-app.cc.cd` in Resend using the [Cloudflare DNS setup](contact-email-dns.md). Use `support@contact.relay-app.cc.cd` as the sender and forward that public address to `screen.dev@protonmail.com` using Cloudflare Email Routing.
2. Create a Resend API key with sending permission for that domain.
3. Create a Cloudflare Turnstile widget and allow the app hostname. The form sets
   the widget action to `contact`; the server checks both hostname and action.
4. Configure these **app runtime** settings on the host:

| Setting                        | Value                                                                | Handling                                         |
| ------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------ |
| `RESEND_API_KEY`               | Resend sending key                                                   | Server secret                                    |
| `CONTACT_FROM_EMAIL`           | `support@contact.relay-app.cc.cd` (included in Worker configuration) | Server setting                                   |
| `CONTACT_TURNSTILE_SITE_KEY`   | Turnstile widget site key                                            | Public widget key, passed to the form at runtime |
| `CONTACT_TURNSTILE_SECRET_KEY` | Turnstile verification secret                                        | Server secret                                    |

For Cloudflare Workers, set the keys as secret bindings and the sender/site key
as runtime variables in the dashboard (or through Wrangler). For Vercel, use
server environment settings. For local Next.js development, use `.env.local`.
For local Wrangler previews, use `.dev.vars`. These settings belong to the app,
not Convex. Never commit credentials or prefix either secret with `NEXT_PUBLIC_`.

The contact page is rendered at request time so runtime configuration works on
both hosting platforms. Without complete configuration, the send button is
unavailable, the direct email link remains visible, and the endpoint returns
503 rather than claiming a message was sent.

## Behavior and limits

- Name: 1–120 characters; email: a valid address up to 254 characters; message:
  1–4,000 characters. JSON bodies are bounded to 16 KiB.
- Requests require the same origin and a valid, host-specific Turnstile proof.
  Filled honeypots are discarded without sending.
- API keys, verification secrets and provider responses are never returned to
  the browser. The endpoint does not log message contents.
- A submission ID is retained for retries and sent as Resend’s idempotency key,
  helping prevent duplicate delivery after an ambiguous network failure. Editing
  the draft starts a new submission; a failed send retains the draft.
- Success means Resend accepted the message, not that it reached the inbox.
  Delivery/bounce status is available in Resend. No visitor confirmation email
  is sent, and no app database stores the contact message.

## Verification

Five service tests cover fixed-recipient delivery and reply-to, input/origin/body
limits, invalid security proofs, provider errors/missing configuration, and
honeypots. A mobile browser verification with mocked Turnstile/API responses
checks verification gating, pending state, retained drafts, idempotent retries
and success. The full check passes (74 unit tests, 118 backend tests, CSP/browser checks and a clean audit), as does the OpenNext Cloudflare build. A local Worker preview verifies runtime configuration, server-only secrets and request rejection. Use the canonical `localhost` URL for local Worker POST tests; Wrangler normalizes loopback aliases. No live email has been sent during development.

After configuring the host, send one message through the deployed form and check
Resend delivery status, the Proton inbox, and that Reply addresses the visitor.
Review the contact/privacy wording as part of the launch legal checks.
