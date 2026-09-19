const fs=require('fs'),assert=require('assert');

const html=fs.readFileSync('account.html','utf8');
const accountProfiles=fs.readFileSync('js/creator-profiles.js','utf8');
const apply=fs.readFileSync('js/creator-profile-apply.js','utf8');
const schema=fs.readFileSync('supabase/004_creator_profiles.sql','utf8');
const activeRpc=fs.readFileSync('supabase/005_creator_profile_active_rpc.sql','utf8');
const analytics=fs.readFileSync('js/analytics.js','utf8');
const make=fs.readFileSync('make-it-fit.html','utf8');
const release=fs.readFileSync('release-pack.html','utf8');
const privacy=fs.readFileSync('privacy.html','utf8');
const pro=fs.readFileSync('pro.html','utf8');

assert.doesNotThrow(()=>new Function(accountProfiles),'Creator Profiles account behavior must remain valid JavaScript');
assert.doesNotThrow(()=>new Function(apply),'Creator Profile apply helper must remain valid JavaScript');
assert(html.includes('id="account-creator-profiles"'),'account must expose the Creator Profiles workspace');
assert(html.includes('js/creator-profiles.js?v=1'),'account must load Creator Profiles behavior');
assert(accountProfiles.includes("from('creator_profiles')"),'Creator Profiles UI must use the dedicated table');
assert(accountProfiles.includes("select('plan')"),'Creator Profiles UI must read the server-side plan');
assert(accountProfiles.includes("plan!=='pro'"),'Creator Profiles writes must require Pro in the client UX');
assert(accountProfiles.includes("rpc('set_my_active_creator_profile'"),'active profile switching must use the atomic RPC');
assert(accountProfiles.includes('textContent=item.name'),'Creator Profile names must render as text, not HTML');
assert(!accountProfiles.includes('innerHTML=item.name'),'Creator Profile names must never render as raw HTML');

assert(schema.includes('alter table public.creator_profiles enable row level security'),'Creator Profiles must use RLS');
assert(schema.includes('(select auth.uid()) = user_id'),'Creator Profile policies must bind rows to the signed-in user');
assert(schema.includes("account_plan is distinct from 'pro'"),'Creator Profile writes must be server-gated to Pro');
assert(schema.includes('current_count >= 10'),'Creator Profiles must have a server-side 10-profile limit');
assert(schema.includes('where is_active'),'database must enforce at most one active Creator Profile');
assert(schema.includes("jsonb_typeof(settings) = 'object'"),'Creator Profile settings must be a JSON object');
assert(schema.includes('octet_length(settings::text) <= 8192'),'Creator Profile settings must have a server-side size bound');
assert(schema.includes('revoke all on table public.creator_profiles from public, anon, authenticated'),'Creator Profiles grants must start from deny-all');
assert(schema.includes('grant select, insert, update, delete on table public.creator_profiles to authenticated'),'only authenticated browser users may receive table CRUD');
assert(activeRpc.includes('where id = p_profile_id and user_id = auth.uid()'),'active-profile RPC must verify ownership');
assert(activeRpc.includes("account_plan is distinct from 'pro'"),'active-profile RPC must require Pro');
assert(activeRpc.includes('grant execute on function public.set_my_active_creator_profile(uuid) to authenticated'),'only authenticated users should receive RPC execution');

assert(make.includes('js/creator-profile-apply.js?v=1'),'Make It Fit must load active Creator Profile defaults');
assert(release.includes('js/creator-profile-apply.js?v=1'),'Release Pack must load active Creator Profile defaults');
assert(apply.includes("eq('is_active',true)"),'tool helper must load only the active Creator Profile');
assert(apply.includes("new Set(['youtube','instagram-post','instagram-story','spotify','discord-avatar'])"),'Make It Fit defaults must be allowlisted');
assert(apply.includes("new Set(['music','youtube','social','profile'])"),'Release Pack defaults must be allowlisted');
assert(analytics.includes("'pro_creator_profile_save'")&&analytics.includes("'pro_creator_profile_activate'")&&analytics.includes("'pro_creator_profile_apply'"),'Creator Profile analytics must remain explicitly allowlisted');
assert(privacy.includes('Pro Creator Profiles')&&privacy.includes('reusable settings only'),'privacy page must document Creator Profile storage');
assert(pro.includes('Up to 10 synced Creator Profiles'),'Pro page must advertise the ready Creator Profile benefit');

console.log('creator profile checks: ok');
