# Lemon Squeezy billing functions

These functions are source-controlled but **must not be deployed to live billing until the store/product/variant and test plan are confirmed**.

## Functions

- `lemonsqueezy-checkout`: authenticated endpoint that creates a Lemon Squeezy checkout server-side. The user ID comes from the verified Supabase session, not from a browser-controlled checkout query parameter.
- `lemonsqueezy-webhook`: public webhook receiver. It verifies Lemon's HMAC signature, validates store/variant/test mode, accepts only Subscription objects, then calls the privileged database RPC.

## Database

Apply `supabase/003_billing_subscriptions.sql` before deploying the webhook.

The database stores the Lemon subscription ID, owner, status, mode and Lemon `updated_at`. It also stores a SHA-256 hash of each webhook body for idempotency and ignores older subscription updates.

Production `profiles.plan` is recalculated from **live** subscriptions only. Test-mode subscriptions are recorded but never grant production Pro access.

Current entitlement policy:

- Pro: `on_trial`, `active`, `paused`, `past_due`, `cancelled`
- Free: `unpaid`, `expired`

Cancelled subscriptions keep access during their paid grace period; Lemon should later emit `subscription_expired`.

## Required secrets

Shared:

- `LEMON_SQUEEZY_STORE_ID`
- `LEMON_SQUEEZY_PRO_VARIANT_ID`
- `SUPABASE_URL`

Checkout:

- `LEMON_SQUEEZY_API_KEY`
- `LEMON_SQUEEZY_CHECKOUT_TEST_MODE` = `true` or `false`
- `DROOP_APP_URL` = `https://droopweb.lat`
- `SUPABASE_ANON_KEY`

Webhook:

- `LEMON_SQUEEZY_WEBHOOK_SECRET`
- `LEMON_SQUEEZY_EXPECT_TEST_MODE` = `true` or `false`
- `SUPABASE_SERVICE_ROLE_KEY`

Never place the API key, webhook secret or service-role key in browser JavaScript.

## Webhook events

Subscribe to subscription object events only:

- `subscription_created`
- `subscription_updated`
- `subscription_cancelled`
- `subscription_resumed`
- `subscription_expired`
- `subscription_paused`
- `subscription_unpaused`
- `subscription_plan_changed`

Do not use invoice/payment webhook objects to decide entitlement. Subscription status is the source of truth.

## Supabase auth settings

The checkout function should require a valid Supabase user JWT.

The Lemon webhook **must not require a Supabase user JWT**, because Lemon Squeezy is the caller. Deploy it with JWT verification disabled (for example, `supabase functions deploy lemonsqueezy-webhook --no-verify-jwt`) and rely on the HMAC signature validation in the function.

## Before live deployment

1. Create/verify Lemon Squeezy store, subscription product and Pro variant in test mode.
2. Apply the billing migration.
3. Configure only test secrets/mode.
4. Deploy both functions.
5. Create a test checkout while signed into Droop.
6. Confirm the webhook creates a `billing_subscriptions` row but does **not** upgrade the production profile from a test purchase.
7. Simulate update/cancel/resume/pause/unpause/expire events and replay duplicates.
8. Only after test results are clean, create live webhook credentials and set both mode flags to `false`.
