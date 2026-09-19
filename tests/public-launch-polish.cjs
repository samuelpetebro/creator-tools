const fs=require('fs');
const path=require('path');
const assert=require('assert');

function walk(dir){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.name==='.git'||entry.name==='node_modules')continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...walk(full));
    else if(entry.isFile()&&entry.name.endsWith('.html'))out.push(full);
  }
  return out;
}
function stripQueryHash(href){return href.split('#')[0].split('?')[0];}
function resolveInternal(from,href){
  if(!href||href.startsWith('#')||/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(href))return null;
  const clean=decodeURIComponent(stripQueryHash(href));
  if(!clean)return null;
  const rel=clean.startsWith('/')?clean.slice(1):path.join(path.dirname(from),clean);
  let target=path.normalize(rel);
  if(clean.endsWith('/'))target=path.join(target,'index.html');
  else if(!path.extname(target)&&fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
  return target;
}

const htmlFiles=walk('.').filter(file=>!file.startsWith('docs'+path.sep));
const broken=[];
const empty=[];
for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  for(const match of html.matchAll(/href=["']([^"']*)["']/g)){
    const href=match[1];
    if(href==='#'||href.trim()===''){empty.push({file,href});continue;}
    const target=resolveInternal(file,href);
    if(target&&!fs.existsSync(target))broken.push({file,href,target});
  }
}
assert.deepStrictEqual(empty,[],'HTML must not ship empty or # hrefs: '+JSON.stringify(empty));
assert.deepStrictEqual(broken,[],'Internal links must resolve to real files: '+JSON.stringify(broken));

const proHtml=fs.readFileSync('pro.html','utf8');
const proJs=fs.readFileSync('js/pro.js','utf8');
const faq=fs.readFileSync('faq.html','utf8');
const notFound=fs.readFileSync('404.html','utf8');

for(const phrase of ['Test billing passed','test mode','live credentials','webhooks and subscription lifecycle']){
  assert(!proHtml.includes(phrase),`Public Pro HTML must not expose internal launch language: ${phrase}`);
}
for(const phrase of ['Test billing passed','live credentials','webhooks and subscription lifecycle']){
  assert(!proJs.includes(phrase),`Public Pro copy must not expose internal launch language: ${phrase}`);
}

assert(proHtml.includes('Droop Pro is ready. Checkout opens soon.'),'Pro page needs polished prelaunch status');
assert(proHtml.includes('Built to remove repetition, not basic access.'),'Pro page should describe principles instead of an unfinished roadmap');
assert(proJs.includes("comingSoon:'OPENING SOON'"),'English prelaunch badge should be customer-facing');
assert(proJs.includes("comingSoon:'ABRE PRONTO'"),'Spanish prelaunch badge should be customer-facing');
assert(faq.includes('Checkout opens as soon as payments are enabled.'),'FAQ should explain availability without internal billing details');
assert(notFound.includes('/account.html?mode=signup'),'404 create-account CTA must open signup mode');
assert(notFound.includes('/terms.html'),'404 footer must expose Terms');

console.log(`public launch polish checks: ok (${htmlFiles.length} HTML files checked)`);
