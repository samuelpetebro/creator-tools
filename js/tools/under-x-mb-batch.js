(()=>{'use strict';

const root=document.querySelector('[data-pro-feature="under-x-batch"]');
if(!root)return;
const input=root.querySelector('#underXBatchInput');
const button=root.querySelector('#underXBatchButton');
const download=root.querySelector('#underXBatchDownload');
const status=root.querySelector('#underXBatchStatus');
const list=root.querySelector('#underXBatchList');
const targetSize=document.querySelector('#targetSize');
const targetUnit=document.querySelector('#targetUnit');

const MAX_FILES=10;
const MAX_BYTES=150*1024*1024;
let files=[],entries=[];

const isEs=()=>{try{return (localStorage.getItem('droop-language')||navigator.language||'en').toLowerCase().startsWith('es');}catch(_){return false;}};
const tr=(en,es)=>isEs()?es:en;
const say=(message,error=false)=>{status.textContent=message||'';status.dataset.state=error?'error':'ok';};
const pretty=bytes=>bytes<1024?`${bytes} B`:bytes<1048576?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/1048576).toFixed(2)} MB`;
const safeBase=name=>String(name||'image').replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|]+/g,'-').slice(0,90)||'image';
const maxBytes=()=>{
  const value=Number(targetSize.value);
  if(!Number.isFinite(value)||value<=0)return 0;
  return targetUnit.value==='KB'?value*1024:value*1024*1024;
};
const load=file=>new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file),image=new Image();
  image.onload=()=>{URL.revokeObjectURL(url);resolve(image);};
  image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('decode'));};
  image.src=url;
});
const toBlob=(canvas,quality)=>new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));

async function best(canvas,limit){
  const min=.08,max=.95;
  let low=min,high=max,bestBlob=null,bestQuality=min;
  const minimum=await toBlob(canvas,min);
  if(!minimum||minimum.size>limit)return null;
  for(let i=0;i<10;i++){
    const quality=(low+high)/2,blob=await toBlob(canvas,quality);
    if(!blob)break;
    if(blob.size<=limit){bestBlob=blob;bestQuality=quality;low=quality;}
    else high=quality;
  }
  return {blob:bestBlob||minimum,quality:bestBlob?bestQuality:min};
}

async function compress(file,limit){
  const image=await load(file);
  let width=image.naturalWidth,height=image.naturalHeight;
  for(let step=0;step<7;step++){
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(width));
    canvas.height=Math.max(1,Math.round(height));
    const ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality='high';
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const result=await best(canvas,limit);
    if(result)return {...result,width:canvas.width,height:canvas.height,resized:step>0};
    width*=.82;height*=.82;
  }
  return null;
}

input.addEventListener('change',()=>{
  entries=[];list.innerHTML='';download.hidden=true;
  const selected=[...input.files];
  if(!selected.length){files=[];button.disabled=true;say('');return;}
  if(selected.length>MAX_FILES){
    files=[];input.value='';button.disabled=true;
    say(tr(`Choose up to ${MAX_FILES} images per batch.`,`Elegí hasta ${MAX_FILES} imágenes por lote.`),true);
    return;
  }
  if(selected.some(file=>!file.type.startsWith('image/'))){
    files=[];input.value='';button.disabled=true;
    say(tr('Every batch file must be an image.','Todos los archivos del lote deben ser imágenes.'),true);
    return;
  }
  if(selected.reduce((sum,file)=>sum+file.size,0)>MAX_BYTES){
    files=[];input.value='';button.disabled=true;
    say(tr('Keep each batch under 150 MB total.','Mantené cada lote por debajo de 150 MB en total.'),true);
    return;
  }
  files=selected;button.disabled=false;
  say(tr(`${files.length} images ready.`,`${files.length} imágenes listas.`));
});

button.addEventListener('click',async()=>{
  const access=await window.DroopProAccess?.refresh?.();
  if(!access?.isPro){
    await window.DroopProAccess?.render?.(root);
    say(tr('Droop Pro is required for batch compression.','Necesitás Droop Pro para comprimir por lotes.'),true);
    return;
  }
  const limit=maxBytes();
  if(!limit){say(tr('Enter a valid target size above.','Ingresá un tamaño objetivo válido arriba.'),true);return;}
  if(!files.length)return;
  button.disabled=true;input.disabled=true;download.hidden=true;entries=[];list.innerHTML='';
  window.DroopAnalytics?.start?.();
  try{
    for(let i=0;i<files.length;i++){
      say(tr(`Compressing ${i+1} of ${files.length}…`,`Comprimiendo ${i+1} de ${files.length}…`));
      const source=files[i],result=await compress(source,limit);
      if(!result)throw new Error(tr(`Could not reach the target for ${source.name}.`,`No se pudo alcanzar el objetivo para ${source.name}.`));
      const targetLabel=`${targetSize.value}${targetUnit.value.toLowerCase()}`;
      const name=`${safeBase(source.name)}-under-${targetLabel}.jpg`;
      entries.push({name,blob:result.blob});
      const li=document.createElement('li'),left=document.createElement('strong'),right=document.createElement('span');
      left.textContent=name;
      right.textContent=`${pretty(result.blob.size)} · ${Math.round(result.quality*100)}%`;
      li.append(left,right);list.appendChild(li);
    }
    window.DroopAnalytics?.finish?.('complete');
    window.DroopAnalytics?.track?.('pro_batch_use');
    say(tr(`${entries.length} images compressed under the target. Download one ZIP.`,`${entries.length} imágenes comprimidas debajo del objetivo. Descargá un ZIP.`));
    download.hidden=false;
  }catch(error){
    console.error('Droop Pro Under X batch failed',error);
    window.DroopAnalytics?.finish?.('error');
    say(error?.message||tr('Batch compression failed.','Falló la compresión por lote.'),true);
  }finally{
    button.disabled=false;input.disabled=false;
  }
});

download.addEventListener('click',async()=>{
  if(!entries.length)return;
  download.disabled=true;
  try{
    const zip=await window.DroopZip.create(entries),url=URL.createObjectURL(zip),a=document.createElement('a');
    a.href=url;a.download='droop-under-x-mb-batch.zip';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }catch(error){
    console.error('Droop ZIP failed',error);
    say(tr('Could not build the ZIP.','No se pudo crear el ZIP.'),true);
  }finally{download.disabled=false;}
});

(async()=>{await window.DroopProAccess?.render?.(root);})();
})();