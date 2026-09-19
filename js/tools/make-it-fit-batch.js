(()=>{'use strict';

const root=document.querySelector('[data-pro-feature="make-it-fit-batch"]');
if(!root)return;
const input=root.querySelector('#makeFitBatchInput');
const button=root.querySelector('#makeFitBatchButton');
const download=root.querySelector('#makeFitBatchDownload');
const status=root.querySelector('#makeFitBatchStatus');
const list=root.querySelector('#makeFitBatchList');
const presetSelect=document.querySelector('#presetSelect');

const PRESETS={youtube:{width:1280,height:720},'instagram-post':{width:1080,height:1080},'instagram-story':{width:1080,height:1920},spotify:{width:3000,height:3000},'discord-avatar':{width:512,height:512}};
const MAX=20,MAX_BYTES=200*1024*1024;
let files=[],entries=[];

const isEs=()=>{try{return (localStorage.getItem('droop-language')||navigator.language||'en').toLowerCase().startsWith('es');}catch(_){return false;}};
const tr=(en,es)=>isEs()?es:en;
const say=(message,error=false)=>{status.textContent=message||'';status.dataset.state=error?'error':'ok';};
const pretty=n=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(2)} MB`;
const safeBase=name=>String(name||'image').replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|]+/g,'-').slice(0,90)||'image';
const decode=file=>new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('decode'));};img.src=url;});
const toBlob=canvas=>new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));

async function render(file,preset){
  const img=await decode(file),canvas=document.createElement('canvas');
  canvas.width=preset.width;canvas.height=preset.height;
  const ctx=canvas.getContext('2d'),sourceRatio=img.naturalWidth/img.naturalHeight,targetRatio=preset.width/preset.height;
  let sx=0,sy=0,sw=img.naturalWidth,sh=img.naturalHeight;
  if(sourceRatio>targetRatio){sw=img.naturalHeight*targetRatio;sx=(img.naturalWidth-sw)/2;}
  else{sh=img.naturalWidth/targetRatio;sy=(img.naturalHeight-sh)/2;}
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(img,sx,sy,sw,sh,0,0,preset.width,preset.height);
  const blob=await toBlob(canvas);
  if(!blob)throw new Error('export');
  return blob;
}

input.addEventListener('change',()=>{
  entries=[];list.innerHTML='';download.hidden=true;
  const selected=[...input.files];
  if(!selected.length){files=[];button.disabled=true;say('');return;}
  if(selected.length>MAX){files=[];input.value='';button.disabled=true;say(tr(`Choose up to ${MAX} images per batch.`,`Elegí hasta ${MAX} imágenes por lote.`),true);return;}
  if(selected.some(file=>!file.type.startsWith('image/'))){files=[];input.value='';button.disabled=true;say(tr('Every batch file must be an image.','Todos los archivos del lote deben ser imágenes.'),true);return;}
  if(selected.reduce((sum,file)=>sum+file.size,0)>MAX_BYTES){files=[];input.value='';button.disabled=true;say(tr('Keep each batch under 200 MB total.','Mantené cada lote por debajo de 200 MB en total.'),true);return;}
  files=selected;button.disabled=false;say(tr(`${files.length} images ready.`,`${files.length} imágenes listas.`));
});

button.addEventListener('click',async()=>{
  const access=await window.DroopProAccess?.refresh?.();
  if(!access?.isPro){await window.DroopProAccess?.render?.(root);say(tr('Droop Pro is required for batch resizing.','Necesitás Droop Pro para ajustar por lotes.'),true);return;}
  if(!files.length)return;
  const key=presetSelect.value,preset=PRESETS[key];
  if(!preset){say(tr('Choose a valid destination above.','Elegí un destino válido arriba.'),true);return;}
  button.disabled=true;input.disabled=true;download.hidden=true;entries=[];list.innerHTML='';
  window.DroopAnalytics?.start?.();
  try{
    for(let i=0;i<files.length;i++){
      say(tr(`Resizing ${i+1} of ${files.length}…`,`Ajustando ${i+1} de ${files.length}…`));
      const source=files[i],blob=await render(source,preset);
      const name=`${safeBase(source.name)}-${key}-${preset.width}x${preset.height}.jpg`;
      entries.push({name,blob});
      const li=document.createElement('li'),left=document.createElement('strong'),right=document.createElement('span');
      left.textContent=name;right.textContent=pretty(blob.size);li.append(left,right);list.appendChild(li);
    }
    window.DroopAnalytics?.finish?.('complete');window.DroopAnalytics?.track?.('pro_batch_use');
    say(tr(`${entries.length} images resized locally. Download one ZIP.`,`${entries.length} imágenes ajustadas localmente. Descargá un ZIP.`));
    download.hidden=false;
  }catch(error){
    console.error('Droop Pro Make It Fit batch failed',error);window.DroopAnalytics?.finish?.('error');
    say(tr('Batch resizing failed. Try fewer or smaller images.','Falló el ajuste por lote. Probá con menos imágenes o archivos más chicos.'),true);
  }finally{button.disabled=false;input.disabled=false;}
});

download.addEventListener('click',async()=>{
  if(!entries.length)return;
  download.disabled=true;
  try{
    const zip=await window.DroopZip.create(entries),url=URL.createObjectURL(zip),a=document.createElement('a');
    a.href=url;a.download=`droop-make-it-fit-${presetSelect.value}-batch.zip`;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }catch(error){console.error('Droop ZIP failed',error);say(tr('Could not build the ZIP.','No se pudo crear el ZIP.'),true);}
  finally{download.disabled=false;}
});

(async()=>{await window.DroopProAccess?.render?.(root);})();
})();