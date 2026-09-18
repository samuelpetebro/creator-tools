const fs=require('fs'),assert=require('assert');

const pages=[
  'make-it-fit.html','under-x-mb.html','release-pack.html','image-converter.html',
  'video-under-x-mb.html','video-trimmer.html','extract-audio/index.html','audio-converter.html',
  'audio-trimmer.html','safe-zones.html','video-cropper.html','thumbnail-maker.html',
  'video-to-gif.html','subtitle-burner.html'
];

const settingless=['metadata-cleaner.html','background-remover.html','image-upscaler.html'];

for(const page of pages){
  const html=fs.readFileSync(page,'utf8');
  const nested=page.startsWith('extract-audio/');
  const css=nested?'/css/cloud.css?v=2':'css/cloud.css?v=2';
  const cfg=nested?'/js/supabase-config.js?v=1':'js/supabase-config.js?v=1';
  const cloud=nested?'/js/cloud.js?v=2':'js/cloud.js?v=2';
  assert(html.includes(css),`${page} must load saved-preset styles`);
  assert(html.includes(cfg),`${page} must load Supabase public config`);
  assert(html.includes(cloud),`${page} must load the saved-preset client`);
}

for(const page of settingless){
  const html=fs.readFileSync(page,'utf8');
  assert(!html.includes('js/cloud.js'),`${page} should not expose a preset widget when it has no reusable settings`);
}

const extract=fs.readFileSync('extract-audio/index.html','utf8');
for(const asset of ['/css/styles.css?v=8','/css/tool-page.css?v=3','/js/analytics.js?v=5','/js/tools/audio-extractor.js?v=2']){
  assert(extract.includes(asset),`Extract Audio must use root-relative deployed asset ${asset}`);
}
assert(!extract.includes('href="css/'),'Extract Audio must not resolve styles under /extract-audio/css/');
assert(!extract.includes('src="js/'),'Extract Audio must not resolve scripts under /extract-audio/js/');

const cloudJs=fs.readFileSync('js/cloud.js','utf8');
for(const event of ['preset_save','preset_load','preset_delete']){
  assert(cloudJs.includes(event),`cloud preset UI must emit ${event}`);
}
const analytics=fs.readFileSync('js/analytics.js','utf8');
for(const event of ['preset_save','preset_load','preset_delete']){
  assert(analytics.includes(`'${event}'`),`analytics allowlist must include ${event}`);
}

console.log('cloud preset entrypoints: ok');
