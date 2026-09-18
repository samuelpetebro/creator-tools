const fs=require('fs');
const assert=require('assert');

const read=p=>fs.readFileSync(p,'utf8');
const index=read('index.html');
const home=read('js/home-catalog.js');
const analytics=read('js/analytics.js');
const account=read('account.html');
const privacy=read('privacy.html');
const notFound=read('404.html');
const catalog=read('css/catalog.css');
const toolCss=read('css/tool-page.css');
const pro=read('pro.html');

assert(index.includes('id="why-droop"'),'homepage must have a stable Why Droop target');
assert(home.includes("searchParams.get('q')"),'homepage must consume ?q= for SearchAction');
assert(analytics.includes("'data-auto-pageview':'false'"),'Umami manual pageview mode must use data-auto-pageview');
assert(!analytics.includes("'data-auto-track':'false'"),'data-auto-track=false disables current Umami tracker initialization');
assert(!analytics.includes("'data-performance':'true'"),'performance tracking must not be claimed until tested');
assert(analytics.includes("'signup_success'")&&analytics.includes("'login_success'"),'account success events must be allowlisted');
assert(/js\/analytics\.js\?v=\d+/.test(account),'account page must load a versioned analytics adapter');
assert(privacy.includes('Supabase stores authentication data'),'privacy page must disclose account data');
assert(notFound.includes('href="/css/styles.css?v=7"')&&notFound.includes('href="/#tool-catalog"'),'404 assets/navigation must be root-relative');
assert(catalog.includes('.site-header .top-nav{display:flex!important'),'mobile site nav must remain visible');
assert(toolCss.includes('.tool-page .top-nav{display:flex!important'),'mobile tool nav must remain visible');
assert(!pro.includes('finish the account workflow'),'Pro copy must not claim accounts are unfinished');
assert(!pro.includes('mailto:hello@droopweb.lat'),'do not depend on an unverified mailbox');

console.log('prelaunch static checks: ok');
