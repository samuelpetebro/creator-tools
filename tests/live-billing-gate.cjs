const fs=require('fs'),assert=require('assert');
const cfg=fs.readFileSync('js/supabase-config.js','utf8');
const html=fs.readFileSync('pro.html','utf8');
const js=fs.readFileSync('js/pro.js','utf8');

assert(cfg.includes('billingLiveEnabled:false'),'live billing gate must default off before the controlled purchase');
assert(!cfg.includes('PAYPAL_CLIENT_SECRET'),'public config must never contain PayPal client secret');
assert(!cfg.includes('PAYPAL_WEBHOOK_ID'),'public config must never contain PayPal webhook configuration');
assert(html.includes('id="pro-checkout"'),'Pro page must expose the staged checkout control');
assert(html.includes('id="pro-checkout"')&&html.includes('disabled'),'staged checkout must render disabled by default');
assert.doesNotThrow(()=>new Function(js),'Pro page behavior must remain valid JavaScript');
assert(js.includes("billingLive=cfg.billingLiveEnabled===true"),'Pro checkout must be gated by the public live-billing flag');
assert(js.includes("if(!billingLive)return"),'checkout click must refuse to run while the live gate is off');
assert(js.includes("/functions/v1/paypal-checkout"),'live checkout must use the server-side PayPal checkout endpoint');
assert(js.includes("Authorization:'Bearer '+token"),'live checkout must send the signed-in Supabase session');
assert(js.includes("currentPlan==='pro'"),'existing Pro users must not be sent through checkout again');
assert(js.includes("interest.hidden=true"),'early-interest CTA must disappear once live billing is enabled');

console.log('live billing gate checks: ok');