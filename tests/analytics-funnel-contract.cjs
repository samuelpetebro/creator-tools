const fs=require('fs'),assert=require('assert');

const analytics=fs.readFileSync('js/analytics.js','utf8');
const funnel=fs.readFileSync('docs/product-funnel.md','utf8');

const eventSources={
  oauth_google_start:['js/account.js'],
  signup_success:['js/account.js'],
  login_success:['js/account.js'],
  preset_save:['js/cloud.js'],
  preset_load:['js/cloud.js'],
  preset_delete:['js/cloud.js'],
  pro_batch_use:[
    'js/tools/image-converter-batch.js',
    'js/tools/metadata-cleaner-batch.js',
    'js/tools/make-it-fit-batch.js',
    'js/tools/under-x-mb-batch.js',
    'js/tools/audio-converter-batch.js'
  ],
  pro_custom_pack_use:['js/tools/release-pack-pro.js'],
  pro_creator_profile_save:['js/creator-profiles.js'],
  pro_creator_profile_activate:['js/creator-profiles.js'],
  pro_creator_profile_delete:['js/creator-profiles.js'],
  pro_creator_profile_apply:['js/creator-profile-apply.js'],
  pro_brand_kit_save:['js/brand-kits.js'],
  pro_brand_kit_activate:['js/brand-kits.js'],
  pro_brand_kit_delete:['js/brand-kits.js'],
  pro_brand_kit_apply:['js/brand-kit-apply.js'],
  pro_recipe_save:['js/workflow-recipes.js'],
  pro_recipe_delete:['js/workflow-recipes.js'],
  pro_recipe_run:['js/workflow-recipes.js'],
  pro_run_again:['js/workflow-recipes.js'],
  pro_backup_export:['js/account.js'],
  pro_backup_import:['js/account.js']
};

for(const [event,files] of Object.entries(eventSources)){
  assert(analytics.includes("'"+event+"'"),event+' must remain allowlisted by analytics.js');
  assert(funnel.includes("`"+event+"`"),event+' must remain documented in the product funnel');
  for(const file of files){
    const source=fs.readFileSync(file,'utf8');
    assert(source.includes("'"+event+"'")||source.includes('"'+event+'"'),file+' must emit '+event);
  }
}

const processingTools=[
  'js/tools/audio-extractor.js','js/tools/audio-trimmer.js','js/tools/background-remover.js',
  'js/tools/image-converter.js','js/tools/image-upscaler.js','js/tools/make-it-fit-stable.js',
  'js/tools/metadata-cleaner.js','js/tools/release-pack.js','js/tools/subtitle-burner.js',
  'js/tools/thumbnail-maker.js','js/tools/under-x-mb.js','js/tools/video-cropper.js',
  'js/tools/video-to-gif.js','js/tools/video-trimmer.js','js/tools/video-under-x-mb.js'
];
for(const file of processingTools){
  const source=fs.readFileSync(file,'utf8');
  assert(source.includes('DroopAnalytics?.start'),file+' must emit lifecycle start');
  assert(source.includes('DroopAnalytics?.finish'),file+' must emit a lifecycle outcome');
}

const releasePack=fs.readFileSync('js/tools/release-pack.js','utf8');
assert(
  /<button class="download-button" type="button">/.test(releasePack),
  'Individual Release Pack output downloads must use the trusted shared download selector'
);

for(const page of ['make-it-fit.html','under-x-mb.html','release-pack.html','metadata-cleaner.html','image-converter.html','background-remover.html','video-trimmer.html','extract-audio/index.html','audio-converter.html','audio-trimmer.html','video-cropper.html','thumbnail-maker.html','video-to-gif.html','subtitle-burner.html','image-upscaler.html']){
  const html=fs.readFileSync(page,'utf8');
  assert(/download-button|<a[^>]+download\b/i.test(html),page+' must expose a trusted download control');
}

console.log('analytics funnel contract: ok');
