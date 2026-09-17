const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync('js/analytics.js','utf8');
function boot(options={}){
 const requests=[],scripts=[],listeners={};const window={DroopAnalyticsConfig:{websiteId:'12345678-1234-1234-1234-123456789abc',scriptUrl:'https://stats.example/script.js',...options.config},umami:{track:p=>{requests.push(p);return Promise.resolve();}}};
 const document={documentElement:{lang:'es'},referrer:'https://search.example/private/path?secret=name',head:{appendChild:s=>scripts.push(s)},createElement:()=>({attrs:{},setAttribute(k,v){this.attrs[k]=v}}),addEventListener:(k,v)=>listeners[k]=v};
 const context={window,document,location:{hostname:'droopweb.lat',pathname:'/subtitle-burner.html',search:'?filename=private.mov',hash:'#secret',...options.location},navigator:options.navigator||{},URL,localStorage:{getItem:()=>options.optout?'1':null},setTimeout:()=>1,clearTimeout(){}};
 vm.runInNewContext(code,context);return {window,requests,scripts,listeners};
}
for(const opts of [{config:{websiteId:''}},{location:{hostname:'localhost'}},{navigator:{doNotTrack:'1'}},{navigator:{globalPrivacyControl:true}},{optout:true},{config:{scriptUrl:'http://unsafe.example'}}]){const b=boot(opts);b.window.DroopAnalytics.start();assert.equal(b.scripts.length,0);assert.equal(b.requests.length,0);}
const b=boot();assert.equal(b.scripts[0].attrs['data-auto-track'],'false');b.window.DroopAnalytics.start();b.window.DroopAnalytics.start();b.window.DroopAnalytics.finish('complete');b.window.DroopAnalytics.finish('complete');b.scripts[0].onload();assert.deepEqual(b.requests.map(p=>p.name),[undefined,'process_start','process_complete']);
const p=b.window.droopAnalyticsBeforeSend('event',{name:'process_complete',url:'?secret',data:{filename:'private.mov',caption:'personal text'}});assert.equal(p.url,'/subtitle-burner.html');assert.equal(p.referrer,'https://search.example');assert.deepEqual(Object.keys(p.data),['tool']);assert(!JSON.stringify(p).includes('private'));assert.equal(b.window.droopAnalyticsBeforeSend('identify',{}),false);assert.equal(b.window.droopAnalyticsBeforeSend('event',{name:'personal text'}),false);
b.window.umami.track=()=>{throw Error('blocked')};assert.doesNotThrow(()=>{b.window.DroopAnalytics.start();b.window.DroopAnalytics.finish('error');});
const failed=boot();failed.scripts[0].onerror();failed.window.DroopAnalytics.start();assert.equal(failed.requests.length,0);
console.log('PASS disabled defaults, privacy signals, payload allowlist, queued event order, deduplication, provider failure isolation');
