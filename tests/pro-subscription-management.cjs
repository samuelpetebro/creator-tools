const fs=require('fs'),assert=require('assert');

const html=fs.readFileSync('account.html','utf8');
const js=fs.readFileSync('js/account.js','utf8');

assert.doesNotThrow(()=>new Function(js),'account subscription management must remain valid JavaScript');
assert(/js\/account\.js\?v=\d+/.test(html),'account must load versioned billing behavior');
assert(js.includes("const isLiveBillingContext=()=>cfg.billingLiveEnabled===true&&!billingTestMode&&(billingLiveReturn||currentPlan==='pro')"),'live billing context must include existing Pro accounts');
assert(js.includes("livePro=cfg.billingLiveEnabled===true&&currentPlan==='pro'"),'live Pro accounts must expose subscription management without a checkout return');
assert(js.includes("show=on&&(billingTestMode||billingReturn||livePro)"),'billing panel must render for live Pro accounts');
assert(js.includes("const hideCheckout=billingReturn||livePro"),'existing Pro accounts must never see a new checkout button in account billing management');
assert(js.includes("ui.billingManage.textContent=liveContext?t('billingLiveManageButton'):t('billingManageButton')"),'live subscription management must use production copy');
assert(js.includes("billingLivePortalLoading:'Loading your subscription…'"),'live subscription management must not reuse test loading copy');
assert(js.includes("state(ui.billingStatus,t('billingLivePortalReady').replace('{status}',statusText))"),'live subscription status must be visible to the account owner');
assert(js.includes("ui.billingManage?.addEventListener('click',()=>{if(billingPortalUrl)location.assign(billingPortalUrl);})"),'Manage subscription must open the server-provided customer portal');

console.log('Pro subscription management checks: ok');
