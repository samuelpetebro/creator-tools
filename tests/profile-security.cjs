const fs=require('fs'),assert=require('assert');
const account=fs.readFileSync('js/account.js','utf8');
const html=fs.readFileSync('account.html','utf8');
const migration=fs.readFileSync('supabase/004_profile_display_name_rpc.sql','utf8');

assert(account.includes("client.rpc('set_my_display_name'"),'display name must use the dedicated RPC');
assert(!account.includes("from('profiles').update({display_name:name})"),'browser must not directly update profiles');
assert(/js\/account\.js\?v=\d+/.test(html),'account page must load a versioned account bundle');
assert(migration.includes('revoke update on table public.profiles from anon, authenticated'),'direct profile updates must stay revoked');
assert(migration.includes('security definer'),'initial RPC migration must fail closed before the invoker refinement');
const grants=fs.readFileSync('supabase/007_revoke_browser_admin_table_privileges.sql','utf8');
const refinement=fs.readFileSync('supabase/005_profile_display_name_invoker.sql','utf8');
assert(refinement.includes('security invoker'),'final display-name RPC should use caller privileges');
assert(refinement.includes('grant update (display_name)'),'only display_name should receive a client update grant');
assert(refinement.includes('profiles own display name update'),'RLS must restrict profile updates to the owner');
assert(migration.includes('auth.uid()'),'RPC must bind updates to the authenticated user');
assert(migration.includes('char_length(display_name) <= 60'),'database must enforce display-name length');

assert(grants.includes('revoke truncate, references, trigger on table public.profiles from anon, authenticated'),'browser roles must not administer profiles');
assert(grants.includes('revoke truncate, references, trigger on table public.presets from anon, authenticated'),'browser roles must not administer presets');
assert(grants.includes('revoke truncate, references, trigger on table public.billing_subscriptions from anon, authenticated'),'browser roles must not administer billing subscriptions');
assert(grants.includes('revoke truncate, references, trigger on table public.billing_webhook_events from anon, authenticated'),'browser roles must not administer webhook events');

console.log('profile security checks: ok');