const fs=require('fs');
const assert=require('assert');

const webhook=fs.readFileSync('supabase/functions/lemonsqueezy-webhook/index.ts','utf8');
const checkout=fs.readFileSync('supabase/functions/lemonsqueezy-checkout/index.ts','utf8');
const migration=fs.readFileSync('supabase/003_billing_subscriptions.sql','utf8');

for(const name of ['LEMON_SQUEEZY_WEBHOOK_SECRET','LEMON_SQUEEZY_STORE_ID','LEMON_SQUEEZY_PRO_VARIANT_ID','LEMON_SQUEEZY_EXPECT_TEST_MODE']){
  assert(webhook.includes(name),`webhook must require ${name}`);
}
assert(webhook.includes("payload?.data?.type!=='subscriptions'")||webhook.includes("parseSubscriptionPayload"),'webhook must accept subscription objects only');
assert(webhook.includes("x-signature"),'webhook must verify Lemon signature');
assert(webhook.includes("x-event-name"),'webhook must cross-check event header');
assert(!webhook.includes("subscription_payment_success"),'invoice events must not drive entitlement');
assert(checkout.includes('/auth/v1/user'),'checkout must verify the Supabase session server-side');
assert(checkout.includes("custom:{user_id:user.id}"),'checkout must bind custom user_id from verified session');
assert(!checkout.includes('SUPABASE_SERVICE_ROLE_KEY'),'checkout endpoint does not need service role');
assert(migration.includes('billing_webhook_events'),'migration must persist idempotency hashes');
assert(migration.includes("p_lemon_updated_at < existing.lemon_updated_at"),'migration must reject stale events');
assert(migration.includes("test_mode = false"),'test subscriptions must not grant production Pro');
assert(migration.includes("status in ('on_trial','active','paused','past_due','cancelled')"),'entitlement statuses must be explicit');

console.log('billing hardening checks: ok');
