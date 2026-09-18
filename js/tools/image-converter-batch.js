(()=>{'use strict';

const root=document.querySelector('[data-pro-feature="image-converter-batch"]');
if(!root)return;
const input=root.querySelector('#converterBatchInput'),button=root.querySelector('#converterBatchButton'),download=root.querySelector('#converterBatchDownload'),status=root.querySelector('#converterBatchStatus'),list=root.querySelector('#converterBatchList');
const format=document.querySelector('#converterFormat'),quality=document.querySelector('#converterQuality');
const MAX=20,MAX_BYTES=200*1024*1024;
let files=[],entries=[];

const isEs=()=>{try{return (localStorage.getItem('droop-language')||navigator.language||'en').toLowerCase().startsWith('es');}catch(_){return false;}};
const tr=(en,es)=>isEs()?es:en;
const say=(message,error=false)=>{status.textContent=message||'';status.dataset.state=error?'error':'ok';};
const pretty=n=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(2)} MB`;
const safeBase=name=>String(name||'image').replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|]+/g,'-').slice(0,90)||'image';
const decode=file=>new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('decode'));};img.src=url;});
const toBlob=(canvas,type,q)=>new Promise(resolve=>canvas.toBlob(resolve,type,q));

async function convert(file,target,qualityValue){
  const image=await decode(file),canvas=document.createElement('canvas');
  canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const ctx=canvas.getContext('2d');
  if(target==='jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);}
  ctx.drawImage(image,0,0);
  const mime=target==='jpeg'?'image/jpeg':`image/${target}`;
  const blob=await toBlob(canvas,mime,Number(qualityValue)/100);
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
  if(!access?.isPro){await window.DroopProAccess?.render?.(root);say(tr('Droop Pro is required for batch conversion.','Necesitás Droop Pro para convertir por lotes.'),true);return;}
  if(!files.length)return;
  button.disabled=true;input.disabled=true;download.hidden=true;entries=[];list.innerHTML='';
  const target=format.value,qualityValue=quality.value,ext=target==='jpeg'?'jpg':target;
  window.DroopAnalytics?.start?.();
  try{
    for(let i=0;i<files.length;i++){
      say(tr(`Converting ${i+1} of ${files.length}…`,`Convirtiendo ${i+1} de ${files.length}…`));
      const source=files[i],blob=await convert(source,target,qualityValue);
      const name=`${safeBase(source.name)}-converted.${ext}`;
      entries.push({name,blob});
      const li=document.createElement('li');
      const left=document.createElement('strong'),right=document.createElement('span');
      left.textContent=name;right.textContent=pretty(blob.size);li.append(left,right);list.appendChild(li);
    }
    window.DroopAnalytics?.finish?.('complete');
    window.DroopAnalytics?.track?.('pro_batch_use');
    say(tr(`${entries.length} images converted locally. Download one ZIP.`,`${entries.length} imágenes convertidas localmente. Descargá un solo ZIP.`));
    download.hidden=false;
  }catch(error){
    console.error('Droop Pro image batch failed',error);
    window.DroopAnalytics?.finish?.('error');
    say(tr('Batch conversion failed. Try fewer or smaller images.','Falló la conversión por lote. Probá con menos imágenes o archivos más chicos.'),true);
  }finally{
    button.disabled=false;input.disabled=false;
  }
});

download.addEventListener('click',async()=>{
  if(!entries.length)return;
  download.disabled=true;
  try{
    const zip=await window.DroopZip.create(entries),url=URL.createObjectURL(zip),a=document.createElement('a');
    a.href=url;a.download='droop-image-converter-batch.zip';document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }catch(error){
    console.error('Droop ZIP failed',error);
    say(tr('Could not build the ZIP.','No se pudo crear el ZIP.'),true);
  }finally{download.disabled=false;}
});

(async()=>{await window.DroopProAccess?.render?.(root);})();
})();