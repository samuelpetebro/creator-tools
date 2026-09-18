# Lemon Squeezy webhook

This function is intentionally not deployed yet. It is the server-side foundation for changing a verified Droop profile from `free` to `pro` after a real Lemon Squeezy subscription.

## Required secrets

Configure these only in Supabase Edge Function secrets:

- `LEMON_SQUEEZY_WEBHOOK_SECRET`: the signing secret configured in Lemon Squeezy.
- `LEMON_SQUEEZY_PRO_VARIANT_ID`: the live Pro subscription variant ID.
- `SUPABASE_URL`: the project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key; never put it in HTML or browser JavaScript.

The function verifies the raw request body against the `X-Signature` HMAC-SHA256 header before doing anything. It then reads `meta.custom_data.user_id`, validates it as a Supabase UUID, optionally checks the Pro variant, and updates only the profile plan.

## Lemon setup

Create a hosted subscription checkout and pass the signed-in Supabase user ID as custom data:

`checkout[custom][user_id]=<supabase-user-id>`

Subscribe the webhook to:

- `subscription_created`
- `subscription_updated`
- `subscription_resumed`
- `subscription_payment_success`
- `subscription_payment_recovered`
- `subscription_expired`

Cancellation does not immediately downgrade a user; the account stays Pro through the billing grace period and is downgraded only on `subscription_expired`.

Deploy only after the Lemon store/product exists and the secrets are configured. Test first in Lemon's test mode, then create a separate live webhook and live variant configuration.
