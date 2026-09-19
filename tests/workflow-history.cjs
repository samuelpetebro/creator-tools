const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync('workflows.html','utf8');
const core=fs.readFileSync('js/workflow-recipes.js','utf8');
const history=fs.readFileSync('js/workflow-history.js','utf8');
const analytics=fs.readFileSync('js/analytics.js','utf8');
const privacy=fs.readFileSync('privacy.html','utf8');
const pro=fs.readFileSync('pro.html','utf8');

assert.doesNotThrow(()=>new Function(core),'Workflow core must remain valid JavaScript');
assert.doesNotThrow(()=>new Function(history),'Workflow history must remain valid JavaScript');
assert(html.includes('id="workflow-history-list"'),'Workflow page must render Recent Runs');
assert(html.includes('js/workflow-history.js?v=1'),'Workflow page must load local history behavior');
assert(history.includes("KEY='droop-pro-run-history',MAX=10"),'Recent Runs must stay bounded at 10 local entries');
assert(history.includes('localStorage.setItem(KEY'), 'Recent Runs must stay browser-local');
assert(!history.includes("from('workflow"),'Recent Runs must not sync to Supabase');
assert(!history.includes('file.name'),'Recent Runs code must not collect filenames');
assert(core.includes("new CustomEvent('droop:workflow-run-complete'"),'workflow runs must emit a safe aggregate completion event');
assert(core.includes("recipe_name:item.name,recipe,ok:entries.length,failed,total:files.length,ran_at:"),'history completion detail must be recipe settings plus aggregate counts');
assert(!core.includes("recipe_name:item.name,recipe,files:"),'history completion detail must never include the file list');
assert(core.includes("new CustomEvent('droop:workflow-run-again'")||history.includes("new CustomEvent('droop:workflow-run-again'"),'Run Again must use an explicit local event');
assert(core.includes("selectedSnapshot={id:null,name,recipe:sanitizeRecipe"),'Run Again snapshots must be sanitized before execution');
assert(analytics.includes("'pro_run_again'"),'Run Again analytics must be explicitly allowlisted');
assert(privacy.includes('do not include filenames or media'),'privacy page must disclose Recent Runs data boundaries');
assert(pro.includes('Local Recent Runs + Run Again'),'Pro page must mark Recent Runs as ready');

console.log('workflow history checks: ok');
