const fs=require('fs'),assert=require('assert');

const read=p=>fs.readFileSync(p,'utf8');
const config=read('supabase/config.toml');
const migration=read('supabase/009_paypal_billing.sql');
const checkout=read('supabase/functions/paypal-checkout/index.ts');
const webhook=read('supabase/functions/paypal-webhook/index.ts');
const subscription=read('supabase/functions/paypal-subscription/index.ts');
const cancel=read('supabase/functions/paypal-cancel/index.ts');
const pro=read('js/pro.js');
const account=read('js/account.js');
const browser=[pro,account,read('js/supabase-config.js'),read('pro.html'),read('account.html')].join('\n');

for(const fn of ['paypal-checkout','paypal-webhook','paypal-subscription','paypal-cancel']){
  assert(config.includes('[functions.'+fn+']'),fn+' must be declared in Supabase config');
}
assert(webhook.includes('/v1/notifications/verify-webhook-signature'),'PayPal webhook must verify signatures through PayPal');
assert(webhook.includes('verification_status')&&webhook.includes('SUCCESS'),'PayPal webhook must require successful verification');
assert(webhook.includes('PAYPAL_PLAN_ID'),'PayPal webhook must validate the configured plan');
assert(webhook.includes('custom_id'),'PayPal webhook must bind a subscription to the Droop user custom_id');
assert(checkout.includes('custom_id:String(user.id)'),'Checkout must bind PayPal subscription to the authenticated Droop user');
assert(checkout.includes('PAYPAL_CLIENT_SECRET'),'Checkout must authenticate server-side to PayPal');
assert(cancel.includes('/cancel'),'Cancellation endpoint must cancel the PayPal subscription server-side');
assert(cancel.includes('user_id:`eq.${user.id}`'),'Cancellation lookup must be scoped to the signed-in Droop user');
assert(subscription.includes('user_id:`eq.${user.id}`'),'Subscription status lookup must be scoped to the signed-in Droop user');

assert(migration.includes('alter table public.paypal_billing_subscriptions enable row level security'),'PayPal subscriptions must have RLS enabled');
assert(migration.includes('revoke all on table public.paypal_billing_subscriptions from public, anon, authenticated'),'Browser roles must have no PayPal billing-table access');
assert(migration.includes('sandbox = false'),'Sandbox must never grant production Pro');
assert(migration.includes('revoke execute on function public.apply_paypal_subscription_event'),'PayPal entitlement RPC must not be browser-callable');

assert(pro.includes('/functions/v1/paypal-checkout'),'Pro checkout must point to PayPal');
assert(account.includes('/functions/v1/paypal-checkout'),'Account test checkout must point to PayPal');
assert(account.includes('/functions/v1/paypal-subscription'),'Account billing state must use PayPal');
assert(account.includes('/functions/v1/paypal-cancel'),'Account cancellation must use PayPal');

for(const secret of ['PAYPAL_CLIENT_SECRET','PAYPAL_WEBHOOK_ID']){
  assert(!browser.includes(secret),secret+' must never appear in browser-facing code');
}
assert(!pro.includes('lemonsqueezy-checkout'),'Pro browser path must not point to Lemon checkout');
assert(!account.includes('lemonsqueezy-checkout'),'Account browser path must not point to Lemon checkout');
assert(!account.includes('lemonsqueezy-portal'),'Account browser path must not point to Lemon portal');

console.log('paypal billing contract: ok');
