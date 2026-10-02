# Cloudflare routing for Relay support email

Public address: **support@contact.relay-app.cc.cd**.
Receiving inbox: **screen.dev@protonmail.com**.

The contact page uses a `mailto:` link. Visitors send messages through their own
email provider, so Relay does not need Resend sending-domain verification or a
Turnstile widget for this feature.

## Receive messages

In the `relay-app.cc.cd` zone, open **Email → Email Routing**:

1. Enable `contact.relay-app.cc.cd` as an Email Routing subdomain.
2. Add `screen.dev@protonmail.com` as a destination and verify it from that inbox.
3. Route `support@contact.relay-app.cc.cd` to that verified destination.
4. Keep the MX and DNS records that Cloudflare supplies for Email Routing.
5. Send a message from another email account to the public support address and
   confirm that it reaches the inbox.

The existing Resend DKIM and `send.contact` / `rsend.contact` CNAME records are
not used by the mailto link. They can remain if the sending domain is used
elsewhere. No DNS or routing changes are made by deploying the app.

Reading and replying happen in the Proton inbox. Replies normally show the
Proton sender address; replying as the custom support address requires a
separate send-as setup.
