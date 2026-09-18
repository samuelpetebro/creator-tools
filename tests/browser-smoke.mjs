import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base=process.env.DROOP_LOCAL_URL||'http://127.0.0.1:4173';
const outDir=process.env.DROOP_SCREENSHOT_DIR||'artifacts/browser-smoke';
await fs.mkdir(outDir,{recursive:true});

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
const page=await context.newPage();
let runtimeErrors=[];
page.on('pageerror',error=>runtimeErrors.push(error.message||String(error)));

const supabaseStub=`
window.supabase={
  createClient(){
    return {
      auth:{
        getSession:async()=>({data:{session:null},error:null}),
        getUser:async()=>({data:{user:null},error:null}),
        onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
      },
      from(){
        const q={
          select(){return q;},eq(){return q;},order(){return q;},
          maybeSingle:async()=>({data:null,error:null}),
          single:async()=>({data:null,error:null})
        };
        return q;
      },
      rpc:async()=>({data:null,error:null})
    };
  }
};`;

await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',route=>
  route.fulfill({status:200,contentType:'application/javascript',body:supabaseStub})
);

await page.route('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0',route=>
  route.fulfill({
    status:200,
    contentType:'application/javascript',
    body:'export const env={}; export const AutoModel={}; export const AutoProcessor={}; export const RawImage={};'
  })
);

function assert(condition,message){
  if(!condition)throw new Error(message);
}

await page.goto(base+'/?q=image',{waitUntil:'domcontentloaded'});
await page.waitForSelector('#catalogGrid .catalog-card');
const searchValue=await page.locator('#catalogSearch').inputValue();
assert(searchValue==='image','homepage ?q=image must prefill catalog search');
const cats=await page.locator('#catalogGrid .catalog-card').evaluateAll(nodes=>nodes.map(n=>n.dataset.cat));
assert(cats.length>=4,'image search should return several image tools');
assert(cats.every(x=>x==='image'),'image search should only show image-category matches');

const navDisplay=await page.locator('.top-nav').evaluate(el=>getComputedStyle(el).display);
assert(navDisplay!=='none','mobile navigation must remain visible');
const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
assert(overflow<=2,`homepage should not overflow mobile viewport (overflow ${overflow}px)`);

await page.locator('.lang-switch').click();
assert(await page.locator('html').getAttribute('lang')==='es','homepage language switch should change html lang');
assert((await page.locator('#hero-title').innerText()).includes('Todo lo que necesitás'),'homepage Spanish hero should render');
const cdp=await context.newCDPSession(page);
await cdp.send('Page.enable');
const appManifest=await cdp.send('Page.getAppManifest');
assert((appManifest.url||'').endsWith('/site.webmanifest'),'Chromium must discover the Droop web app manifest');
const installability=await cdp.send('Page.getInstallabilityErrors');
assert((installability.installabilityErrors||[]).length===0,`Chromium installability errors: ${(installability.installabilityErrors||[]).map(x=>x.errorId).join(', ')}`);

await page.screenshot({path:`${outDir}/home-mobile.png`,fullPage:true});

await page.addInitScript(()=>localStorage.setItem('droop-language','es'));
await page.goto(base+'/account.html?mode=signup',{waitUntil:'domcontentloaded'});
await page.waitForSelector('#auth-mode');
assert((await page.locator('#auth-mode').innerText()).trim()==='Crear cuenta','signup deep link should open create-account mode');
assert((await page.locator('#auth-submit').innerText()).trim()==='Crear cuenta','signup submit label should match mode');
assert(await page.locator('#forgot-password').isHidden(),'forgot-password action should be hidden in signup mode');
const accountOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
assert(accountOverflow<=2,`account page should not overflow mobile viewport (overflow ${accountOverflow}px)`);
await page.screenshot({path:`${outDir}/account-signup-mobile.png`,fullPage:true});

await page.goto(base+'/pro.html',{waitUntil:'domcontentloaded'});
await page.waitForSelector('.pro-plan-grid');
assert(await page.locator('.pro-plan-card').count()===2,'Pro page must show Free and Pro plan cards');
assert(await page.locator('.pro-disabled').count()===1,'Pro checkout must remain disabled before billing launch');
assert((await page.locator('#pro-title').innerText()).includes('Repetí menos'),'Pro page should respect saved Spanish preference');
await page.locator('#pro-interest').click();
assert((await page.locator('#pro-interest-status').innerText()).includes('Interés registrado'),'Pro interest CTA should render Spanish acknowledgement');
assert(await page.locator('#pro-interest').isDisabled(),'Pro interest CTA should disable after one click');
await page.reload({waitUntil:'domcontentloaded'});
assert(await page.locator('#pro-interest').isDisabled(),'Pro interest CTA should remain disabled after reload on the same browser');
assert((await page.locator('#pro-interest-status').innerText()).includes('Interés registrado'),'persisted Pro interest should keep the acknowledgement visible');
const proOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
assert(proOverflow<=2,`Pro page should not overflow mobile viewport (overflow ${proOverflow}px)`);
await page.screenshot({path:`${outDir}/pro-mobile.png`,fullPage:true});

await page.goto(base+'/',{waitUntil:'domcontentloaded'});
await page.waitForSelector('#catalogGrid .catalog-card');
const toolPages=await page.locator('#catalogGrid .catalog-card').evaluateAll(nodes=>nodes.map(node=>new URL(node.href).pathname));
assert(toolPages.length===17,`catalog should expose all 17 active tools, got ${toolPages.length}`);
assert(new Set(toolPages).size===toolPages.length,'catalog tool routes must be unique');

const presetTools=new Set([
  '/make-it-fit.html','/under-x-mb.html','/release-pack.html',
  '/image-converter.html','/video-under-x-mb.html','/video-trimmer.html','/extract-audio/',
  '/audio-converter.html','/audio-trimmer.html','/safe-zones.html','/video-to-gif.html','/subtitle-burner.html',
  '/video-cropper.html','/thumbnail-maker.html'
]);

for(const toolPath of toolPages){
  runtimeErrors=[];
  await page.goto(base+toolPath,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.tool-panel');
  await page.waitForTimeout(75);
  assert(runtimeErrors.length===0,`${toolPath} must load without page errors: ${runtimeErrors.join(' | ')}`);
  const nav=page.locator('.tool-page .top-nav');
  assert(await nav.isVisible(),`${toolPath} navigation must be visible on mobile`);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert(overflow<=2,`${toolPath} should not overflow mobile viewport (overflow ${overflow}px)`);
  if(toolPath==='/metadata-cleaner.html')assert(await page.locator('.droop-presets').count()===0,'metadata cleaner should not mount an empty preset widget');
  if(toolPath==='/image-converter.html'||toolPath==='/metadata-cleaner.html'){
    await page.waitForSelector('[data-pro-feature]');
    assert(await page.locator('[data-pro-locked]').isVisible(),`${toolPath} must show the Pro batch upsell to guests`);
    assert(await page.locator('[data-pro-content]').isHidden(),`${toolPath} must keep Pro batch controls hidden for guests`);
  }
  if(presetTools.has(toolPath)){
    await page.waitForSelector('.droop-presets',{timeout:2500});
    assert(await page.locator('.droop-presets-signin').isVisible(),`${toolPath} must mount the guest preset/account widget`);
    if(toolPath==='/image-converter.html')assert((await page.locator('.droop-presets-signin').innerText()).includes('Iniciá sesión'),'preset widget should respect the saved Spanish language');
  }
}

await page.setViewportSize({width:1365,height:900});
await page.goto(base+'/',{waitUntil:'domcontentloaded'});
await page.waitForSelector('#catalogGrid .catalog-card');
assert(await page.locator('#catalogGrid .catalog-card').count()>=15,'desktop catalog should render full tool set');
await page.screenshot({path:`${outDir}/home-desktop.png`,fullPage:true});

await browser.close();
console.log('browser smoke checks: ok');
