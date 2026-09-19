import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base=process.env.DROOP_LOCAL_URL||'http://127.0.0.1:4173';
const outDir=process.env.DROOP_SCREENSHOT_DIR||'artifacts/browser-smoke';
await fs.mkdir(outDir,{recursive:true});

function assert(condition,message){if(!condition)throw new Error(message);}
async function assert200(path){
  const response=await fetch(base+path,{redirect:'follow'});
  assert(response.status===200,`${path} must return 200, got ${response.status}`);
}

const browser=await chromium.launch({headless:true});
const viewport={width:390,height:844};

const turnstileStub=`
window.turnstile={
  render(_container,options){window.__launchTurnstileOptions=options;return 'launch-widget';},
  execute(){setTimeout(()=>window.__launchTurnstileOptions?.callback?.('launch-turnstile-token'),0);},
  reset(){}
};
`;

async function wireExternal(context,supabaseStub){
  await context.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',route=>
    route.fulfill({status:200,contentType:'application/javascript',body:turnstileStub})
  );
  await context.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',route=>
    route.fulfill({status:200,contentType:'application/javascript',body:supabaseStub})
  );
  await context.route('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0',route=>
    route.fulfill({status:200,contentType:'application/javascript',body:'export const env={}; export const AutoModel={}; export const AutoProcessor={}; export const RawImage={};'})
  );
}

const guestSupabase=`
window.__launch={oauthCalls:[],signupCalls:[],loginCalls:[],resetCalls:[]};
window.supabase={
  createClient(){
    return {
      auth:{
        getSession:async()=>({data:{session:null},error:null}),
        getUser:async()=>({data:{user:null},error:null}),
        signInWithOAuth:async(payload)=>{window.__launch.oauthCalls.push(payload);return {data:{provider:'google'},error:null};},
        signUp:async(payload)=>{window.__launch.signupCalls.push(payload);return {data:{session:null,user:{id:'launch-new-user',email:payload.email}},error:null};},
        signInWithPassword:async(payload)=>{window.__launch.loginCalls.push(payload);return {data:{session:null},error:null};},
        resetPasswordForEmail:async(email,options)=>{window.__launch.resetCalls.push({email,options});return {data:{},error:null};},
        onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
      },
      from(){
        const q={
          select(){return q;},eq(){return q;},order(){return q;},
          single:async()=>({data:null,error:null}),
          maybeSingle:async()=>({data:null,error:null}),
          then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject);}
        };
        return q;
      },
      rpc:async()=>({data:null,error:null})
    };
  }
};
`;

const guest=await browser.newContext({viewport});
await wireExternal(guest,guestSupabase);
const page=await guest.newPage();
const runtimeErrors=[];
page.on('pageerror',error=>runtimeErrors.push(error.message||String(error)));

await page.goto(base+'/',{waitUntil:'domcontentloaded'});
await page.waitForSelector('#catalogGrid .catalog-card');
assert((await page.locator('#hero-title').innerText()).includes('Everything you need'),'homepage hero must explain the product immediately');
assert(await page.locator('#catalogGrid .catalog-card').count()===17,'homepage must expose all 17 launch tools');
assert(await page.getByRole('link',{name:'Create a free account'}).first().getAttribute('href')==='account.html?mode=signup','homepage signup CTA must deep-link to signup mode');
const proHome=page.locator('a[href="pro.html"]').filter({hasText:'USD 5/month'});
assert(await proHome.count()===1,'homepage must expose the Pro price/value CTA');
await page.screenshot({path:`${outDir}/launch-home.png`,fullPage:true});

await Promise.all([page.waitForURL(/\/pro\.html$/),proHome.click()]);
await page.waitForSelector('.pro-plan-grid');
assert(await page.locator('.pro-plan-card').count()===2,'plans page must show Free and Pro side by side');
assert((await page.locator('.pro-price').innerText()).includes('USD 5'),'plans page must show the launch price');
assert(await page.locator('#pro-checkout').isDisabled(),'real-money checkout must stay disabled while Lemon live approval is pending');
assert(!(await page.locator('body').innerText()).includes('TEST BILLING'),'public Pro page must never expose internal test-billing copy');
assert((await page.locator('body').innerText()).includes('Brand Kits'),'Pro page must surface current launch value, not the old reduced pack');

const freeCard=page.locator('.pro-plan-card').first();
await Promise.all([page.waitForURL(/account\.html\?mode=signup$/),freeCard.getByRole('link',{name:'Create free account'}).click()]);
await page.waitForSelector('#auth-mode');
assert((await page.locator('#auth-mode').innerText()).trim()==='Create account','plan CTA must land in account creation mode');
assert(await page.locator('#google-signin').isVisible(),'Google sign-in must be available to a new user');

await page.locator('#google-signin').click();
await page.waitForFunction(()=>window.__launch.oauthCalls.length===1);
const oauth=await page.evaluate(()=>window.__launch.oauthCalls[0]);
assert(oauth.provider==='google','Google CTA must start the Google provider');
assert(oauth.options.redirectTo===base+'/account.html?oauth=google','Google OAuth must return to the Droop account route');

await page.locator('#auth-email').fill('launch@example.test');
await page.locator('#auth-password').fill('LaunchSmoke123');
await page.locator('#auth-submit').click();
await page.waitForFunction(()=>window.__launch.signupCalls.length===1);
const signup=await page.evaluate(()=>window.__launch.signupCalls[0]);
assert(signup.options.captchaToken==='launch-turnstile-token','email signup must pass the Turnstile token');
assert(signup.options.emailRedirectTo===base+'/account.html','email confirmation must return to Droop');
assert((await page.locator('#auth-status').innerText()).includes('Check your email'),'new email signup must clearly explain email confirmation');

await page.goto(base+'/image-converter.html',{waitUntil:'domcontentloaded'});
await page.waitForSelector('[data-pro-feature="image-converter-batch"]');
assert(await page.locator('[data-pro-feature="image-converter-batch"] [data-pro-locked]').isVisible(),'guest tool experience must show the Pro batch gate');
assert(await page.locator('[data-pro-feature="image-converter-batch"] [data-pro-content]').isHidden(),'guest tool experience must not leak Pro controls');

await page.goto(base+'/workflows.html',{waitUntil:'domcontentloaded'});
await page.waitForSelector('#workflow-locked');
assert(await page.locator('#workflow-locked').isVisible(),'guest Workflow Recipes must explain the Pro gate');

await page.goto(base+'/faq.html',{waitUntil:'domcontentloaded'});
const faqText=await page.locator('body').innerText();
assert(faqText.includes('Will the Free tools stay useful?'),'FAQ must address the Free-plan concern');
assert(faqText.includes('Can I cancel Droop Pro?'),'FAQ must address cancellation before purchase');

for(const path of ['/','/pro.html','/account.html','/faq.html','/privacy.html','/terms.html','/workflows.html'])await assert200(path);
assert(runtimeErrors.length===0,`guest launch journey must not raise page errors: ${runtimeErrors.join(' | ')}`);
await guest.close();

const freeSupabase=`
const session={access_token:'launch-free-jwt',user:{id:'launch-free-user',email:'free@example.test',app_metadata:{providers:['email']},user_metadata:{}}};
window.supabase={
  createClient(){
    return {
      auth:{
        getSession:async()=>({data:{session},error:null}),
        getUser:async()=>({data:{user:session.user},error:null}),
        updateUser:async()=>({data:{user:session.user},error:null}),
        signOut:async()=>({error:null}),
        onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
      },
      from(table){
        const q={
          select(){return q;},eq(){return q;},order(){return q;},delete(){return q;},update(){return q;},insert:async()=>({data:null,error:null}),
          single:async()=>({data:table==='profiles'?{id:session.user.id,email:session.user.email,display_name:'Launch Free',plan:'free'}:null,error:null}),
          maybeSingle:async()=>({data:table==='profiles'?{plan:'free'}:null,error:null}),
          then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject);}
        };
        return q;
      },
      rpc:async()=>({data:null,error:null})
    };
  }
};
`;

const free=await browser.newContext({viewport});
await wireExternal(free,freeSupabase);
const freePage=await free.newPage();
const freeErrors=[];
freePage.on('pageerror',error=>freeErrors.push(error.message||String(error)));

await freePage.goto(base+'/account.html',{waitUntil:'domcontentloaded'});
await freePage.waitForSelector('#signed-in:not([hidden])');
assert((await freePage.locator('#account-plan').innerText()).trim()==='FREE','signed-in Free user must see the Free plan clearly');
assert((await freePage.locator('#account-usage').innerText()).trim()==='0 / 5','Free account must show the five-preset limit');
assert(await freePage.locator('#account-pro-backup [data-pro-locked]').isVisible(),'Free account must see Pro backup as an upsell, not as usable content');
assert(await freePage.locator('#account-creator-profiles [data-pro-locked]').isVisible(),'Free account must see Creator Profiles as Pro');
assert(await freePage.locator('#account-brand-kits [data-pro-locked]').isVisible(),'Free account must see Brand Kits as Pro');
assert(await freePage.locator('#billing-test-panel').isHidden(),'ordinary Free accounts must never see the internal billing test panel');

await freePage.getByRole('link',{name:/Compare Free and Pro/}).first().click();
await freePage.waitForURL(/\/pro\.html$/);
await freePage.waitForFunction(()=>document.querySelector('#pro-user-state')?.textContent.includes('FREE'));
assert((await freePage.locator('#pro-user-state').innerText()).includes('FREE'),'plans page must recognize the signed-in Free account');
assert(await freePage.locator('#pro-checkout').isDisabled(),'signed-in Free user still cannot pay before Lemon live approval');

assert(freeErrors.length===0,`signed-in Free journey must not raise page errors: ${freeErrors.join(' | ')}`);
await freePage.screenshot({path:`${outDir}/launch-free-account.png`,fullPage:true});
await free.close();

await browser.close();
console.log('launch journey smoke: ok');
