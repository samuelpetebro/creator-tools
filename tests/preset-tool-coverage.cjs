const fs=require('fs'),assert=require('assert');

const cloud=fs.readFileSync('js/cloud.js','utf8');
const gif=fs.readFileSync('video-to-gif.html','utf8');
const sub=fs.readFileSync('subtitle-burner.html','utf8');
const toolI18n=fs.readFileSync('js/tool-i18n.js','utf8');
const crop=fs.readFileSync('video-cropper.html','utf8');
const thumb=fs.readFileSync('thumbnail-maker.html','utf8');

assert.doesNotThrow(()=>new Function(cloud),'preset client must remain valid JavaScript');
assert(cloud.includes('[data-droop-preset]'),'preset client must capture explicit reusable settings');
assert(cloud.includes("!reusableControls(panel).length"),'tools without reusable settings should not show an empty preset widget');
assert(toolI18n.includes("if(!document.querySelector('.controls select,.controls input,.controls textarea,[data-droop-preset]'))return;"),'shared tool loader should skip cloud setup when no reusable settings exist');

for(const [name,html,ids] of [
  ['Video to GIF',gif,['gifSize','gifMotion']],
  ['Subtitle Burner',sub,['subStyle','subPosition','subSize']]
]){
  assert(html.includes('css/cloud.css?v=1'),`${name} must load preset styles`);
  assert(/js\/supabase-config\.js\?v=\d+/.test(html),`${name} must load versioned Supabase config`);
  assert(html.includes('js/cloud.js?v=3'),`${name} must load the expanded preset client`);
  for(const id of ids){
    assert(new RegExp(`id=["']${id}["'][^>]*data-droop-preset|data-droop-preset[^>]*id=["']${id}["']`).test(html),`${name} must explicitly mark ${id} as reusable`);
  }
}

assert(!gif.match(/id=["']gif(Start|Length)["'][^>]*data-droop-preset/),'clip-specific GIF timing must not be stored as a reusable preset');
assert(!sub.match(/id=["']subSrtInput["'][^>]*data-droop-preset/),'subtitle file/content input must not be stored as a reusable preset');

for(const [name,html,ids] of [
  ['Video Cropper',crop,['cropPosition']],
  ['Thumbnail Maker',thumb,['thumbPlacement','thumbColor','thumbPosition']]
]){
  assert(html.includes('css/cloud.css?v=1'),`${name} must load preset styles`);
  assert(/js\/supabase-config\.js\?v=\d+/.test(html),`${name} must load versioned Supabase config`);
  assert(html.includes('js/cloud.js?v=3'),`${name} must load the expanded preset client`);
  for(const id of ids){
    assert(new RegExp(`id=[\"']${id}[\"'][^>]*data-droop-preset|data-droop-preset[^>]*id=[\"']${id}[\"']`).test(html),`${name} must explicitly mark ${id} as reusable`);
  }
}
assert(!thumb.match(/id=["']thumbTitle["'][^>]*data-droop-preset/),'thumbnail title text must not be stored in presets');
assert(!thumb.match(/id=["']thumbFrame["'][^>]*data-droop-preset/),'source-specific thumbnail frame timing must not be stored in presets');

console.log('preset tool coverage checks: ok');
