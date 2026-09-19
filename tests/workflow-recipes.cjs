const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync('workflows.html','utf8');
const js=fs.readFileSync('js/workflow-recipes.js','utf8');
const schema=fs.readFileSync('supabase/006_workflow_recipes.sql','utf8');
const analytics=fs.readFileSync('js/analytics.js','utf8');
const privacy=fs.readFileSync('privacy.html','utf8');
const pro=fs.readFileSync('pro.html','utf8');

assert.doesNotThrow(()=>new Function(js),'Workflow Recipes behavior must remain valid JavaScript');
assert(html.includes('meta name="robots" content="noindex,follow"'),'Workflow Recipes account workspace should not be an SEO landing page');
assert(html.includes('js/pro-access.js?v=1'),'Workflow Recipes must use signed-in Pro access');
assert(html.includes('js/batch-zip.js?v=1'),'Workflow Recipes must build ZIPs locally');
assert(html.includes('multiple'),'Workflow Recipes runner must accept batches');

assert(js.includes('MAX_RECIPES=20,MAX_FILES=20,MAX_BYTES=200*1024*1024'),'Workflow Recipes limits must stay explicit');
assert(js.includes("from('workflow_recipes')"),'Workflow Recipes must sync definitions through the dedicated table');
assert(js.includes('for(let i=0;i<files.length;i++)'),'batch processing must stay sequential to reduce memory pressure');
assert(js.includes("output_format==='jpeg'?'image/jpeg':'image/webp'"),'Workflow Recipes must support JPEG and WebP');
assert(js.includes("replaceAll('{{name}}'"),'filename templates must support the source name token');
assert(js.includes("replaceAll('{{recipe}}'"),'filename templates must support the recipe token');
assert(js.includes("replaceAll('{{index}}'"),'filename templates must support the index token');
assert(js.includes("accessApi.refresh()"),'Workflow execution must re-check Pro access at run time');
assert(js.includes("track?.('pro_recipe_run')"),'Workflow execution must record privacy-safe Pro activation');
assert(js.includes('textContent=item.name'),'saved recipe names must render as text, not HTML');

assert(schema.includes('alter table public.workflow_recipes enable row level security'),'Workflow Recipes must use RLS');
assert(schema.includes('(select auth.uid()) = user_id'),'Workflow Recipe policies must bind rows to the signed-in user');
assert(schema.includes("account_plan is distinct from 'pro'"),'Workflow Recipe writes must be server-gated to Pro');
assert(schema.includes('current_count >= 20'),'Workflow Recipes must have a server-side 20-recipe limit');
assert(schema.includes("jsonb_typeof(recipe) = 'object'"),'Workflow Recipe definitions must be JSON objects');
assert(schema.includes('octet_length(recipe::text) <= 16384'),'Workflow Recipe definitions must have a server-side size limit');
assert(schema.includes('revoke all on table public.workflow_recipes from public, anon, authenticated'),'Workflow Recipe grants must begin deny-all');
assert(schema.includes('grant select, insert, update, delete on table public.workflow_recipes to authenticated'),'only authenticated browser users receive recipe CRUD');

assert(analytics.includes("'/workflows.html'"),'analytics adapter must allow the Workflow Recipes page');
assert(analytics.includes("'pro_recipe_save'")&&analytics.includes("'pro_recipe_delete'")&&analytics.includes("'pro_recipe_run'"),'Workflow Recipe events must be explicitly allowlisted');
assert(privacy.includes('Workflow Recipes contain reusable settings only'),'privacy page must document recipe storage');
assert(pro.includes('Up to 20 Workflow Recipes'),'Pro page must advertise Workflow Recipes');

console.log('workflow recipe checks: ok');
