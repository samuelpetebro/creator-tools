(()=>{'use strict';

const root=document.querySelector('[data-pro-feature="audio-converter-batch"]');
if(!root)return;
const input=root.querySelector('#audioConvertBatchInput'),button=root.querySelector('#audioConvertBatchButton'),download=root.querySelector('#audioConvertBatchDownload'),status=root.querySelector('#audioConvertBatchStatus'),list=root.querySelector('#audioConvertBatchList');
const format=document.querySelector('#audioConvertFormat'),quality=document.querySelector('#audioConvertQuality');
const MAX_FILES=10,MAX_BYTES=100*1024*1024;
let files=[],entries=[],currentIndex=0;

const isEs=()=>{try{return (localStorage.getItem('droop-language')||localStorage.getItem('droop-lang')||navigator.language||'en').toLowerCase().startsWith('es');}catch(_){return false;}};
const tr=(en,es)=>isEs()?es:en;
const say=(message,error=false)=>{status.textContent=message||'';status.dataset.state=error?'error':'ok';};
const pretty=n=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(2)} MB`;
const safeBase=name=>String(name||'audio').replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').trim().slice(0,90)||'audio';
const isAudio=file=>file.type.startsWith('audio/')||/\.(mp3|wav|m4a|aac|ogg|oga|flac|opus|webm)$/i.test(file.name);

input.addEventListener('change',()=>{
  entries=[];list.innerHTML='';download.hidden=true;
  const selected=[...input.files];
  if(!selected.length){files=[];button.disabled=true;say('');return;}
  if(selected.length>MAX_FILES){files=[];input.value='';button.disabled=true;say(tr(`Choose up to ${MAX_FILES} audio files per batch.`,`Elegí hasta ${MAX_FILES} audios por lote.`),true);return;}
  if(selected.some(file=>!isAudio(file))){files=[];input.value='';button.disabled=true;say(tr('Every batch file must be audio.','Todos los archivos del lote deben ser de audio.'),true);return;}
  if(selected.reduce((sum,file)=>sum+file.size,0)>MAX_BYTES){files=[];input.value='';button.disabled=true;say(tr('Keep each audio batch under 100 MB total.','Mantené cada lote de audio por debajo de 100 MB en total.'),true);return;}
  files=selected;button.disabled=false;say(tr(`${files.length} audio files ready.`,`${files.length} audios listos.`));
});

button.addEventListener('click',async()=>{
  const access=await window.DroopProAccess?.refresh?.();
  if(!access?.isPro){await window.DroopProAccess?.render?.(root);say(tr('Droop Pro is required for batch audio conversion.','Necesitás Droop Pro para convertir audio por lotes.'),true);return;}
  if(!files.length)return;
  const core=window.DroopAudioConvertCore;
  if(!core?.ready){say(tr('Audio processor is unavailable. Reload and try again.','El procesador de audio no está disponible. Recargá y probá de nuevo.'),true);return;}
  button.disabled=true;input.disabled=true;download.hidden=true;entries=[];list.innerHTML='';
  const target=format.value,bitrate=quality.value,isMp3=target==='mp3',outputExt=isMp3?'mp3':'wav';
  window.DroopAnalytics?.start?.();
  try{
    const {engine,fetchFile}=await core.ready();
    core.setProgressSink?.((_,pct)=>say(tr(`Converting ${currentIndex+1} of ${files.length}… ${pct}%`,`Convirtiendo ${currentIndex+1} de ${files.length}… ${pct}%`)));
    for(currentIndex=0;currentIndex<files.length;currentIndex++){
      const source=files[currentIndex],sourceExt=core.ext(source.name),inputName=`batch-audio-${currentIndex}-input.${sourceExt}`,outputName=`batch-audio-${currentIndex}-output.${outputExt}`;
      try{await engine.deleteFile(inputName);}catch(_){}
      try{await engine.deleteFile(outputName);}catch(_){}
      say(tr(`Converting ${currentIndex+1} of ${files.length}…`,`Convirtiendo ${currentIndex+1} de ${files.length}…`));
      await engine.writeFile(inputName,await fetchFile(source));
      const args=isMp3?['-i',inputName,'-vn','-map_metadata','0','-c:a','libmp3lame','-b:a',`${bitrate}k`,'-y',outputName]:['-i',inputName,'-vn','-map_metadata','0','-c:a','pcm_s16le','-ar','44100','-y',outputName];
      const code=await engine.exec(args);
      if(code!==0)throw new Error('ffmpeg');
      const data=await engine.readFile(outputName),blob=new Blob([data.buffer],{type:isMp3?'audio/mpeg':'audio/wav'}),name=`${safeBase(source.name)}-converted.${outputExt}`;
      entries.push({name,blob});
      const li=document.createElement('li'),left=document.createElement('strong'),right=document.createElement('span');
      left.textContent=name;right.textContent=pretty(blob.size);li.append(left,right);list.appendChild(li);
      try{await engine.deleteFile(inputName);}catch(_){}
      try{await engine.deleteFile(outputName);}catch(_){}
    }
    window.DroopAnalytics?.finish?.('complete');
    window.DroopAnalytics?.track?.('pro_batch_use');
    say(tr(`${entries.length} audio files converted locally. Download one ZIP.`,`${entries.length} audios convertidos localmente. Descargá un solo ZIP.`));
    download.hidden=false;
  }catch(error){
    console.error('Droop Pro audio batch failed',error);
    window.DroopAnalytics?.finish?.('error');
    say(tr('Batch audio conversion failed. Try fewer or smaller files.','Falló la conversión de audio por lote. Probá con menos archivos o archivos más chicos.'),true);
  }finally{
    core.setProgressSink?.(null);
    button.disabled=false;input.disabled=false;
  }
});

download.addEventListener('click',async()=>{
  if(!entries.length)return;
  download.disabled=true;
  try{
    const zip=await window.DroopZip.create(entries),url=URL.createObjectURL(zip),a=document.createElement('a');
    a.href=url;a.download='droop-audio-converter-batch.zip';document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }catch(error){
    console.error('Droop audio ZIP failed',error);
    say(tr('Could not build the ZIP.','No se pudo crear el ZIP.'),true);
  }finally{download.disabled=false;}
});

(async()=>{await window.DroopProAccess?.render?.(root);})();
})();