(()=>{'use strict';

const root=document.querySelector('[data-pro-feature="metadata-cleaner-batch"]');
if(!root)return;
const input=root.querySelector('#metadataBatchInput'),button=root.querySelector('#metadataBatchButton'),download=root.querySelector('#metadataBatchDownload'),status=root.querySelector('#metadataBatchStatus'),list=root.querySelector('#metadataBatchList');
const MAX=20,MAX_BYTES=200*1024*1024;
let files=[],entries=[];

const isEs=()=>{try{return (localStorage.getItem('droop-language')||navigator.language||'en').toLowerCase().startsWith('es');}catch(_){return false;}};
const tr=(en,es)=>isEs()?es:en;
const say=(message,error=false)=>{status.textContent=message||'';status.dataset.state=error?'error':'ok';};
const pretty=n=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(2)} MB`;
const safeBase=name=>String(name||'image').replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|]+/g,'-').slice(0,90)||'image';
const load=file=>new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('decode'));};img.src=url;});
const outputFor=file=>file.type==='image/png'?{mime:'image/png',ext:'png'}:file.type==='image/webp'?{mime:'image/webp',ext:'webp'}:{mime:'image/jpeg',ext:'jpg'};
const toBlob=(canvas,mime)=>new Promise(resolve=>canvas.toBlob(resolve,mime,(mime==='image/jpeg'||mime==='image/webp')?0.95:undefined));

async function clean(file){
  const image=await load(file),output=outputFor(file),canvas=document.createElement('canvas');
  canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const ctx=canvas.getContext('2d');
  if(output.mime==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);}
  ctx.drawImage(image,0,0);
  const blob=await toBlob(canvas,output.mime);
  if(!blob)throw new Error('export');
  return {blob,ext:output.ext};
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
  if(!access?.isPro){await window.DroopProAccess?.render?.(root);say(tr('Droop Pro is required for batch cleaning.','Necesitás Droop Pro para limpiar por lotes.'),true);return;}
  if(!files.length)return;
  button.disabled=true;input.disabled=true;download.hidden=true;entries=[];list.innerHTML='';
  window.DroopAnalytics?.start?.();
  try{
    for(let i=0;i<files.length;i++){
      say(tr(`Cleaning ${i+1} of ${files.length}…`,`Limpiando ${i+1} de ${files.length}…`));
      const source=files[i],result=await clean(source),name=`${safeBase(source.name)}-clean.${result.ext}`;
      entries.push({name,blob:result.blob});
      const li=document.createElement('li'),left=document.createElement('strong'),right=document.createElement('span');
      left.textContent=name;right.textContent=pretty(result.blob.size);li.append(left,right);list.appendChild(li);
    }
    window.DroopAnalytics?.finish?.('complete');
    window.DroopAnalytics?.track?.('pro_batch_use');
    say(tr(`${entries.length} clean images ready in one ZIP.`,`${entries.length} imágenes limpias listas en un ZIP.`));
    download.hidden=false;
  }catch(error){
    console.error('Droop Pro metadata batch failed',error);
    window.DroopAnalytics?.finish?.('error');
    say(tr('Batch cleaning failed. Try fewer or smaller images.','Falló la limpieza por lote. Probá con menos imágenes o archivos más chicos.'),true);
  }finally{button.disabled=false;input.disabled=false;}
});

download.addEventListener('click',async()=>{
  if(!entries.length)return;
  download.disabled=true;
  try{
    const zip=await window.DroopZip.create(entries),url=URL.createObjectURL(zip),a=document.createElement('a');
    a.href=url;a.download='droop-metadata-cleaner-batch.zip';document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }catch(error){
    console.error('Droop ZIP failed',error);
    say(tr('Could not build the ZIP.','No se pudo crear el ZIP.'),true);
  }finally{download.disabled=false;}
});

(async()=>{await window.DroopProAccess?.render?.(root);})();
})();