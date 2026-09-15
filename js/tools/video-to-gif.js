(()=>{
'use strict';const $=id=>document.getElementById(id),video=$('gifVideo');
const copy={en:{all:'All tools',trim:'Trim video',privacy:'Local processing · No uploads',kicker:'VIDEO · NEW',headline:'One good moment. On repeat.',lead:'Pick a short clip and make a GIF for your chats, posts or reactions. Right on your device.',local:'✦ Made on your device',loop:'Loops automatically',silent:'No sound',drop:'Drop a video here',choose:'or tap to choose a file',limit:'Up to 100 MB · Clips up to 10 seconds',start:'Starts at (seconds)',length:'Length (seconds)',mark:'Start here',preview:'Preview clip',size:'Size',small:'Small · lighter',medium:'Medium · balanced',large:'Large · more detail',motion:'Motion',normal:'Standard',smooth:'Smoother',create:'Create my GIF',tip:'For a smaller file, choose a shorter clip or a smaller size.',cancel:'Cancel',download:'Download GIF',info1h:'Find the moment',info1p:'Scrub the video and choose “Start here”, then set a length of up to 10 seconds. Preview the fragment before creating your GIF.',info2h:'Keep it light',info2p:'GIFs can get bigger than the original video. Short clips and smaller sizes work best, especially on phones.',info3h:'Ready to loop',info3p:'Your GIF repeats automatically and has no audio. Processing is local; the first use needs a connection to prepare the tool.',footer:'droop · Everything you need before you post.',invalid:'Choose a video smaller than 100 MB.',unreadable:'Could not open this video. Try an MP4 your browser can play.',range:'Choose a valid start and a length between 0.1 and 10 seconds, within the video.',preparing:'Preparing…',colors:'Preparing colors…',processing:'Creating your GIF…',ready:'Ready ✓',failed:'Could not create this GIF. Try a shorter clip or a smaller video.',canceled:'Canceled. You can try again.',title:'Video to GIF — droop'},es:{all:'Todas las herramientas',trim:'Recortar video',privacy:'Procesamiento local · Sin subidas',kicker:'VIDEO · NUEVO',headline:'Un buen momento. Una y otra vez.',lead:'Elegí un fragmento y creá un GIF para tus chats, publicaciones o reacciones. Directamente en tu dispositivo.',local:'✦ Hecho en tu dispositivo',loop:'Se repite automáticamente',silent:'Sin sonido',drop:'Soltá un video acá',choose:'o tocá para elegir un archivo',limit:'Hasta 100 MB · Fragmentos de hasta 10 segundos',start:'Empieza en (segundos)',length:'Duración (segundos)',mark:'Empezar acá',preview:'Ver fragmento',size:'Tamaño',small:'Pequeño · más liviano',medium:'Mediano · equilibrado',large:'Grande · más detalle',motion:'Movimiento',normal:'Normal',smooth:'Más fluido',create:'Crear mi GIF',tip:'Para un archivo más liviano, elegí menos segundos o un tamaño menor.',cancel:'Cancelar',download:'Descargar GIF',info1h:'Encontrá el momento',info1p:'Buscá el momento en el video y elegí “Empezar acá”. Indicá hasta 10 segundos y previsualizá el fragmento antes de crear el GIF.',info2h:'Mantenelo liviano',info2p:'Un GIF puede pesar más que el video original. Los fragmentos cortos y los tamaños pequeños funcionan mejor, especialmente en celulares.',info3h:'Listo para repetir',info3p:'El GIF se repite automáticamente y no tiene audio. El procesamiento es local; el primer uso necesita conexión para preparar la herramienta.',footer:'droop · Todo lo que necesitás antes de publicar.',invalid:'Elegí un video de menos de 100 MB.',unreadable:'No se pudo abrir este video. Probá con un MP4 que tu navegador pueda reproducir.',range:'Elegí un inicio válido y una duración de entre 0,1 y 10 segundos, dentro del video.',preparing:'Preparando…',colors:'Preparando colores…',processing:'Creando tu GIF…',ready:'Listo ✓',failed:'No se pudo crear el GIF. Probá con un fragmento más corto o un video más liviano.',canceled:'Cancelado. Podés volver a intentarlo.',title:'Convertir video a GIF — droop'}};
let lang=(navigator.language||'en').startsWith('es')?'es':'en';try{const l=localStorage.getItem('droop-language');if(copy[l])lang=l;}catch(_){}
let file=null,inputURL=null,outputURL=null,duration=0,active=null,selectionToken=0,previewEnd=null,key='';
const t=k=>copy[lang][k],bytes=n=>`${(n/1048576).toFixed(2)} MB`;
function status(k){key=k;$('gifStatus').hidden=!k;$('gifStatus').textContent=k?t(k):'';}
function language(){document.documentElement.lang=lang;document.title=t('title');document.querySelectorAll('[data-copy]').forEach(e=>e.textContent=t(e.dataset.copy));$('gifLang').textContent=lang==='es'?'EN':'ES';$('gifLang').setAttribute('aria-label',lang==='es'?'Switch to English':'Cambiar a español');$('gifOutput').alt=lang==='es'?'Vista previa del GIF animado':'Animated GIF preview';status(key);}
$('gifLang').onclick=()=>{lang=lang==='es'?'en':'es';try{localStorage.setItem('droop-language',lang);}catch(_){}language();};
function clear(){if(outputURL)URL.revokeObjectURL(outputURL);outputURL=null;$('gifOutput').removeAttribute('src');$('gifDownload').removeAttribute('href');$('gifResult').hidden=true;}
function controls(){const busy=!!active;$('gifControls').disabled=busy;$('gifInput').disabled=busy;$('gifCreate').disabled=busy||!file||!duration;$('gifCancel').hidden=!busy;video.controls=!busy;$('gifDrop').setAttribute('aria-disabled',String(busy));}
function range(){return GifSettings.selection(duration,$('gifStart').valueAsNumber,$('gifLength').valueAsNumber);}
function rangeLabel(){try{const r=range();$('gifRange').textContent=`${r.start.toFixed(2)} → ${(r.start+r.length).toFixed(2)} s`;}catch(_){$('gifRange').textContent=t('range');}}
function open(f){if(!f||active)return;if(f.size>100000000||!(f.type.startsWith('video/')||/\.(mp4|mov|m4v|webm)$/i.test(f.name))){status('invalid');return;}
 const token=++selectionToken;video.pause();previewEnd=null;duration=0;file=f;clear();status('preparing');$('gifEditor').hidden=true;controls();if(inputURL)URL.revokeObjectURL(inputURL);inputURL=URL.createObjectURL(f);
 video.onloadedmetadata=()=>{if(token!==selectionToken)return;duration=video.duration;if(!Number.isFinite(duration)||duration<.1||!video.videoWidth||!video.videoHeight){file=null;duration=0;status('unreadable');controls();return;}$('gifStart').max=String(duration-.1);$('gifStart').value='0';$('gifLength').value=String(Math.min(3,duration));$('gifFile').textContent=`${f.name} · ${bytes(f.size)}`;$('gifFile').hidden=false;$('gifEditor').hidden=false;rangeLabel();status('');controls();};
 video.onerror=()=>{if(token!==selectionToken)return;file=null;duration=0;$('gifEditor').hidden=true;status('unreadable');controls();};video.src=inputURL;
}
$('gifInput').onclick=()=>{$('gifInput').value='';};$('gifInput').onchange=e=>open(e.target.files[0]);
['dragenter','dragover'].forEach(k=>$('gifDrop').addEventListener(k,e=>{e.preventDefault();}));$('gifDrop').addEventListener('drop',e=>{e.preventDefault();open(e.dataTransfer.files[0]);});
['gifStart','gifLength','gifSize','gifMotion'].forEach(id=>$(id).oninput=()=>{clear();status('');rangeLabel();previewEnd=null;video.pause();});
$('gifMark').onclick=()=>{const start=Math.min(Math.max(0,video.currentTime),duration-.1);$('gifStart').value=start.toFixed(2);$('gifLength').value=Math.min(+$('gifLength').value||3,10,duration-start).toFixed(2);clear();rangeLabel();};
$('gifPreview').onclick=async()=>{try{const r=range();video.currentTime=r.start;previewEnd=r.start+r.length;await video.play();}catch(_){status('range');}};
video.ontimeupdate=()=>{if(previewEnd!==null&&video.currentTime>=previewEnd){video.pause();previewEnd=null;}};
function check(job){if(active!==job||job.controller.signal.aborted)throw new Error('CANCELED');}
async function load(job){
 let mod;try{mod=await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');}catch(e){check(job);mod=await import('https://esm.sh/@ffmpeg/ffmpeg@0.12.10');}check(job);
 const worker=new URL('js/vendor/ffmpeg-worker.js',document.baseURI).href;
 let error;
 for(const base of ['https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm','https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm']){
  check(job);const engine=new mod.FFmpeg();job.engine=engine;const urls=[];
  try{for(const name of ['ffmpeg-core.js','ffmpeg-core.wasm']){const response=await fetch(`${base}/${name}`,{signal:job.controller.signal});if(!response.ok)throw Error('LOAD_FAILED');const data=await response.arrayBuffer();check(job);urls.push(URL.createObjectURL(new Blob([data],{type:name.endsWith('.js')?'text/javascript':'application/wasm'})));}
   await engine.load({classWorkerURL:worker,coreURL:urls[0],wasmURL:urls[1]});check(job);return engine;
  }catch(e){engine.terminate();check(job);error=e;}finally{urls.forEach(u=>URL.revokeObjectURL(u));}
 }
 throw error;
}
$('gifCancel').onclick=()=>{const job=active;if(!job)return;active=null;job.controller.abort();if(job.engine)job.engine.terminate();status('canceled');controls();};
$('gifCreate').onclick=async()=>{
 if(active||!file)return;let r;try{r=range();}catch(_){status('range');return;}
 const snapshot=file,dim=GifSettings.size(video.videoWidth,video.videoHeight,+$('gifSize').value),fps=+$('gifMotion').value;
 const job={controller:new AbortController(),engine:null};active=job;video.pause();previewEnd=null;clear();status('preparing');controls();
 try{const engine=await load(job);check(job);const data=new Uint8Array(await snapshot.arrayBuffer());check(job);await engine.writeFile('input',data);check(job);
 const commands=GifSettings.commands(r.start,r.length,dim.w,dim.h,fps);
 status('colors');if(await engine.exec(commands[0])!==0)throw Error('PALETTE_FAILED');check(job);
 status('processing');if(await engine.exec(commands[1])!==0)throw Error('GIF_FAILED');check(job);
 const output=await engine.readFile('output.gif');check(job);if(!(output instanceof Uint8Array)||output.length<14)throw Error('EMPTY_OUTPUT');
 const blob=new Blob([output],{type:'image/gif'});outputURL=URL.createObjectURL(blob);$('gifOutput').src=outputURL;$('gifDownload').href=outputURL;$('gifDownload').download=`${snapshot.name.replace(/\.[^.]+$/,'').replace(/[<>:"/\\|?*\u0000-\u001F]/g,'-').slice(0,100)}.gif`;$('gifResultInfo').textContent=`GIF · ${dim.w} × ${dim.h} · ${bytes(blob.size)}`;$('gifResult').hidden=false;status('ready');
 }catch(e){if(active===job){console.error('[droop gif]',e);status('failed');}}
 finally{if(job.engine)job.engine.terminate();if(active===job){active=null;controls();}}
};
language();controls();
})();
