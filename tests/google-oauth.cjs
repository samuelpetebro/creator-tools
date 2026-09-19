const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync('account.html','utf8');
const js=fs.readFileSync('js/account.js','utf8');
const cfg=fs.readFileSync('js/supabase-config.js','utf8');
const analytics=fs.readFileSync('js/analytics.js','utf8');

assert(html.includes('id="google-signin"'),'account must expose the Google sign-in control');
assert(html.includes('id="social-auth"')&&html.includes('hidden'),'social auth UI must default hidden until provider setup is complete');
assert(cfg.includes('googleOAuthEnabled:true'),'Google OAuth must be enabled after provider credentials and redirect URLs are configured');
assert(js.includes("signInWithOAuth({provider:'google'"),'account must use Supabase Google OAuth');
assert(js.includes("redirectTo:location.origin+'/account.html?oauth=google'"),'Google OAuth must return to the Droop account page');
assert(js.includes("track?.('oauth_google_start')"),'Google OAuth start must use the privacy-safe analytics adapter');
assert(analytics.includes("'oauth_google_start'"),'Google OAuth analytics event must be allowlisted');
assert(!cfg.toLowerCase().includes('client_secret'),'public Supabase config must not contain a Google client secret');
console.log('google oauth rollout checks: ok');
