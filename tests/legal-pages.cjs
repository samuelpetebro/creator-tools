const fs=require('fs'),assert=require('assert');

const terms=fs.readFileSync('terms.html','utf8');
const termsJs=fs.readFileSync('js/terms.js','utf8');
const privacy=fs.readFileSync('privacy.html','utf8');
const privacyJs=fs.readFileSync('js/privacy.js','utf8');
const sitemap=fs.readFileSync('sitemap.xml','utf8');

assert.doesNotThrow(()=>new Function(termsJs),'Terms translation script must remain valid JavaScript');
assert.doesNotThrow(()=>new Function(privacyJs),'Privacy script must remain valid JavaScript');

assert(terms.includes('Droop Pro subscriptions'),'Terms must explain Pro subscriptions');
assert(terms.includes('Lemon Squeezy'),'Terms must identify the billing provider');
assert(terms.includes('merchant of record'),'Terms must explain Lemon Squeezy merchant-of-record role');
assert(terms.includes('Cancellation'),'Terms must explain cancellation');
assert(terms.includes('Refunds'),'Terms must include a refund section');
assert(terms.includes('privacy.html'),'Terms must link to Privacy');

for(const provider of ['Supabase','Google','Resend','Cloudflare','Lemon Squeezy','Umami']){
  assert(privacy.includes(provider)||privacyJs.includes(provider),`Privacy must disclose ${provider}`);
}

for(const page of ['index.html','pro.html','faq.html','account.html','workflows.html']){
  const html=fs.readFileSync(page,'utf8');
  assert(html.includes('href="terms.html"'),`${page} must link to Terms`);
}

assert(sitemap.includes('https://droopweb.lat/terms.html'),'Sitemap must include the Terms page');

console.log('legal/trust page checks: ok');
