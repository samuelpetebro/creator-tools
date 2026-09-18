import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base=process.env.DROOP_LOCAL_URL||'http://127.0.0.1:4173';
const outDir=process.env.DROOP_SCREENSHOT_DIR||'artifacts/browser-smoke';
await fs.mkdir(outDir,{recursive:true});

const browser=await chromium.launch({headless:true});

function assert(condition,message){
  if(!condition)throw new Error(message);
}

const accountStub=`
window.__droopTest={rpcCalls:[],updateUserCalls:[],resetCalls:[],signUpCalls:[],signInCalls:[],checkoutCalls:[],deletes:[],signedOut:false,presetDeleted:false};
const session={access_token:'test-user-jwt',user:{id:'user-test-1',email:'creator@example.test'}};
window.supabase={
  createClient(){
    return {
      auth:{
        getSession:async()=>({data:{session},error:null}),
        getUser:async()=>({data:{user:session.user},error:null}),
        signUp:async(payload)=>{window.__droopTest.signUpCalls.push(payload);return {data:{session:null,user:{id:'fresh-user',email:payload.email}},error:null};},
        signInWithPassword:async(payload)=>{window.__droopTest.signInCalls.push(payload);return {data:{session,user:session.user},error:null};},
        updateUser:async(payload)=>{window.__droopTest.updateUserCalls.push(payload);return {data:{user:session.user},error:null};},
        signOut:async()=>{window.__droopTest.signedOut=true;return {error:null};},
        resetPasswordForEmail:async(email,options)=>{window.__droopTest.resetCalls.push({email,options});return {data:{},error:null};},
        onAuthStateChange(callback){window.__droopTest.authCallback=callback;return {data:{subscription:{unsubscribe(){}}}};}
      },
      from(table){
        let action='select';
        const filters={};
        const q={
          select(){action='select';return q;},
          delete(){action='delete';return q;},
          eq(key,value){filters[key]=value;return q;},
          order(){return q;},
          single:async()=>{
            if(table==='profiles')return {data:{id:session.user.id,email:session.user.email,display_name:'Samu Test',plan:'free',updated_at:'2026-09-18T00:00:00Z'},error:null};
            return {data:null,error:null};
          },
          maybeSingle:async()=>({data:null,error:null}),
          then(resolve,reject){
            let result;
            if(table==='presets'&&action==='delete'){
              window.__droopTest.presetDeleted=true;
              window.__droopTest.deletes.push({...filters});
              result={data:null,error:null};
            }else if(table==='presets'){
              result={data:window.__droopTest.presetDeleted?[]:[{id:'preset-1',user_id:session.user.id,tool_slug:'image-converter',name:'WebP 80',settings:{format:'webp'},created_at:'2026-09-18T00:00:00Z',updated_at:'2026-09-18T00:00:00Z'}],error:null};
            }else{
              result={data:null,error:null};
            }
            return Promise.resolve(result).then(resolve,reject);
          }
        };
        return q;
      },
      rpc:async(name,args)=>{window.__droopTest.rpcCalls.push({name,args});return {data:args?.p_display_name??null,error:null};},
      functions:{}
    };
  }
};`;

const ctx=await browser.newContext({viewport:{width:390,height:844}});
const page=await ctx.newPage();
await page.addInitScript(()=>localStorage.setItem('droop-language','es'));
await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',route=>
  route.fulfill({status:200,contentType:'application/javascript',body:accountStub})
);

await page.goto(base+'/account.html',{waitUntil:'domcontentloaded'});
await page.waitForSelector('#signed-in:not([hidden])');
assert(await page.locator('#guest-view').isHidden(),'signed-in account must hide guest auth form');
assert((await page.locator('#account-plan').innerText()).trim()==='FREE','signed-in account should show Free plan');
assert((await page.locator('#account-usage').innerText()).trim()==='1 / 5','signed-in account should show preset usage');
assert(await page.locator('#display-name').inputValue()==='Samu Test','display name should load from profile');
assert((await page.locator('#account-presets').innerText()).includes('WebP 80'),'saved preset should render');

await page.locator('#display-name').fill('Samu Browser');
await page.locator('#profile-form button[type="submit"]').click();
await page.waitForFunction(()=>window.__droopTest.rpcCalls.length===1);
const rpc=await page.evaluate(()=>window.__droopTest.rpcCalls[0]);
assert(rpc.name==='set_my_display_name','display name UI must use the secure RPC');
assert(rpc.args.p_display_name==='Samu Browser','display name RPC should receive the edited name');
assert((await page.locator('#profile-status').innerText()).includes('guardado'),'display name success state should render');

await page.locator('#new-password').fill('NuevaClave123');
await page.locator('#password-form button[type="submit"]').click();
await page.waitForFunction(()=>window.__droopTest.updateUserCalls.length===1);
const pw=await page.evaluate(()=>window.__droopTest.updateUserCalls[0]);
assert(pw.password==='NuevaClave123','password form should call Auth updateUser');

page.once('dialog',dialog=>dialog.accept());
await page.locator('[data-delete="preset-1"]').click();
await page.waitForFunction(()=>window.__droopTest.presetDeleted===true);
await page.waitForFunction(()=>document.querySelector('#account-usage')?.textContent.trim()==='0 / 5');
assert((await page.locator('#account-presets').innerText()).includes('Todavía no guardaste presets'),'preset delete should refresh account state');

const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
assert(overflow<=2,`signed-in account should not overflow mobile viewport (overflow ${overflow}px)`);
await page.screenshot({path:`${outDir}/account-signed-in-mobile.png`,fullPage:true});
await ctx.close();

const recoveryCtx=await browser.newContext({viewport:{width:390,height:844}});
const recovery=await recoveryCtx.newPage();
await recovery.addInitScript(()=>localStorage.setItem('droop-language','es'));
await recovery.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',route=>
  route.fulfill({status:200,contentType:'application/javascript',body:accountStub})
);
await recovery.goto(base+'/account.html?recovery=1',{waitUntil:'domcontentloaded'});
await recovery.waitForSelector('#recovery-view:not([hidden])');
assert(await recovery.locator('#guest-view').isHidden(),'recovery mode must hide guest login');
assert(await recovery.locator('#signed-in').isHidden(),'recovery mode must hide normal account workspace');
await recovery.locator('#recovery-password').fill('Recuperada123');
await recovery.locator('#recovery-form button[type="submit"]').click();
await recovery.waitForFunction(()=>window.__droopTest.updateUserCalls.length===1);
const recoveryUpdate=await recovery.evaluate(()=>window.__droopTest.updateUserCalls[0]);
assert(recoveryUpdate.password==='Recuperada123','recovery form should update the password');
await recovery.waitForSelector('#signed-in:not([hidden])');
await recovery.screenshot({path:`${outDir}/account-recovery-mobile.png`,fullPage:true});
await recoveryCtx.close();

const resetCtx=await browser.newContext({viewport:{width:390,height:844}});
const reset=await resetCtx.newPage();
const resetStub=accountStub.replace("getSession:async()=>({data:{session},error:null})","getSession:async()=>({data:{session:null},error:null})");
await reset.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',route=>
  route.fulfill({status:200,contentType:'application/javascript',body:resetStub})
);
await reset.goto(base+'/account.html',{waitUntil:'domcontentloaded'});
await reset.locator('#auth-email').fill('creator@example.test');
await reset.locator('#forgot-password').click();
await reset.waitForFunction(()=>window.__droopTest.resetCalls.length===1);
const resetCall=await reset.evaluate(()=>window.__droopTest.resetCalls[0]);
assert(resetCall.email==='creator@example.test','forgot-password should use the entered email');
assert(resetCall.options.redirectTo.endsWith('/account.html'),'password reset should return to the account page');
await resetCtx.close();

const signupCtx=await browser.newContext({viewport:{width:390,height:844}});
const signup=await signupCtx.newPage();
await signup.addInitScript(()=>localStorage.setItem('droop-language','es'));
const signupStub=accountStub.replace("getSession:async()=>({data:{session},error:null})","getSession:async()=>({data:{session:null},error:null})");
await signup.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',route=>
  route.fulfill({status:200,contentType:'application/javascript',body:signupStub})
);
await signup.goto(base+'/account.html?mode=signup',{waitUntil:'domcontentloaded'});
await signup.locator('#auth-email').fill('fresh@example.test');
await signup.locator('#auth-password').fill('ClaveNueva123');
await signup.locator('#auth-submit').click();
await signup.waitForFunction(()=>window.__droopTest.signUpCalls.length===1);
const signupCall=await signup.evaluate(()=>window.__droopTest.signUpCalls[0]);
assert(signupCall.email==='fresh@example.test','fresh registration should call Supabase signUp with the entered email');
assert(signupCall.options.emailRedirectTo===base+'/account.html','fresh registration should return email confirmation to the production-shaped account route');
assert((await signup.locator('#auth-status').innerText()).includes('Revisá tu correo'),'fresh registration without a session should request email confirmation');
await signupCtx.close();

const loginCtx=await browser.newContext({viewport:{width:390,height:844}});
const login=await loginCtx.newPage();
await login.addInitScript(()=>localStorage.setItem('droop-language','es'));
const loginStub=accountStub.replace("getSession:async()=>({data:{session},error:null})","getSession:async()=>({data:{session:null},error:null})");
await login.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',route=>
  route.fulfill({status:200,contentType:'application/javascript',body:loginStub})
);
await login.goto(base+'/account.html',{waitUntil:'domcontentloaded'});
await login.locator('#auth-email').fill('creator@example.test');
await login.locator('#auth-password').fill('ClaveLogin123');
await login.locator('#auth-submit').click();
await login.waitForFunction(()=>window.__droopTest.signInCalls.length===1);
assert(await login.locator('#signed-in').isVisible(),'successful login should render the signed-in workspace');
await loginCtx.close();

const billingCtx=await browser.newContext({viewport:{width:390,height:844}});
const billing=await billingCtx.newPage();
await billing.addInitScript(()=>localStorage.setItem('droop-language','es'));
await billing.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',route=>
  route.fulfill({status:200,contentType:'application/javascript',body:accountStub})
);
let checkoutRequestHeaders=null;
let portalRequestHeaders=null;
await billing.route('https://qbzqiiinugidkdxcpdln.supabase.co/functions/v1/lemonsqueezy-portal',async route=>{portalRequestHeaders=await route.request().allHeaders();await route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:'No manageable subscription'})});});
await billing.route('https://qbzqiiinugidkdxcpdln.supabase.co/functions/v1/lemonsqueezy-checkout',async route=>{
  checkoutRequestHeaders=await route.request().allHeaders();
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':base},body:JSON.stringify({url:'https://app.lemonsqueezy.com/checkout/test-droop'})});
});
await billing.route('https://app.lemonsqueezy.com/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<title>Lemon test</title>'}));
await billing.goto(base+'/account.html?billing_test=1',{waitUntil:'domcontentloaded'});
await billing.waitForSelector('#billing-test-panel:not([hidden])');
assert((await billing.locator('#billing-test-checkout').innerText()).includes('prueba'),'billing test CTA should render in Spanish');
await Promise.all([
  billing.waitForURL('https://app.lemonsqueezy.com/**'),
  billing.locator('#billing-test-checkout').click()
]);
assert(checkoutRequestHeaders?.authorization==='Bearer test-user-jwt','billing checkout request must send the signed-in JWT explicitly');
assert(checkoutRequestHeaders?.apikey,'billing checkout request must send the public API key');
await billingCtx.close();

const returnCtx=await browser.newContext({viewport:{width:390,height:844}});
const returned=await returnCtx.newPage();
await returned.addInitScript(()=>localStorage.setItem('droop-language','es'));
await returned.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',route=>
  route.fulfill({status:200,contentType:'application/javascript',body:accountStub})
);
await returned.goto(base+'/account.html?billing=success',{waitUntil:'domcontentloaded'});
await returned.waitForSelector('#billing-test-panel:not([hidden])');
assert((await returned.locator('#billing-test-status').innerText()).includes('sigue en FREE'),'test checkout return must explain that production plan stays Free');
assert(await returned.locator('#billing-test-checkout').isHidden(),'return state should hide the test checkout button');
await returned.route('https://qbzqiiinugidkdxcpdln.supabase.co/functions/v1/lemonsqueezy-portal',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({url:null,portal_available:false,reason:'store_activation_required',status:'active',cancelled:false,renews_at:'2026-10-18T20:57:59Z',ends_at:null,test_mode:true})}));
await returned.reload({waitUntil:'domcontentloaded'});
await returned.waitForFunction(()=>document.querySelector('#billing-test-status')?.textContent.includes('active'));
assert((await returned.locator('#billing-test-status').innerText()).includes('modo live'),'test subscription should explain that Lemon management waits for live store activation');
assert(await returned.locator('#billing-manage').isHidden(),'test mode should not expose a customer portal that Lemon refuses before activation');
assert(await returned.locator('#billing-test-checkout').isHidden(),'existing test subscription should hide the create-checkout button');
await returnCtx.close();

await browser.close();
console.log('account browser smoke checks: ok');
