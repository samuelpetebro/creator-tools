const fs=require('fs'),assert=require('assert');

const pages=[
  'index.html','make-it-fit.html','under-x-mb.html','release-pack.html','metadata-cleaner.html',
  'image-converter.html','background-remover.html','video-under-x-mb.html','video-trimmer.html',
  'extract-audio/index.html','audio-converter.html','audio-trimmer.html','safe-zones.html',
  'video-cropper.html','thumbnail-maker.html','video-to-gif.html','subtitle-burner.html',
  'image-upscaler.html','pro.html','account.html','404.html'
];

const versions=new Map();
for(const page of pages){
  const html=fs.readFileSync(page,'utf8');
  const match=html.match(/analytics\.js\?v=(\d+)/);
  assert(match,`${page} must load the shared analytics bundle`);
  versions.set(page,match[1]);
}
const expected=versions.get('index.html');
for(const [page,version] of versions){
  assert.equal(version,expected,`${page} must use the same analytics cache version as index.html`);
}
console.log(`analytics entrypoints: ok (v${expected})`);
