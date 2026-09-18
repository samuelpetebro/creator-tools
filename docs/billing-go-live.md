# Droop billing go-live runbook

Updated: 2026-09-18

Test-mode billing is functionally validated. This document is the exact transition path to real-money billing. Do not skip from Test Mode directly to a public paid CTA.

## Already validated in Test Mode

- authenticated Droop account -> server-created Lemon checkout
- successful USD 5 monthly test checkout
- signed Lemon webhook -> Supabase subscription persistence
- cancel -> resume -> pause -> unpause lifecycle
- duplicate webhook idempotency
- stale webhook rejection
- test-mode purchases never grant production Pro
- rollback-safe entitlement check: live active -> `profiles.plan = pro`
- rollback-safe entitlement check: live expired -> `profiles.plan = free`
- browser users cannot directly edit `profiles.plan`
- billing tables remain unavailable to browser roles
- server-only `service_role` can read subscription rows required for portal lookup

## Current external blocker

The Lemon-hosted Customer Portal currently returns “This store has not been activated.” That is a Lemon store activation state, not a Droop integration failure.

Lemon allows test checkout and webhook testing before activation, but real sales require the store to be activated.

## Live-mode transition

1. Submit/complete Lemon store activation and wait until Live Mode is available.
2. In Lemon, copy the tested Droop Pro product from Test Mode to Live Mode.
3. Record the new **live** Store ID, Product ID and Variant ID. Test IDs must not be reused.
4. Create a new **live** Lemon API key.
5. Create a new live webhook pointing to:
   `https://qbzqiiinugidkdxcpdln.supabase.co/functions/v1/lemonsqueezy-webhook`
6. Generate a fresh webhook signing secret for Live Mode.
7. Update Supabase secrets atomically:
   - `LEMON_SQUEEZY_API_KEY=<live key>`
   - `LEMON_SQUEEZY_STORE_ID=<live store id>`
   - `LEMON_SQUEEZY_PRO_VARIANT_ID=<live variant id>`
   - `LEMON_SQUEEZY_WEBHOOK_SECRET=<live webhook secret>`
   - `LEMON_SQUEEZY_CHECKOUT_TEST_MODE=false`
   - `LEMON_SQUEEZY_EXPECT_TEST_MODE=false`
   - keep `DROOP_APP_URL=https://droopweb.lat`
8. Redeploy checkout/webhook/portal Edge Functions from the repository so code and config stay aligned.
9. Make one controlled real subscription purchase using the owner account.
10. Verify:
    - Lemon order/subscription exists in Live Mode
    - webhook row has `test_mode=false`
    - billing subscription has the live Store/Variant IDs
    - Droop profile changes from `free` to `pro`
    - preset allowance becomes 100
    - customer portal opens
11. Cancel that controlled subscription and confirm it remains Pro during the paid grace period.
12. After expiration (or a controlled test of the DB entitlement path), confirm the account returns to Free.
13. Only after those checks, replace the public “Checkout not live yet” CTA with the production checkout action.

## Product decisions still required

The USD 5/month value used so far is a test price, not a committed public price.

Before public launch, decide:
- final monthly price
- whether an annual option exists
- which Pro benefit is already deliverable on day one
- whether paused subscriptions keep Pro access; current logic does
- dunning policy for unpaid subscriptions

Do not advertise batch workflows or history as current paid features until they actually exist.
