import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base=process.env.DROOP_LOCAL_URL||'http://127.0.0.1:4173';
const outDir=process.env.DROOP_SCREENSHOT_DIR||'artifacts/browser-smoke';
await fs.mkdir(outDir,{recursive:true});

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
const page=await context.newPage();

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
const proOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
assert(proOverflow<=2,`Pro page should not overflow mobile viewport (overflow ${proOverflow}px)`);
await page.screenshot({path:`${outDir}/pro-mobile.png`,fullPage:true});

await page.goto(base+'/image-converter.html',{waitUntil:'domcontentloaded'});
await page.waitForSelector('.tool-page .top-nav');
assert(await page.locator('.tool-page .top-nav').isVisible(),'tool-page navigation must be visible on mobile');
const toolOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
assert(toolOverflow<=2,`tool page should not overflow mobile viewport (overflow ${toolOverflow}px)`);

await page.setViewportSize({width:1365,height:900});
await page.goto(base+'/',{waitUntil:'domcontentloaded'});
await page.waitForSelector('#catalogGrid .catalog-card');
assert(await page.locator('#catalogGrid .catalog-card').count()>=15,'desktop catalog should render full tool set');
await page.screenshot({path:`${outDir}/home-desktop.png`,fullPage:true});

await browser.close();
console.log('browser smoke checks: ok');
