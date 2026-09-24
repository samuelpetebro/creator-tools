# Droop billing go-live runbook — PayPal

Updated: 2026-09-24

Droop is migrating billing from Lemon Squeezy to PayPal Subscriptions after the Lemon merchant application was rejected. The Lemon test integration remains available only as rollback/history until PayPal is validated.

## Current state

Already complete:

- Droop Pro price remains **USD 5/month**, monthly only for v1.
- PayPal server-only tables and webhook-event idempotency are installed in Supabase.
- `paypal-checkout`, `paypal-webhook`, `paypal-subscription` and `paypal-cancel` Edge Functions are deployed with custom auth/signature validation.
- Browser roles have no direct access to PayPal billing tables.
- Sandbox subscriptions are explicitly prevented from granting production Pro.
- Existing Lemon test rows remain isolated and do not grant production Pro.

Still required before the first sandbox checkout:

1. Create or use a PayPal Business account.
2. Open the PayPal Developer Dashboard and create a **Sandbox REST app**.
3. Copy the sandbox **Client ID** and **Client Secret**.
4. Create a PayPal sandbox product for Droop Pro (service/software).
5. Create one active fixed-price plan: **USD 5 every 1 month**, no trial for v1.
6. Record the sandbox Plan ID (starts with `P-`).
7. Create a webhook for the sandbox app pointing to:
   `https://qbzqiiinugidkdxcpdln.supabase.co/functions/v1/paypal-webhook`
8. Subscribe it to the subscription lifecycle and payment events used by Droop:
   - `BILLING.SUBSCRIPTION.CREATED`
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.UPDATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
   - `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
   - `PAYMENT.SALE.COMPLETED`
   - `PAYMENT.SALE.REFUNDED`
   - `PAYMENT.SALE.REVERSED`
9. Record the PayPal Webhook ID.

## Sandbox secrets

Set these only in Supabase Edge Function secrets — never in GitHub or browser JavaScript:

- `PAYPAL_CLIENT_ID=<sandbox client id>`
- `PAYPAL_CLIENT_SECRET=<sandbox client secret>`
- `PAYPAL_PLAN_ID=<sandbox plan id>`
- `PAYPAL_WEBHOOK_ID=<sandbox webhook id>`
- `PAYPAL_SANDBOX=true`
- `DROOP_APP_URL=https://droopweb.lat`

Supabase-provided publishable/secret keys remain managed by Supabase.

## Controlled sandbox smoke

After the secrets exist:

1. Open `account.html?billing_test=1` while signed in.
2. Start the PayPal sandbox checkout.
3. Approve it with a PayPal sandbox buyer account.
4. Return to Droop.
5. Verify `paypal_billing_webhook_events` received the signed event.
6. Verify `paypal_billing_subscriptions` contains the subscription and correct Droop user ID.
7. Confirm the row has `sandbox=true`.
8. Confirm the real Droop profile **remains FREE**.
9. Confirm duplicate webhook delivery is idempotent.
10. Confirm an older webhook cannot overwrite a newer subscription state.
11. Exercise cancel/suspend/activate in sandbox and verify state changes.
12. Verify the staged in-Droop cancellation control calls `paypal-cancel`, PayPal stops future renewals, and the verified webhook updates the local subscription state.

## Live transition

Do not reuse sandbox credentials or Plan IDs.

1. Switch the PayPal Developer app to Live / create the corresponding live REST app credentials.
2. Create the live Droop Pro product and USD 5/month plan.
3. Create the live webhook pointing to the same Droop PayPal webhook endpoint.
4. Replace Supabase secrets atomically with live values:
   - `PAYPAL_CLIENT_ID=<live client id>`
   - `PAYPAL_CLIENT_SECRET=<live client secret>`
   - `PAYPAL_PLAN_ID=<live plan id>`
   - `PAYPAL_WEBHOOK_ID=<live webhook id>`
   - `PAYPAL_SANDBOX=false`
5. Keep `billingLiveEnabled=false` in browser config.
6. Perform one controlled owner subscription from the hidden/test path.
7. Verify:
   - PayPal subscription is ACTIVE.
   - verified webhook is persisted.
   - DB row has `sandbox=false`.
   - Droop profile changes FREE → PRO.
   - preset allowance becomes 100.
   - Pro-only UI unlocks.
   - Umami records the expected Pro feature events after use.
8. Cancel the controlled subscription and verify the chosen paid-through/grace behavior.
9. Confirm expiry/cancellation eventually returns the account to FREE.
10. Re-verify customer self-service cancellation against the live PayPal subscription before public launch.
11. Set `billingLiveEnabled=true` only after every check above is green.
12. Remove/tombstone Lemon endpoints only after PayPal has completed a real billing cycle without issues.

## Security invariants

- PayPal Client Secret never reaches the browser.
- PayPal webhook events are ignored until PayPal's verify-webhook-signature API returns `SUCCESS`.
- Webhook plan ID must equal the configured Droop Pro plan.
- PayPal `custom_id` must be a valid Droop user UUID.
- Browser users cannot directly write `profiles.plan` or PayPal billing tables.
- Sandbox billing can never grant production Pro.
- The public paid CTA stays gated until the live controlled purchase succeeds.
