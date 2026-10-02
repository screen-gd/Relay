# Cloudflare DNS for Relay support email

Selected public address: **support@contact.relay-app.cc.cd**.
Receiving inbox: **screen.dev@protonmail.com** (the selected support inbox).

A public DNS check on October 2, 2026 confirms that the `relay-app.cc.cd` zone is
served by `brodie.ns.cloudflare.com` and `itzel.ns.cloudflare.com`. The records
below and the receiving domain’s MX records were not published at that check.

## Resend verification

In Cloudflare, select **relay-app.cc.cd → DNS → Records → Add record**.
Names below are relative to that zone; Cloudflare supplies `.relay-app.cc.cd`.
Do not repeat `.relay-app` in the Name field.

| Type  | Name                        | Content / target            | Proxy                 | TTL  |
| ----- | --------------------------- | --------------------------- | --------------------- | ---- |
| TXT   | `resend._domainkey.contact` | Full DKIM value below       | Not applicable        | Auto |
| CNAME | `rsend.contact`             | `rsend-euw1.forge.rmta.net` | DNS only (grey cloud) | Auto |
| CNAME | `send.contact`              | `send.forge.rmta.net`       | DNS only (grey cloud) | Auto |
| TXT   | `_dmarc.contact`            | `v=DMARC1; p=none;`         | Not applicable        | Auto |

DKIM TXT content (copy as one value, without adding quotation marks):

```text
p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCp9S+3Ng+igUA5ZAK/d5CckpI3OwiLec0YAwgY/2wcTk70QujtXktqI/zJ6QWUAofPTkIuj3RCKCW5Sb/uzmGevyoMjwOjfnxdowAwWXk0Fq27z0rohZoJQedcnaAd5s44krkQdeF47PCCxg+3kPdSGGZltDEnGO/JklaiY7V+1wIDAQAB
```

`_dmarc.contact` applies the policy to `contact.relay-app.cc.cd`, the sending
domain. Its full DNS name is `_dmarc.contact.relay-app.cc.cd`. If a policy already
exists there when you configure it, keep one DMARC TXT record rather than adding
a second policy.

Return to Resend, open **Domains → contact.relay-app.cc.cd → Verify** after the
records are saved. Domain verification enables sending; a receiving route is
configured separately below.

## Receive messages in the existing inbox

In Cloudflare **Email → Email Routing**:

1. Add `contact.relay-app.cc.cd` as an Email Routing subdomain.
2. Add `screen.dev@protonmail.com` as a destination address and complete the
   verification from that inbox.
3. Create the custom address `support@contact.relay-app.cc.cd` and forward it to
   the verified Proton destination.
4. Let Cloudflare supply the MX and Email Routing DNS records for the `contact`
   subdomain. Keep the Resend `send.contact` and `rsend.contact` CNAMEs: they have
   different names and purposes.
5. Send a message from another email account to `support@contact.relay-app.cc.cd`
   and confirm it reaches the Proton inbox.

Cloudflare forwarding provides the public receiving address without creating a
new mailbox. Reading and replying remain in the selected Proton inbox. Replies
sent normally from Proton show the Proton sender address; replying as the custom
support address requires a mailbox provider that supports that custom domain.

## App activation

The Worker configuration now selects
`CONTACT_FROM_EMAIL=support@contact.relay-app.cc.cd`. The form delivers directly
to the selected Proton inbox and uses the visitor’s email as reply-to. Its fixed
recipient does not depend on the forwarding route.

After Resend verification, configure the Resend sending key and Turnstile keys
as described in [direct support email](contact-email.md). The public support
links use the custom address. Complete and test the receiving route before
publishing those links.

No DNS records, mailbox routes, or secrets were changed in the Cloudflare account
by the development work. These instructions and the app changes are prepared in
PR #70.
