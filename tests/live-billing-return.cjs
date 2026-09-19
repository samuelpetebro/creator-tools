const fs=require('fs'),assert=require('assert');

const html=fs.readFileSync('account.html','utf8');
const js=fs.readFileSync('js/account.js','utf8');

assert.doesNotThrow(()=>new Function(js),'account billing return behavior must remain valid JavaScript');
assert(html.includes('id="billing-panel-label"'),'billing panel must expose a dynamic label');
assert(html.includes('id="billing-panel-title"'),'billing panel must expose a dynamic title');
assert(html.includes('id="billing-panel-copy"'),'billing panel must expose dynamic explanatory copy');

assert(js.includes("billingLiveReturn=billingReturn&&cfg.billingLiveEnabled===true"),'live purchase return must be distinguished from test billing');
assert(js.includes("billingLiveLabel:'DROOP PRO'"),'live return must replace the TEST BILLING label');
assert(js.includes("billingLiveActivating:'Payment received · Activating Droop Pro…'"),'live return must expose an activation state');
assert(js.includes("billingLiveManageButton:'Manage subscription'"),'live return must expose the real subscription management label');
assert(js.includes("attempt<5"),'live return must retry while waiting for the webhook');
assert(js.includes("setTimeout(()=>loadBillingPortal(attempt+1),1500)"),'live return retry must remain bounded and delayed');
assert(js.includes("await loadAccount(currentSession)"),'confirmed live subscription must refresh the account plan');
assert(js.includes("u.searchParams.delete('billing')"),'confirmed purchase return flag must be cleaned from the URL');
assert(js.includes("billingLiveReturn?t('billingLivePortalFailed'):t('billingPortalFailed')"),'live and test billing failures must keep separate copy');

console.log('live billing return UX checks: ok');
