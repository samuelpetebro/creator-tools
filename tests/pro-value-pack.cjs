const fs=require('fs'),assert=require('assert'),vm=require('vm');

const proAccess=fs.readFileSync('js/pro-access.js','utf8');
const zipCode=fs.readFileSync('js/batch-zip.js','utf8');
const imageHtml=fs.readFileSync('image-converter.html','utf8');
const metaHtml=fs.readFileSync('metadata-cleaner.html','utf8');
const imageBatch=fs.readFileSync('js/tools/image-converter-batch.js','utf8');
const metaBatch=fs.readFileSync('js/tools/metadata-cleaner-batch.js','utf8');
const account=fs.readFileSync('account.html','utf8');
const accountJs=fs.readFileSync('js/account.js','utf8');
const analytics=fs.readFileSync('js/analytics.js','utf8');
const pricing=fs.readFileSync('docs/pricing-proposal.md','utf8');

assert.doesNotThrow(()=>new Function(proAccess),'Pro access helper must remain valid JavaScript');
assert.doesNotThrow(()=>new Function(imageBatch),'image batch client must remain valid JavaScript');
assert.doesNotThrow(()=>new Function(metaBatch),'metadata batch client must remain valid JavaScript');
assert(proAccess.includes("select('plan')"),'Pro entitlement must come from the signed-in profile plan');
assert(proAccess.includes("plan==='pro'"),'Pro access must explicitly require the Pro plan');

for(const [name,html,slug,script] of [
  ['Image Converter',imageHtml,'image-converter-batch','image-converter-batch.js?v=1'],
  ['Metadata Cleaner',metaHtml,'metadata-cleaner-batch','metadata-cleaner-batch.js?v=1']
]){
  assert(html.includes(`data-pro-feature="${slug}"`),`${name} must expose a Pro batch panel`);
  assert(html.includes('js/pro-access.js?v=1'),`${name} must load the shared Pro entitlement helper`);
  assert(html.includes('js/batch-zip.js?v=1'),`${name} must load the local ZIP helper`);
  assert(html.includes(script),`${name} must load its batch behavior`);
  assert(html.includes('multiple'),`${name} batch picker must accept multiple files`);
}
assert(imageBatch.includes('const MAX=20'),'image batch must cap one run at 20 files');
assert(metaBatch.includes('const MAX=20'),'metadata batch must cap one run at 20 files');
assert(imageBatch.includes("access?.isPro"),'image batch processing must require Pro at execution time');
assert(metaBatch.includes("access?.isPro"),'metadata batch processing must require Pro at execution time');
assert(imageBatch.includes("track?.('pro_batch_use')"),'image batch must record privacy-safe Pro activation');
assert(metaBatch.includes("track?.('pro_batch_use')"),'metadata batch must record privacy-safe Pro activation');

assert(account.includes('id="account-pro-backup"'),'account must expose the Pro preset backup workspace');
assert(account.includes('id="preset-backup-export"'),'account must expose preset backup export');
assert(account.includes('id="preset-backup-import"'),'account must expose preset backup restore');
assert(accountJs.includes("currentPlan!=='pro'"),'preset backup actions must require a Pro account');
assert(accountJs.includes("payload?.version!==1"),'preset restore must validate the backup format');
assert(accountJs.includes("file.size>262144"),'preset restore must reject oversized backup payloads');
assert(accountJs.includes("new Set(Object.keys(toolNames))"),'preset restore must allowlist tool slugs');
assert(accountJs.includes("onConflict:'user_id,tool_slug,name'"),'preset restore must update matching presets instead of duplicating them');
assert(analytics.includes("'pro_batch_use'")&&analytics.includes("'pro_backup_export'")&&analytics.includes("'pro_backup_import'"),'Pro feature events must remain analytics-allowlisted');
assert(pricing.includes('USD 5/month'),'accepted Pro price must stay documented');

(async()=>{
  const context={window:{},Blob,TextEncoder,Uint8Array,Uint32Array,Date};
  vm.runInNewContext(zipCode,context);
  const zip=await context.window.DroopZip.create([
    {name:'first.txt',blob:new Blob(['one'])},
    {name:'second.txt',blob:new Blob(['two'])}
  ]);
  const bytes=Buffer.from(await zip.arrayBuffer());
  assert.equal(bytes.subarray(0,4).toString('hex'),'504b0304','batch ZIP must start with a local file header');
  assert(bytes.includes(Buffer.from('first.txt')),'batch ZIP must contain the first filename');
  assert(bytes.includes(Buffer.from('second.txt')),'batch ZIP must contain the second filename');
  assert(bytes.includes(Buffer.from([0x50,0x4b,0x05,0x06])),'batch ZIP must contain an end-of-central-directory record');
  console.log('pro value pack checks: ok');
})().catch(error=>{console.error(error);process.exit(1);});
