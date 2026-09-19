const fs=require('fs'),assert=require('assert');
const cfg=fs.readFileSync('js/supabase-config.js','utf8');
const html=fs.readFileSync('account.html','utf8');
const helper=fs.readFileSync('js/auth-turnstile.js','utf8');
const account=fs.readFileSync('js/account.js','utf8');

assert(cfg.includes("turnstileEnabled:true"),'Turnstile gate must be enabled for production');
assert(cfg.includes("turnstileSiteKey:'0x4AAAAAAE9BxmFBZeIQjQZP'"),'Production Turnstile Site Key must be configured');
assert(!cfg.toLowerCase().includes('turnstile_secret'),'Turnstile secret must never be exposed in browser config');

assert(html.includes('id="auth-turnstile"'),'Account form must include the Turnstile mount point');
assert(html.includes('js/auth-turnstile.js?v=1'),'Account page must load the staged Turnstile helper');
const turnstilePos=html.indexOf('js/auth-turnstile.js?v=1');const accountMatch=html.match(/js\\/account\\.js\\?v=\\d+/);assert(accountMatch,'Account behavior must load with a versioned script');const accountPos=html.indexOf(accountMatch[0]);assert(turnstilePos>=0&&turnstilePos<accountPos,'Turnstile helper must load before account behavior');

assert.doesNotThrow(()=>new Function(helper),'Turnstile helper must remain valid JavaScript');
assert.doesNotThrow(()=>new Function(account),'Account behavior must remain valid JavaScript');
assert(helper.includes("cfg.turnstileEnabled===true"),'Turnstile helper must require the explicit public gate');
assert(helper.includes("cfg.turnstileSiteKey.trim().length>10"),'Turnstile helper must refuse an empty placeholder key');
assert(helper.includes('challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'),'Turnstile must load from the official Cloudflare endpoint');
assert(helper.includes("execution:'execute'"),'Turnstile must run on demand');
assert(helper.includes("appearance:'interaction-only'"),'Turnstile should stay unobtrusive unless user interaction is needed');

assert(account.includes("client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/account.html',...(captchaToken?{captchaToken}:{})}})"),'Sign up must forward captchaToken');
assert(account.includes("client.auth.signInWithPassword({email,password,...(captchaToken?{options:{captchaToken}}:{})})"),'Password sign in must forward captchaToken');
assert(account.includes("client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/account.html',...(captchaToken?{captchaToken}:{})})"),'Password reset must forward captchaToken');
assert(account.includes("signInWithOAuth({provider:'google'"),'Google OAuth must remain available independently');
assert(account.includes("DroopAuthCaptcha?.reset?.()"),'Auth flow must reset one-time CAPTCHA tokens after use');

console.log('auth turnstile staging checks: ok');
