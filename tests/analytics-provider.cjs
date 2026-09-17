// Run against a separately downloaded official tracker. No network calls are sent.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
if(!process.argv[2])throw Error('Usage: node tests/analytics-provider.cjs /path/to/umami-script.js');
(async()=>{
 const requests=[],scripts=[];let disabled=false;
 const document={documentElement:{lang:'es'},title:'private filename.mov',referrer:'https://example.org/private?q=secret',head:{appendChild:s=>scripts.push(s)},createElement:()=>({attrs:{},setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]??null;}}),addEventListener(){}};
 const location={hostname:'droopweb.lat',pathname:'/metadata-cleaner.html',href:'https://droopweb.lat/metadata-cleaner.html?private#secret',origin:'https://droopweb.lat'};
 const context={document,location,navigator:{language:'es'},screen:{width:1920,height:1080},history:{},URL,localStorage:{getItem:k=>k==='droop-analytics-disabled'&&disabled?'1':null},setTimeout:()=>1,clearTimeout(){},fetch:async(url,options)=>{requests.push({url,...options,body:JSON.parse(options.body)});return {json:async()=>({})};}};
 context.window=context;context.top=context;vm.createContext(context);
 vm.runInContext(fs.readFileSync('js/analytics-config.js','utf8'),context);
 vm.runInContext(fs.readFileSync('js/analytics.js','utf8'),context);
 document.currentScript=scripts[0];vm.runInContext(fs.readFileSync(process.argv[2],'utf8'),context);
 assert.equal(requests.length,0,'SDK auto tracking stays disabled');
 scripts[0].onload();context.DroopAnalytics.start();context.DroopAnalytics.finish('complete');
 await new Promise(setImmediate);
 assert.deepEqual(requests.map(r=>r.body.payload.name),[undefined,'process_start','process_complete']);
 for(const r of requests){assert.equal(r.url,'https://gateway.umami.is/api/send');assert.equal(r.body.type,'event');assert.equal(r.body.payload.website,context.DroopAnalyticsConfig.websiteId);assert.equal(r.body.payload.url,'/metadata-cleaner.html');assert.equal(r.body.payload.referrer,'https://example.org');assert.equal(r.credentials,'omit');assert(!JSON.stringify(r.body).match(/private|secret|1920/));}
 disabled=true;context.DroopAnalytics.start();context.DroopAnalytics.finish('complete');await context.umami.track({name:'process_complete',data:{filename:'private'}});await new Promise(setImmediate);assert.equal(requests.length,3);
 console.log('PASS official SDK serialization, manual pageview/lifecycle, data minimization and live opt-out; no production events sent');
})().catch(e=>{console.error(e);process.exitCode=1;});
