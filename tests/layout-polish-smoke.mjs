import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base=process.env.DROOP_LOCAL_URL||'http://127.0.0.1:4173';
const outDir=process.env.DROOP_SCREENSHOT_DIR||'artifacts/browser-smoke';
await fs.mkdir(outDir,{recursive:true});

function assert(condition,message){if(!condition)throw new Error(message);}

const supabaseStub=`
window.supabase={createClient(){return{
  auth:{
    getSession:async()=>({data:{session:null},error:null}),
    getUser:async()=>({data:{user:null},error:null}),
    signInWithOAuth:async()=>({data:{},error:null}),
    onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
  },
  from(){const q={select(){return q;},eq(){return q;},order(){return q;},single:async()=>({data:null,error:null}),maybeSingle:async()=>({data:null,error:null}),then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject);}};return q;},
  rpc:async()=>({data:null,error:null})
};}};
`;
const turnstileStub=`window.turnstile={render(){return 'layout-widget';},execute(){},reset(){}};`;

async function wire(context){
  await context.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',route=>route.fulfill({status:200,contentType:'application/javascript',body:supabaseStub}));
  await context.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',route=>route.fulfill({status:200,contentType:'application/javascript',body:turnstileStub}));
}

async function noPageOverflow(page,label){
  const m=await page.evaluate(()=>({
    viewport:document.documentElement.clientWidth,
    doc:document.documentElement.scrollWidth,
    body:document.body.scrollWidth
  }));
  assert(m.doc<=m.viewport+2,`${label} document overflows horizontally: ${JSON.stringify(m)}`);
  assert(m.body<=m.viewport+2,`${label} body overflows horizontally: ${JSON.stringify(m)}`);
}

async function minTarget(page,selector,min,label){
  const items=await page.locator(selector).evaluateAll((els)=>els.filter(el=>{
    const s=getComputedStyle(el),r=el.getBoundingClientRect();
    return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;
  }).map(el=>{const r=el.getBoundingClientRect();return {text:(el.textContent||'').trim().slice(0,50),width:r.width,height:r.height};}));
  assert(items.length>0,`${label} expected visible targets for ${selector}`);
  const short=items.filter(x=>x.height<min-0.5);
  assert(short.length===0,`${label} has touch targets below ${min}px: ${JSON.stringify(short)}`);
}

async function focusVisible(page,label){
  await page.locator('body').click({position:{x:5,y:5}});
  await page.keyboard.press('Tab');
  const focus=await page.evaluate(()=>{
    const el=document.activeElement;
    const s=getComputedStyle(el);
    return {tag:el?.tagName,text:(el?.textContent||'').trim().slice(0,40),outlineStyle:s.outlineStyle,outlineWidth:parseFloat(s.outlineWidth)||0};
  });
  assert(focus.outlineStyle!=='none'&&focus.outlineWidth>=2,`${label} first keyboard target needs a visible focus ring: ${JSON.stringify(focus)}`);
}

const browser=await chromium.launch({headless:true});

const mobile=await browser.newContext({viewport:{width:390,height:844}});
await wire(mobile);
const mp=await mobile.newPage();

const mobilePages=[
  ['home','/'],
  ['pro','/pro.html'],
  ['account','/account.html'],
  ['image-converter','/image-converter.html'],
  ['video-under-x','/video-under-x-mb.html'],
  ['audio-converter','/audio-converter.html'],
  ['workflows','/workflows.html'],
  ['faq','/faq.html']
];

for(const [name,path] of mobilePages){
  await mp.goto(base+path,{waitUntil:'domcontentloaded'});
  await mp.waitForTimeout(150);
  await noPageOverflow(mp,`mobile ${name}`);
  await minTarget(mp,'.site-header .brand',44,`mobile ${name} brand`);
  await minTarget(mp,'.site-header .top-nav a',44,`mobile ${name} nav`);
  await minTarget(mp,'footer a',44,`mobile ${name} footer`);
  await focusVisible(mp,`mobile ${name}`);
  if(['home','pro','account','image-converter'].includes(name)){
    await mp.screenshot({path:`${outDir}/layout-mobile-${name}.png`,fullPage:true});
  }
}

await mp.goto(base+'/pro.html',{waitUntil:'domcontentloaded'});
const table=await mp.locator('.pro-table-wrap').evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,overflow:getComputedStyle(el).overflowX}));
assert(table.scroll>table.client,'mobile Pro comparison should scroll inside its wrapper');
assert(['auto','scroll'].includes(table.overflow),`mobile Pro table wrapper must own horizontal scrolling: ${JSON.stringify(table)}`);
await minTarget(mp,'.pro-plan-card .button',44,'mobile Pro plan actions');

await mp.goto(base+'/account.html',{waitUntil:'domcontentloaded'});
const authSizes=await mp.locator('.auth-form input,.auth-form select,.auth-form .button').evaluateAll(els=>els.filter(el=>{
  const r=el.getBoundingClientRect();return r.width>0&&r.height>0;
}).map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,type:el.getAttribute('type'),height:r.height,fontSize:parseFloat(getComputedStyle(el).fontSize)||0};}));
assert(authSizes.every(x=>x.height>=44),`mobile account form controls must be finger-friendly: ${JSON.stringify(authSizes)}`);
assert(authSizes.filter(x=>x.tag==='INPUT'&&x.type!=='color').every(x=>x.fontSize>=16),`mobile text inputs must avoid iOS zoom: ${JSON.stringify(authSizes)}`);
await mobile.close();

const desktop=await browser.newContext({viewport:{width:1440,height:900}});
await wire(desktop);
const dp=await desktop.newPage();
for(const [name,path] of [['home','/'],['pro','/pro.html'],['account','/account.html'],['tool','/image-converter.html']]){
  await dp.goto(base+path,{waitUntil:'domcontentloaded'});
  await dp.waitForTimeout(100);
  await noPageOverflow(dp,`desktop ${name}`);
  const header=await dp.locator('.site-header').evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));
  assert(header.scroll<=header.client+2,`desktop ${name} header must fit without horizontal clipping: ${JSON.stringify(header)}`);
  await focusVisible(dp,`desktop ${name}`);
  await dp.screenshot({path:`${outDir}/layout-desktop-${name}.png`,fullPage:true});
}
await desktop.close();
await browser.close();

console.log('responsive interaction layout smoke: ok');
