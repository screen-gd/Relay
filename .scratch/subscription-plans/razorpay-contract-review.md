# Razorpay capability and commercial review

Reviewed: 2026-09-17. Status: research complete for the sources below;
account validation and commercial approval blocked. This is not an approved
contract and does not authorize ticket 03.

## Decision

Keep Free as the only offer. Razorpay documents a plausible fixed-price Creator
subscription, but Relay's business account, markets, currency, tax treatment,
price and customer policies are not established. No paid offer is approved.
Team, extra Editor seats and Storage Add-ons remain deferred (tickets 07–10).
Former Clerk/Stripe prices, annual discounts and trial terms are not inputs.

No Razorpay or E2E variable names were present in the three local environment
files checked. The browser tool reported no attached Chrome runtime. No test
account was verified, and no account, credential, plan, subscription, payment,
webhook, refund or charge was created or changed. Documentation evidence is not
proof of account eligibility or a successful transaction.

## Capability findings

| Area                       | Current primary evidence                                                                                                                                                                                                                                                                                                      | Consequence for Relay                                                                                                                                                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Markets and account        | The docs display India, Malaysia, Singapore and United States country variants. The international payment docs require activation and account eligibility. Generic availability labels do not establish that the intended legal entity has Subscriptions enabled. [1][2]                                                      | Obtain legal entity country, business account identity, KYC/activation status, settlement bank country and exact customer-country allowlist. No market is approved yet.                                                                                                                   |
| Currencies and settlements | The India currency-conversion page explicitly includes Subscriptions, currency subunits, and conversion to INR at payment time. International acceptance requires enablement. Examples include USD and GBP; these are not a Relay currency selection. [2][3]                                                                  | For an Indian account, verify the desired recurring currency and INR settlement in that account. For another entity country, obtain its country-specific contract rather than applying Indian settlement rules. Record fees, FX treatment and actual settlement schedule.                 |
| Payment methods            | The India methods page documents Visa, Mastercard, RuPay, UPI Autopay and eNACH. The generic overview returned card-only content. UPI/international-currency claims in search results vary by country version. [1][4]                                                                                                         | Confirm each intended country/currency/method combination in the test account and provider approval. Do not infer recurring support from one-time payment support or promise every listed method.                                                                                         |
| Recurrence                 | A Plan defines amount and billing frequency. A Subscription links a Plan, start time and bounded billing-cycle count. The create API requires a plan and billing duration. Subscription charges are auto-captured. [1][5][6]                                                                                                  | Select and approve billing period, number of cycles, and renewal at completion. Do not advertise perpetual renewal from a finite `total_count`.                                                                                                                                           |
| Plan changes               | Plan records cannot be edited/deleted; create a replacement Plan. Subscription updates are limited to card-authorised subscriptions in authenticated/active states. Immediate changes can charge/refund a prorated difference; failed extra charges prevent the update. Cycle-end changes avoid immediate adjustments. [6][7] | Prefer evaluating cycle-end changes first. UPI/eNACH upgrades cannot reuse a card-update design. Method replacement, reauthorisation and any new subscription need a separate proven journey.                                                                                             |
| Quantities and add-ons     | `quantity` multiplies the entire Plan price per invoice. It is not an independently priced seat or storage line. The FAQ says Add-ons are deprecated while create examples still contain `addons` as an upfront amount. [5][6]                                                                                                | Do not equate quantity with Relay's base-plus-extra-seat pricing. Do not build recurring storage packs from upfront add-ons. Resolve this documentation conflict with Razorpay before tickets 08/09.                                                                                      |
| Trials                     | A future `start_at` delays recurring billing after mandate authentication. The India FAQ describes a refundable token authorisation; generic country versions show different amounts. [5][6][8]                                                                                                                               | Approve whether there is a trial, its length, eligibility, access, initial authorisation disclosure and cancellation deadline. No inherited seven-day trial or “no charge” promise.                                                                                                       |
| Cancellations              | Dashboard/API cancellation can be immediate or at cycle end. A cancelled subscription cannot be reactivated. Cycle-end cancellation requires a billing cycle and has final-cycle restrictions. [9]                                                                                                                            | Proposed default for approval: cancel future renewal at cycle end, preserve already-paid access until its confirmed end. Cancellation during a trial and mandatory immediate termination need explicit terms. Cancellation is not proof of a refund.                                      |
| Refunds                    | Refunds can be issued via Dashboard/API to the original payment method. Normal refunds are described as taking 5–7 working days. `processed` can precede the gateway ARN/RRN confirmation. Immediate subscription changes may create automatically refunded credit notes. [7][10]                                             | Approve eligibility, partial/prorated refunds, access after refund and who may authorize one. Track payment, refund and credit-note references; do not promise bank receipt from a provider status alone. No refund was issued.                                                           |
| Taxes and invoices         | Subscriptions automatically generate invoices per cycle. The invoice API exposes billing periods, paid/due amounts, tax fields, customer and payment links. These fields do not prove automatic tax calculation, registration, filing, remittance or compliant cross-border invoices. [8][11]                                 | Obtain accountant/provider confirmation for GST/VAT/sales tax, tax-inclusive versus exclusive price, customer address/tax-ID capture, invoice numbering and credit notes for the chosen market. RazorpayX tax payments and standalone Invoices are not proof of subscription tax support. |
| Self-service               | Provider failure emails/hosted pages support retrying or changing a card; checkout supports card change. Business Dashboard/API controls support cancellation/pause/resume. The FAQ does not establish a complete hosted customer billing portal. [6][9][12]                                                                  | Relay needs an authenticated Workspace-owner billing page and support fallback. Verify method-specific customer cancellation, invoice access, card replacement and notifications in test mode. Do not reuse Clerk UserProfile as the payment portal.                                      |
| Webhooks                   | HMAC-SHA256 over the raw body uses the webhook secret and `X-Razorpay-Signature`. Duplicate events are identified by `x-razorpay-event-id`; events may arrive out of order. Old deliveries after secret rotation may need the old secret. [13]                                                                                | Verify before parsing; use constant-time signature comparison, environment/account isolation and atomic deduplication. A valid signature alone does not identify the correct Workspace.                                                                                                   |
| Delivery retries           | Non-2xx delivery responses trigger exponential retries for 24 hours; prolonged failure disables the webhook. A response taking over five seconds can be treated as a timeout and redelivered. [14]                                                                                                                            | Durably accept verified events quickly, alert on disabled delivery, and reconcile independently. Never assume one delivery or that a response timeout means a mutation did not happen.                                                                                                    |
| Payment retries            | Card failures move to pending; the documented retry schedule is T+1, T+2 and T+3, then halted. Recovery from halted does not automatically collect all previously generated invoices. Manual domestic-card charging is not supported. [12][15]                                                                                | Keep provider collection retries separate from delivery retries. Do not treat reactivation alone as proof that arrears were settled. Validate non-card schedules separately.                                                                                                              |

## Proposed journeys and trust rules

These are design decisions proposed for approval, not implemented integration.

1. **Checkout:** Require an authenticated current Workspace Owner. Select a
   server-owned approved offer version, amount, currency, quantity and terms.
   Create a durable local checkout attempt before the external request and map
   the returned subscription to that Workspace. The client must not select an
   arbitrary provider plan, customer or subscription as authority. Show final
   price, tax, recurrence, any authorisation amount and cancellation terms before
   asking for a mandate. Only the mapped subscription ID goes to checkout.
2. **Return:** Treat success, dismissal and network failure as pending until
   verified. Validate the checkout signature with the API secret over
   `payment_id + "|" + stored_subscription_id`, not a caller-selected subscription
   ID. Fetch provider objects and verify their relationship, currency, amount,
   plan and payment state. Authentication alone is not a paid billing cycle;
   grant trial access only under an approved trial contract. [16]
3. **Webhook:** Verify the raw-body signature, validate the payload and persist
   an inbox entry keyed by provider environment/account and event ID. Commit the
   processed event marker and entitlement projection together in Convex. If
   processing is deferred, acceptance must durably schedule work before returning
   2xx. A duplicate completed delivery is a no-op; temporary storage failures
   return non-2xx. Unknown-but-authentic events are retained for investigation,
   never converted into paid access.
4. **Ordering and reconciliation:** Events are signals, not a reliable sequence.
   Serialize projection reconciliation per subscription. Fetch its current
   state and related invoices/payments, then compare the approved offer and
   current paid period before writing the projection. A late event timestamp
   must not undo a newer paid period or cancellation. A fetch begun before a
   newer reconciliation must not overwrite it. Reconcile pending checkout,
   overdue renewals, webhook outages and operator-requested repairs; scan all
   mapped subscriptions periodically with pagination. Persist last successful
   verification time and mismatches. [5][11][13][15]
5. **Timeouts and retries:** Proposed outbound request deadline: 10 seconds.
   Retry read-only transient failures with bounded exponential backoff and
   jitter, honoring provider throttling. Do not blindly retry create, cancel,
   update or refund after an ambiguous timeout. Fetch and reconcile the existing
   operation first; unresolved create outcomes go to manual review. No generic
   create-subscription idempotency guarantee was established by these sources.
6. **Support and cancellation:** Verify the caller's Workspace ownership before
   exposing billing details or requesting changes. Show confirmed renewal/end
   date, invoice links and pending operations. Provide a documented support
   contact for mandate failures, duplicate charges, inaccessible self-service
   and refunds. Provider notifications can be enabled through `customer_notify`,
   but delivery and contents need testing. Keep files and members on downgrade;
   block only new operations beyond confirmed capacity.

## Authoritative objects and retained identifiers

Convex remains the product authority. Razorpay is evidence for collection and
subscription state, never identity or Workspace membership.

- Keep a versioned approved offer mapping to opaque Plan ID, amount in currency
  subunits, currency and billing period. Do not parse IDs to derive entitlements.
- Map the opaque Subscription ID to exactly one Workspace, provider account and
  test/live environment. Retain the linked Customer ID when assigned after
  authentication, not a browser-supplied customer identity. [5]
- Retain Payment ID, Invoice ID and their subscription/customer links, amount,
  currency, captured/paid status and billing-period boundaries. Keep Order ID
  when supplied for payment/invoice reconciliation. [11]
- Retain refund and credit-note IDs when applicable, processed amounts and
  unresolved outcomes; event ID, event type, provider creation time, receipt
  time and processing status; and the local checkout/operation correlation ID.
- Keep subscription lifecycle, quantity, period start/end, scheduled changes,
  paid/remaining cycles and last reconciliation outcome in the provider
  boundary. Do not store card data, CVV, API secrets or webhook secrets in the
  product projection or logs.

## Manual-review states

Preserve data and deny unconfirmed grants when any of these occurs:

- Wrong environment/account, unknown subscription/customer/plan, ownership
  transfer, one subscription mapped twice, or an event for another Workspace.
- Unsupported currency/method, price/quantity mismatch, unexpected tax,
  unapproved trial, addon or scheduled plan change.
- Created/authenticated with no qualifying paid invoice; failed/cancelled
  mandate; pending/halted with unpaid invoices; paused, completed or expired
  subscriptions; any unrecognized lifecycle value. These need explicit access
  mapping rather than treating every non-cancelled state as active.
- Active after halted but with unresolved arrears, disputed/refunded payments,
  partial refunds, or a credit note whose refund has not completed.
- Conflicting or stale events, invalid signatures, secret-rotation failures,
  disabled webhooks, provider API unavailability or a missed cycle.
- Ambiguous create/update/cancel/refund timeout. Never create a second purchase
  or repeat a refund just because the first response was lost.

Invalid signatures are rejected, not trusted enough to become billing records.
Security telemetry must not retain secrets or sensitive raw payment details.

## Approval needed to close ticket 02

| Decision                                                                 | Current answer                                                 |
| ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Legal business account and approved entity country                       | Not supplied or verified                                       |
| Launch customer countries and payment methods                            | Not approved                                                   |
| Customer currency, settlement currency, FX/fees                          | Not approved; India documentation is conditional evidence only |
| Creator amount and monthly/annual or other billing periods               | Not approved                                                   |
| Trial, authorisation amount disclosure and eligibility                   | Not approved                                                   |
| Renewal duration and completion/re-authorisation policy                  | Not approved                                                   |
| Cancellation, refund, payment-failure grace and support policy           | Not approved                                                   |
| Tax liability, inclusive/exclusive price and invoice compliance          | Not approved                                                   |
| Team, extra Editors, Storage Add-ons                                     | Deferred, no commercial approval                               |
| Integration, credentials, test-object creation and production operations | Not authorized by this review                                  |

After the business decisions, test the chosen account/currency/method through
authentication, first charge, renewal, cancellation, refund, failure/recovery,
duplicate/out-of-order webhook handling and missed-event reconciliation under
separate scoped approval. Capture test-mode object references and results without
secrets. Only then approve a versioned contract and unblock ticket 03.

## Primary sources

All accessed 2026-09-17. Country-dependent pages sometimes returned inconsistent
examples; this review calls those out instead of treating defaults as universal.

1. [Subscriptions overview](https://razorpay.com/docs/payments/subscriptions/)
2. [International payments FAQ](https://razorpay.com/docs/payments/international-payments/faqs)
3. [Currency conversion](https://razorpay.com/docs/payments/international-payments/currency-conversion/)
4. [India supported payment methods](https://razorpay.com/docs/payments/subscriptions/supported-payment-methods/?preferred-country=IN)
5. [Create subscription API](https://razorpay.com/docs/api/payments/subscriptions/create-subscription/)
6. [India subscription FAQ](https://razorpay.com/docs/payments/subscriptions/faqs/?preferred-country=IN)
7. [Update subscription](https://razorpay.com/docs/payments/subscriptions/update/)
8. [Subscription workflow](https://razorpay.com/docs/payments/subscriptions/workflow)
9. [Cancellation API](https://razorpay.com/docs/api/payments/subscriptions/cancel-subscription/) and [Dashboard cancellation](https://razorpay.com/docs/payments/subscriptions/pause-resume-cancel/)
10. [Refunds](https://razorpay.com/docs/payments/refunds/)
11. [Fetch subscription invoices](https://razorpay.com/docs/api/payments/subscriptions/fetch-invoices/)
12. [Payment retries and card replacement](https://razorpay.com/docs/payments/subscriptions/payment-retries/)
13. [Webhook validation, deduplication and ordering](https://razorpay.com/docs/webhooks/validate-test/)
14. [Webhook retries and timeouts](https://razorpay.com/docs/webhooks/best-practices/)
15. [Subscription webhook events](https://razorpay.com/docs/webhooks/subscriptions)
16. [Checkout integration and signature verification](https://razorpay.com/docs/payments/subscriptions/integration-guide/)
