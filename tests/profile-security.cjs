const fs=require('fs'),assert=require('assert');
const account=fs.readFileSync('js/account.js','utf8');
const html=fs.readFileSync('account.html','utf8');
const migration=fs.readFileSync('supabase/004_profile_display_name_rpc.sql','utf8');

assert(account.includes("client.rpc('set_my_display_name'"),'display name must use the dedicated RPC');
assert(!account.includes("from('profiles').update({display_name:name})"),'browser must not directly update profiles');
assert(html.includes('js/account.js?v=6'),'account bundle cache version must be bumped');
assert(migration.includes('revoke update on table public.profiles from anon, authenticated'),'direct profile updates must stay revoked');
assert(migration.includes('security definer'),'display-name RPC must execute through a controlled server-side function');
assert(migration.includes('auth.uid()'),'RPC must bind updates to the authenticated user');
assert(migration.includes('char_length(display_name) <= 60'),'database must enforce display-name length');

console.log('profile security checks: ok');