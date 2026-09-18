const fs=require('fs'),assert=require('assert');
const processingTools=[
'js/tools/audio-extractor.js','js/tools/audio-trimmer.js','js/tools/background-remover.js',
'js/tools/image-converter.js','js/tools/image-upscaler.js','js/tools/make-it-fit-v2.js',
'js/tools/metadata-cleaner.js','js/tools/release-pack.js','js/tools/subtitle-burner.js',
'js/tools/thumbnail-maker.js','js/tools/under-x-mb.js','js/tools/video-cropper.js',
'js/tools/video-to-gif.js','js/tools/video-trimmer.js','js/tools/video-under-x-mb.js'
];
for(const file of processingTools){
 const source=fs.readFileSync(file,'utf8');
 assert(source.includes('DroopAnalytics?.start'),file+' must emit process_start');
 assert(source.includes("DroopAnalytics?.finish('complete')")||source.includes("DroopAnalytics?.finish(ok ? 'complete' : 'error')")||source.includes("DroopAnalytics?.finish(reason==='ready'?'complete'"),file+' must emit process_complete');
 assert(source.includes("DroopAnalytics?.finish('error')")||source.includes("DroopAnalytics?.finish(ok ? 'complete' : 'error')")||source.includes("DroopAnalytics?.finish(reason==='ready'?'complete'"),file+' must emit process_error');
}
console.log('analytics processing coverage: ok');
