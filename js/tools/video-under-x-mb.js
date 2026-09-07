(() => {
'use strict';
const input=document.getElementById('videoFileInput'),drop=document.getElementById('videoDropZone'),info=document.getElementById('videoFileInfo'),size=document.getElementById('videoTargetSize'),unit=document.getElementById('videoTargetUnit'),audio=document.getElementById('videoAudioBitrate'),button=document.getElementById('videoAnalyzeButton'),result=document.getElementById('videoAnalyzeResult'),durationEl=document.getElementById('videoDuration'),originalEl=document.getElementById('videoOriginalSize'),targetEl=document.getElementById('videoTargetResult'),bitrateEl=document.getElementById('videoBitrateResult'),status=document.getElementById('videoStatus');
let file=null,duration=0,videoKbps=0,audioKbps=128,targetBytes=0,ffmpeg=null,outputURL=null;

const actionWrap=document.createElement('div');
actionWrap.className='controls';
actionWrap.innerHTML='<button id="videoEncodeButton" type="button" disabled>Compress video</button><div id="videoProgressBox" class="status-box" hidden></div><button id="videoDownloadButton" class="download-button" type="button" hidden>Download compressed video</button>';
result.appendChild(actionWrap);
const encodeButton=actionWrap.querySelector('#videoEncodeButton'),progressBox=actionWrap.querySelector('#videoProgressBox'),downloadButton=actionWrap.querySelector('#videoDownloadButton');

function bytes(n){if(n<1048576)return `${(n/1024).toFixed(1)} KB`;return `${(n/1048576).toFixed(2)} MB`;}
function time(s){const m=Math.floor(s/60),r=Math.round(s%60);return `${m}:${String(r).padStart(2,'0')}`;}
function ext(name){const m=(name||'').match(/\.([a-z0-9]+)$/i);return m?m[1].toLowerCase():'mp4';}
function safeBase(name){return (name||'video').replace(/\.[^.]+$/,'').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'')||'video';}
function cleanError(err){const raw=err&&err.message?err.message:String(err||'Unknown error');return raw.replace(/^Error:\s*/,'').slice(0,500);}
function resetOutput(){if(outputURL){URL.revokeObjectURL(outputURL);outputURL=null;}downloadButton.hidden=true;progressBox.hidden=true;encodeButton.disabled=true;}
function setFile(f){if(!f||!f.type.startsWith('video/'))return alert('Please choose a video file.');file=f;duration=0;resetOutput();button.disabled=true;result.hidden=true;info.hidden=false;info.textContent=`${f.name} · ${bytes(f.size)} · reading duration…`;const u=URL.createObjectURL(f),v=document.createElement('video');v.preload='metadata';v.onloadedmetadata=()=>{duration=v.duration;URL.revokeObjectURL(u);if(!Number.isFinite(duration)||duration<=0)return alert('Could not read video duration.');info.textContent=`${f.name} · ${bytes(f.size)} · ${time(duration)}`;button.disabled=false;};v.onerror=()=>{URL.revokeObjectURL(u);alert('Could not read this video. Try MP4 or WebM.');};v.src=u;}
input.addEventListener('change',e=>setFile(e.target.files[0]));['dragenter','dragover'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.add('dragging')}));['dragleave','drop'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.remove('dragging')}));drop.addEventListener('drop',e=>setFile(e.dataTransfer.files[0]));

button.addEventListener('click',()=>{if(!file||!duration)return;const target=Number(size.value);if(!target||target<=0)return alert('Enter a valid target size.');targetBytes=target*(unit.value==='MB'?1048576:1024);audioKbps=Number(audio.value);const totalKbps=(targetBytes*8/duration/1000)*0.93;videoKbps=Math.floor(totalKbps-audioKbps);durationEl.textContent=time(duration);originalEl.textContent=bytes(file.size);targetEl.textContent=`${target} ${unit.value}`;downloadButton.hidden=true;if(videoKbps<80){bitrateEl.textContent='Too low';status.textContent='That target is probably too small for this duration. Increase the target size for a usable video.';encodeButton.disabled=true;}else if(targetBytes>=file.size){bitrateEl.textContent='No compression needed';status.textContent='Your original video is already under this limit.';encodeButton.disabled=true;}else{bitrateEl.textContent=`≈ ${videoKbps} kbps`;status.textContent=`Ready to encode around ${videoKbps} kbps video + ${audioKbps} kbps audio. Encoding happens on this device and may take a while for long videos.`;encodeButton.disabled=false;encodeButton.textContent='Compress video';}
result.hidden=false;});

function loadScript(src){return new Promise((resolve,reject)=>{const existing=document.querySelector(`script[data-ct-src="${src}"]`);if(existing){if(existing.dataset.loaded==='1')return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',()=>reject(new Error(`Could not load ${src}`)),{once:true});return;}const s=document.createElement('script');s.src=src;s.async=true;s.crossOrigin='anonymous';s.dataset.ctSrc=src;s.onload=()=>{s.dataset.loaded='1';resolve();};s.onerror=()=>reject(new Error(`Could not load ${src}`));document.head.appendChild(s);});}

async function loadFFmpeg(){
  if(ffmpeg)return ffmpeg;
  progressBox.hidden=false;
  progressBox.textContent='Loading video engine for the first run…';
  const cdns=[
    'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js',
    'https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js'
  ];
  let loaded=false,lastErr=null;
  for(const src of cdns){try{await loadScript(src);if(window.FFmpeg&&window.FFmpeg.createFFmpeg){loaded=true;break;}}catch(e){lastErr=e;}}
  if(!loaded)throw lastErr||new Error('FFmpeg library did not initialize in this browser.');
  const {createFFmpeg,fetchFile}=window.FFmpeg;
  const instance=createFFmpeg({
    log:false,
    corePath:'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
    progress:({ratio})=>{if(Number.isFinite(ratio)){const pct=Math.max(0,Math.min(100,Math.round(ratio*100)));progressBox.textContent=`Compressing… ${pct}% · keep this tab open`;}}
  });
  try{await instance.load();}
  catch(firstError){
    progressBox.textContent='First engine source failed — trying fallback…';
    const fallback=createFFmpeg({
      log:false,
      corePath:'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
      progress:({ratio})=>{if(Number.isFinite(ratio)){const pct=Math.max(0,Math.min(100,Math.round(ratio*100)));progressBox.textContent=`Compressing… ${pct}% · keep this tab open`;}}
    });
    try{await fallback.load();fallback.__fetchFile=fetchFile;ffmpeg=fallback;return fallback;}
    catch(secondError){throw new Error(`Video engine failed to load. ${cleanError(secondError)}`);}
  }
  instance.__fetchFile=fetchFile;ffmpeg=instance;return instance;
}

encodeButton.addEventListener('click',async()=>{if(!file||videoKbps<80)return;encodeButton.disabled=true;downloadButton.hidden=true;progressBox.hidden=false;try{
  const engine=await loadFFmpeg();
  progressBox.textContent='Preparing video in browser memory…';
  const inputName=`input.${ext(file.name)}`,outputName='creator-tools-output.mp4';
  try{engine.FS('unlink',inputName);}catch(_){}try{engine.FS('unlink',outputName);}catch(_){}
  engine.FS('writeFile',inputName,await engine.__fetchFile(file));
  progressBox.textContent='Compressing… 0% · keep this tab open';
  await engine.run('-i',inputName,'-map','0:v:0','-map','0:a?','-c:v','libx264','-b:v',`${videoKbps}k`,'-maxrate',`${Math.max(videoKbps,100)}k`,'-bufsize',`${Math.max(videoKbps*2,200)}k`,'-preset','veryfast','-pix_fmt','yuv420p','-c:a','aac','-b:a',`${audioKbps}k`,'-movflags','+faststart','-y',outputName);
  const data=engine.FS('readFile',outputName);const blob=new Blob([data.buffer],{type:'video/mp4'});
  if(outputURL)URL.revokeObjectURL(outputURL);outputURL=URL.createObjectURL(blob);
  downloadButton.dataset.filename=`${safeBase(file.name)}-under-${String(size.value).replace('.','-')}${unit.value.toLowerCase()}.mp4`;downloadButton.hidden=false;
  progressBox.textContent=`Done ✓ ${bytes(blob.size)} output. ${blob.size<=targetBytes?'Target reached.':'Slightly above target; encoding size can vary a little.'}`;
  try{engine.FS('unlink',inputName);}catch(_){}try{engine.FS('unlink',outputName);}catch(_){}
}catch(err){console.error('[CreatorTools video compression]',err);progressBox.textContent=`Compression failed: ${cleanError(err)}`;}finally{encodeButton.disabled=false;encodeButton.textContent='Compress again';}});

downloadButton.addEventListener('click',()=>{if(!outputURL)return;const a=document.createElement('a');a.href=outputURL;a.download=downloadButton.dataset.filename||'creator-tools-compressed.mp4';document.body.appendChild(a);a.click();a.remove();});
})();