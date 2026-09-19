(()=>{'use strict';
const root=document.querySelector('[data-pro-feature="release-pack-custom"]');
if(!root)return;
const source=document.querySelector('#packFileInput'),prefix=root.querySelector('#customPackPrefix'),quality=root.querySelector('#customPackQuality'),generate=root.querySelector('#customPackGenerate'),download=root.querySelector('#customPackDownload'),status=root.querySelector('#customPackStatus'),list=root.querySelector('#customPackList');
const outputs={
  'square-3000':{width:3000,height:3000,suffix:'cover-3000x3000'},
  'square-1080':{width:1080,height:1080,suffix:'square-1080x1080'},
  'portrait-1080x1350':{width:1080,height:1350,suffix:'portrait-1080x1350'},
  'story-1080x1920':{width:1080,height:1920,suffix:'story-1080x1920'},
  'youtube-1280x720':{width:1280,height:720,suffix:'youtube-1280x720'},
  'avatar-1024':{width:1024,height:1024,suffix:'avatar-1024x1024'},
  'header-1500x500':{width:1500,height:500,suffix:'header-1500x500'}
};
let entries=[];
const isEs=()=>{try{return (localStorage.getItem('droop-language')||navigator.language||'en').toLowerCase().startsWith('es');}catch(_){return false;}};
const tr=(en,es)=>isEs()?es:en;
const say=(m,e=false)=>{status.textContent=m||'';status.dataset.state=e?'error':'ok';};
const safe=value=>String(value||'droop-pack').trim().replace(/\s+/g,'-').replace(/[^a-z0-9_-]+/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,50)||'droop-pack';
const pretty=n=>n<1048576?`${(n/1024).toFixed(0)} KB`:`${(n/1048576).toFixed(2)} MB`;
const decode=file=>new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('decode'));};img.src=url;});
const toBlob=(canvas,q)=>new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',q));
async function render(img,o,q){
  const c=document.createElement('canvas');c.width=o.width;c.height=o.height;
  const ctx=c.getContext('2d'),sr=img.naturalWidth/img.naturalHeight,tr=o.width/o.height;
  let sx=0,sy=0,sw=img.naturalWidth,sh=img.naturalHeight;
  if(sr>tr){sw=img.naturalHeight*tr;sx=(img.naturalWidth-sw)/2;}else{sh=img.naturalWidth/tr;sy=(img.naturalHeight-sh)/2;}
  ctx.fillStyle='#fff';ctx.fillRect(0,0,o.width,o.height);ctx.drawImage(img,sx,sy,sw,sh,0,0,o.width,o.height);
  const blob=await toBlob(c,q);if(!blob)throw new Error('export');return blob;
}
generate.addEventListener('click',async()=>{
  const access=await window.DroopProAccess?.refresh?.();
  if(!access?.isPro){await window.DroopProAccess?.render?.(root);say(tr('Droop Pro is required for custom packs.','Necesitás Droop Pro para packs personalizados.'),true);return;}
  const file=source.files?.[0];
  if(!file){say(tr('Choose one source image above first.','Primero elegí una imagen arriba.'),true);return;}
  const chosen=[...root.querySelectorAll('[data-custom-output]:checked')].map(el=>outputs[el.dataset.customOutput]).filter(Boolean);
  if(!chosen.length){say(tr('Choose at least one output size.','Elegí al menos un tamaño de salida.'),true);return;}
  generate.disabled=true;download.hidden=true;entries=[];list.innerHTML='';window.DroopAnalytics?.start?.();
  try{
    const img=await decode(file),base=safe(prefix.value),q=Math.min(.98,Math.max(.4,Number(quality.value)/100||.92));
    for(let i=0;i<chosen.length;i++){
      say(tr(`Generating ${i+1} of ${chosen.length}…`,`Generando ${i+1} de ${chosen.length}…`));
      const o=chosen[i],blob=await render(img,o,q),name=`${base}-${o.suffix}.jpg`;entries.push({name,blob});
      const li=document.createElement('li'),a=document.createElement('strong'),b=document.createElement('span');a.textContent=name;b.textContent=pretty(blob.size);li.append(a,b);list.appendChild(li);
    }
    window.DroopAnalytics?.finish?.('complete');window.DroopAnalytics?.track?.('pro_custom_pack_use');
    say(tr(`${entries.length} custom assets ready locally.`,`${entries.length} archivos personalizados listos localmente.`));download.hidden=false;
  }catch(error){console.error('Droop custom Release Pack failed',error);window.DroopAnalytics?.finish?.('error');say(tr('Could not generate this custom pack.','No se pudo generar este pack personalizado.'),true);}
  finally{generate.disabled=false;}
});
download.addEventListener('click',async()=>{
  if(!entries.length)return;download.disabled=true;
  try{const zip=await window.DroopZip.create(entries),url=URL.createObjectURL(zip),a=document.createElement('a');a.href=url;a.download=`${safe(prefix.value)}-droop-pack.zip`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  catch(error){console.error('Droop custom ZIP failed',error);say(tr('Could not build the ZIP.','No se pudo crear el ZIP.'),true);}
  finally{download.disabled=false;}
});
(async()=>{await window.DroopProAccess?.render?.(root);})();
})();