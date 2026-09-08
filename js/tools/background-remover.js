import { AutoModel, AutoProcessor, RawImage, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';

const DESKTOP_MODEL_ID='studioludens/birefnet-lite-512';
const DESKTOP_MODEL_REVISION='4a3c40c36c94093cc1e724d9ea428b8fa4b57dc7';
const MOBILE_MODEL_ID='Xenova/modnet';
const IS_MOBILE=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||Math.min(screen.width||9999,screen.height||9999)<820;
const IS_IOS=/iPhone|iPad|iPod/i.test(navigator.userAgent);
const MAX_OUTPUT_EDGE=IS_MOBILE?2048:4096;
const $=id=>document.getElementById(id);
const input=$('bgFileInput'),drop=$('bgDropZone'),info=$('bgFileInfo'),button=$('bgProcessButton'),status=$('bgStatus'),progress=$('bgProgress'),progressFill=progress.querySelector('span'),preview=$('bgPreview'),original=$('bgOriginal'),canvas=$('bgCanvas'),download=$('bgDownload'),note=$('bgNote');
const resultDemo=$('bgDemoResult'),langSwitch=$('bgLangSwitch');
const isEs=()=>((localStorage.getItem('droop-language')||localStorage.getItem('droop-lang')||navigator.language||'en').toLowerCase().startsWith('es'));
const tr=(en,es)=>isEs()?es:en;
let file=null,sourceURL=null,model=null,processor=null,isBusy=false,outputReady=false,stage='idle',modelKind=null;

env.allowLocalModels=false;
env.allowRemoteModels=true;
env.useBrowserCache=true;
if(env.backends?.onnx?.wasm) env.backends.onnx.wasm.numThreads=IS_MOBILE?1:Math.min(4,navigator.hardwareConcurrency||4);

applyLanguage();
if(langSwitch){
  langSwitch.textContent=isEs()?'EN':'ES';
  langSwitch.setAttribute('aria-label',isEs()?'Switch to English':'Cambiar a español');
  langSwitch.addEventListener('click',()=>{
    localStorage.setItem('droop-language',isEs()?'en':'es');
    localStorage.removeItem('droop-lang');
    location.reload();
  });
}

function applyLanguage(){
  if(!isEs()) return;
  document.documentElement.lang='es';
  document.title='Quitar fondo de imagen online — droop';
  document.querySelector('.tool-kicker').textContent='IMAGEN · NUEVO';
  document.querySelector('.tool-title').textContent='Quitar fondo';
  document.querySelector('.tool-lead').textContent='Quitá el fondo de una imagen en tu dispositivo y exportá un PNG transparente.';
  const chips=[...document.querySelectorAll('.trust-chip')];
  ['✦ Funciona localmente','Sin subidas','PNG transparente'].forEach((x,i)=>chips[i]&&(chips[i].textContent=x));
  const d=drop.querySelectorAll('strong,span');d[0].textContent='Soltá una imagen acá';d[1].textContent='JPG, PNG o WebP';
  button.textContent='Quitar fondo';
  $('bgOriginalLabel').textContent='Original';$('bgResultLabel').textContent='Fondo eliminado';
  download.textContent='Descargar PNG transparente';
  note.textContent=IS_MOBILE?'En teléfono, la primera vez puede tardar un poco más mientras se prepara el procesamiento.':'La primera vez puede tardar un poco más mientras se prepara el procesamiento local.';
  const cards=[...document.querySelectorAll('.tool-info .info-card')];
  const copy=[['Procesamiento privado','Tu imagen queda en tu dispositivo mientras se elimina el fondo.'],['Salida transparente','Exportá un PNG listo para miniaturas, productos y publicaciones.'],['Funciona en tu navegador','No necesitás una cuenta ni subir la imagen. Elegí una foto, quitá el fondo y descargá el resultado.']];
  cards.forEach((c,i)=>{if(!copy[i])return;c.querySelector('h3').textContent=copy[i][0];c.querySelector('p').textContent=copy[i][1]});
  const nav=[...document.querySelectorAll('.top-nav a')];if(nav[0])nav[0].textContent='Todas las herramientas';if(nav[1])nav[1].textContent='Imagen';
  const crumbs=[...document.querySelectorAll('.tool-breadcrumb *')];if(crumbs[0])crumbs[0].textContent='Todas las herramientas';if(crumbs[2])crumbs[2].textContent='Quitar fondo';
  document.querySelector('.privacy-pill').textContent='Procesamiento local · Sin subidas';
  const foot=[...document.querySelectorAll('footer span')];if(foot[0])foot[0].textContent='droop · Todo lo que necesitás antes de publicar.';if(foot[1])foot[1].textContent='Herramientas privadas desde tu navegador.';
}

function setStatus(text,pct=null,error=false){status.hidden=false;status.textContent=text;status.classList.toggle('error',error);if(pct==null){progress.hidden=true;return;}progress.hidden=false;progressFill.style.width=`${Math.max(0,Math.min(100,pct))}%`;}
function prettyBytes(n){if(n<1048576)return`${(n/1024).toFixed(1)} KB`;return`${(n/1048576).toFixed(2)} MB`;}
function validImage(f){return f&&(/image\/(jpeg|png|webp)/i.test(f.type)||/\.(jpe?g|png|webp)$/i.test(f.name));}
function sigmoid(x){return 1/(1+Math.exp(-x));}

function setFile(f){
  if(!f)return;
  if(!validImage(f)){input.value='';alert(tr('Choose a JPG, PNG or WebP image.','Elegí una imagen JPG, PNG o WebP.'));return;}
  file=f;outputReady=false;download.hidden=true;status.hidden=true;progress.hidden=true;button.disabled=false;
  if(resultDemo)resultDemo.hidden=true;
  canvas.hidden=false;canvas.width=1;canvas.height=1;
  if(sourceURL)URL.revokeObjectURL(sourceURL);sourceURL=URL.createObjectURL(f);original.src=sourceURL;
  info.hidden=false;info.textContent=`${f.name} · ${prettyBytes(f.size)}`;
}
input.addEventListener('click',()=>{input.value='';});
input.addEventListener('change',e=>setFile(e.target.files[0]));
['dragenter','dragover'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.add('dragging')}));
['dragleave','drop'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.remove('dragging')}));
drop.addEventListener('drop',e=>setFile(e.dataTransfer.files[0]));

async function loadDesktopAttempt(a){
  const options={device:a.device,dtype:a.dtype,revision:DESKTOP_MODEL_REVISION,progress_callback:p=>{
    if(p?.status==='progress'&&p.total){const ratio=Math.min(1,p.loaded/p.total);setStatus(tr('Preparing…','Preparando…'),Math.round(5+ratio*45));}
  }};
  const loaded=await Promise.all([
    AutoModel.from_pretrained(DESKTOP_MODEL_ID,options),
    AutoProcessor.from_pretrained(DESKTOP_MODEL_ID,{revision:DESKTOP_MODEL_REVISION})
  ]);
  model=loaded[0];processor=loaded[1];modelKind='desktop';
}

async function loadMobileModel(){
  const options={device:'wasm',dtype:'fp32',progress_callback:p=>{
    if(p?.status==='progress'&&p.total){const ratio=Math.min(1,p.loaded/p.total);setStatus(tr('Preparing…','Preparando…'),Math.round(5+ratio*45));}
  }};
  const loaded=await Promise.all([
    AutoModel.from_pretrained(MOBILE_MODEL_ID,options),
    AutoProcessor.from_pretrained(MOBILE_MODEL_ID)
  ]);
  model=loaded[0];processor=loaded[1];modelKind='mobile';
}

async function ensureModel(){
  if(model&&processor)return;
  if(IS_MOBILE){
    stage='load-mobile';
    await loadMobileModel();
    return;
  }
  const attempts=[];
  if(navigator.gpu&&!IS_IOS)attempts.push({device:'webgpu',dtype:'fp16'});
  attempts.push({device:'wasm',dtype:'fp16'});
  attempts.push({device:'wasm',dtype:'fp32'});
  let lastError;
  for(const a of attempts){
    try{
      stage=`load-${a.device}-${a.dtype}`;
      await loadDesktopAttempt(a);
      return;
    }catch(err){
      lastError=err;model=null;processor=null;modelKind=null;
      console.warn('[droop background removal] processing fallback',a.device,a.dtype,err);
    }
  }
  throw lastError||new Error('LOAD_FAILED');
}

function loadHtmlImage(url){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=url;});}

async function buildTransparentResult(mask,maskW=512,maskH=512){
  stage='compose';
  const image=await loadHtmlImage(sourceURL);
  const scale=Math.min(1,MAX_OUTPUT_EDGE/Math.max(image.naturalWidth,image.naturalHeight));
  const w=Math.max(1,Math.round(image.naturalWidth*scale)),h=Math.max(1,Math.round(image.naturalHeight*scale));
  const sourceCanvas=document.createElement('canvas');sourceCanvas.width=w;sourceCanvas.height=h;
  const sctx=sourceCanvas.getContext('2d',{willReadFrequently:true});if(!sctx)throw new Error('NO_CANVAS');sctx.drawImage(image,0,0,w,h);
  const maskCanvas=document.createElement('canvas');maskCanvas.width=maskW;maskCanvas.height=maskH;
  const mctx=maskCanvas.getContext('2d');if(!mctx)throw new Error('NO_MASK_CANVAS');const maskImage=mctx.createImageData(maskW,maskH);
  for(let i=0;i<maskW*maskH;i++){const a=Math.max(0,Math.min(255,Math.round(mask[i]*255))),j=i*4;maskImage.data[j]=a;maskImage.data[j+1]=a;maskImage.data[j+2]=a;maskImage.data[j+3]=255;}
  mctx.putImageData(maskImage,0,0);
  const scaledMask=document.createElement('canvas');scaledMask.width=w;scaledMask.height=h;
  const smctx=scaledMask.getContext('2d',{willReadFrequently:true});if(!smctx)throw new Error('NO_SCALE_CANVAS');smctx.imageSmoothingEnabled=true;smctx.imageSmoothingQuality='high';smctx.drawImage(maskCanvas,0,0,w,h);
  const src=sctx.getImageData(0,0,w,h),alpha=smctx.getImageData(0,0,w,h).data;
  for(let i=0;i<src.data.length;i+=4)src.data[i+3]=Math.round(src.data[i+3]*(alpha[i]/255));
  canvas.width=w;canvas.height=h;const out=canvas.getContext('2d');if(!out)throw new Error('NO_OUTPUT_CANVAS');out.putImageData(src,0,0);
}

button.addEventListener('click',async()=>{
  if(!file||isBusy)return;isBusy=true;button.disabled=true;download.hidden=true;outputReady=false;
  try{
    stage='prepare';setStatus(tr('Preparing…','Preparando…'),3);
    await ensureModel();
    stage='decode';setStatus(tr('Preparing image…','Preparando imagen…'),58);
    const raw=await RawImage.read(sourceURL);const {pixel_values}=await processor(raw);
    stage='inference';setStatus(tr('Removing background…','Quitando fondo…'),72);
    let tensor,mask,maskW=512,maskH=512;
    if(modelKind==='mobile'){
      const outputs=await model({input:pixel_values});
      tensor=outputs.output||Object.values(outputs)[0];
      if(!tensor?.data)throw new Error('BAD_OUTPUT');
      const dims=tensor.dims||[];maskW=dims[dims.length-1]||512;maskH=dims[dims.length-2]||512;
      mask=Float32Array.from(tensor.data,x=>Math.max(0,Math.min(1,x)));
    }else{
      const outputs=await model({input_image:pixel_values});
      tensor=outputs.logits||outputs.output||Object.values(outputs)[0];
      if(!tensor?.data)throw new Error('BAD_OUTPUT');
      const dims=tensor.dims||[];maskW=dims[dims.length-1]||512;maskH=dims[dims.length-2]||512;
      mask=Float32Array.from(tensor.data,sigmoid);
    }
    setStatus(tr('Almost done…','Casi listo…'),90);
    await buildTransparentResult(mask,maskW,maskH);
    preview.hidden=false;download.hidden=false;outputReady=true;stage='ready';setStatus(tr('Ready ✓','Listo ✓'),100);
    preview.scrollIntoView({behavior:'smooth',block:'nearest'});
  }catch(err){
    console.error('[droop background removal]',{stage,mobile:IS_MOBILE,ios:IS_IOS,error:err});
    const mobileMsg=tr('This phone could not finish the image. Close other tabs and try again, or use a smaller image.','Este teléfono no pudo terminar la imagen. Cerrá otras pestañas y probá de nuevo, o usá una imagen más chica.');
    const desktopMsg=tr('Could not process this image. Try a smaller JPG, PNG or WebP.','No se pudo procesar esta imagen. Probá con un JPG, PNG o WebP más chico.');
    setStatus(IS_MOBILE?mobileMsg:desktopMsg,0,true);
  }finally{isBusy=false;button.disabled=!file;}
});

download.addEventListener('click',()=>{
  if(!outputReady)return;canvas.toBlob(blob=>{if(!blob)return;const a=document.createElement('a'),url=URL.createObjectURL(blob),base=(file.name||'image').replace(/\.[^.]+$/,'');a.href=url;a.download=`${base}-no-background.png`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);},'image/png');
});