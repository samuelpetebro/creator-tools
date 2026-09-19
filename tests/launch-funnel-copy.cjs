const fs=require('fs'),assert=require('assert');

const index=fs.readFileSync('index.html','utf8');
const pro=fs.readFileSync('pro.html','utf8');
const proJs=fs.readFileSync('js/pro.js','utf8');
const faq=fs.readFileSync('faq.html','utf8');

assert(index.includes('Free for quick jobs. Pro for repeat work.'),'homepage must explain the Free-to-Pro progression');
assert(index.includes('100 saved presets'),'homepage must surface the Pro preset benefit');
assert(index.includes('5 batch workflows'),'homepage must surface the ready Pro batch benefit');
assert(index.includes('Profiles + Brand Kits'),'homepage must surface synced Pro workspace value');
assert(index.includes('Recipes + Run Again'),'homepage must surface repeat-workflow value');
assert(index.includes('See Droop Pro · USD 5/month'),'homepage must show the accepted Pro price in the plan CTA');

for(const value of ['Creator Profiles','Brand Kits','Workflow Recipes','Recent Runs']){
  assert(pro.includes(value),`Pro page must surface ${value}`);
  assert(proJs.includes(value),`Pro bilingual copy must surface ${value}`);
}
assert(pro.includes('Free vs Pro, side by side.'),'comparison section should read like a launch-ready plan comparison');

assert(faq.includes('<summary>Will the Free tools stay useful?</summary>'),'FAQ must answer the Free-plan concern');
assert(faq.includes('<summary>Can I cancel Droop Pro?</summary>'),'FAQ must answer cancellation before checkout launches');
assert(faq.includes('five batch workflows'),'FAQ must describe the current Pro launch value');
assert(faq.includes('"name":"Can I cancel Droop Pro?"'),'FAQ structured data must match the visible cancellation answer');

console.log('launch funnel copy checks: ok');
