import { AutoModel, AutoProcessor, RawImage, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';

const MODEL_ID='studioludens/birefnet-lite-512';
const MODEL_REVISION='4a3c40c36c94093cc1e724d9ea428b8fa4b57dc7';
const MAX_OUTPUT_EDGE=4096;
const $=id=>document.getElementById(id);
const input=$('bgFileInput'),drop=$('bgDropZone'),info=$('bgFileInfo'),button=$('bgProcessButton'),status=$('bgStatus'),progress=$('bgProgress'),progressFill=progress.querySelector('span'),preview=$('bgPreview'),original=$('bgOriginal'),canvas=$('bgCanvas'),download=$('bgDownload'),note=$('bgNote');
const resultDemo=$('bgDemoResult');
const isEs=()=>((localStorage.getItem('droop-language')||localStorage.getItem('droop-lang')||navigator.language||'en').toLowerCase().startsWith('es'));
const tr=(en,es)=>isEs()?es:en;
let file=null,sourceURL=null,model=null,processor=null,isBusy=false,outputReady=false;

env.allowLocalModels=false;
env.allowRemoteModels=true;
env.useBrowserCache=true;
if(env.backends?.onnx?.wasm) env.backends.onnx.wasm.numThreads=Math.min(4,navigator.hardwareConcurrency||4);

applyLanguage();

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
  note.textContent='La primera vez puede tardar un poco más mientras se prepara el procesamiento local.';
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

async function ensureModel(){
  if(model&&processor)return;
  const attempts=navigator.gpu?[{device:'webgpu',dtype:'fp16'},{device:'wasm',dtype:'fp32'}]:[{device:'wasm',dtype:'fp32'}];
  let lastError;
  for(const a of attempts){
    try{
      const options={device:a.device,dtype:a.dtype,revision:MODEL_REVISION,progress_callback:p=>{
        if(p?.status==='progress'&&p.total){const ratio=Math.min(1,p.loaded/p.total);setStatus(tr('Preparing…','Preparando…'),Math.round(5+ratio*45));}
      }};
      [model,processor]=await Promise.all([
        AutoModel.from_pretrained(MODEL_ID,options),
        AutoProcessor.from_pretrained(MODEL_ID,{revision:MODEL_REVISION})
      ]);
      return;
    }catch(err){lastError=err;model=null;processor=null;}
  }
  throw lastError||new Error('LOAD_FAILED');
}

function loadHtmlImage(url){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=url;});}

async function buildTransparentResult(mask){
  const image=await loadHtmlImage(sourceURL);
  const scale=Math.min(1,MAX_OUTPUT_EDGE/Math.max(image.naturalWidth,image.naturalHeight));
  const w=Math.max(1,Math.round(image.naturalWidth*scale)),h=Math.max(1,Math.round(image.naturalHeight*scale));
  const sourceCanvas=document.createElement('canvas');sourceCanvas.width=w;sourceCanvas.height=h;
  const sctx=sourceCanvas.getContext('2d',{willReadFrequently:true});sctx.drawImage(image,0,0,w,h);
  const maskCanvas=document.createElement('canvas');maskCanvas.width=512;maskCanvas.height=512;
  const mctx=maskCanvas.getContext('2d');const maskImage=mctx.createImageData(512,512);
  for(let i=0;i<512*512;i++){const a=Math.max(0,Math.min(255,Math.round(mask[i]*255))),j=i*4;maskImage.data[j]=a;maskImage.data[j+1]=a;maskImage.data[j+2]=a;maskImage.data[j+3]=255;}
  mctx.putImageData(maskImage,0,0);
  const scaledMask=document.createElement('canvas');scaledMask.width=w;scaledMask.height=h;
  const smctx=scaledMask.getContext('2d',{willReadFrequently:true});smctx.imageSmoothingEnabled=true;smctx.imageSmoothingQuality='high';smctx.drawImage(maskCanvas,0,0,w,h);
  const src=sctx.getImageData(0,0,w,h),alpha=smctx.getImageData(0,0,w,h).data;
  for(let i=0;i<src.data.length;i+=4)src.data[i+3]=Math.round(src.data[i+3]*(alpha[i]/255));
  canvas.width=w;canvas.height=h;canvas.getContext('2d').putImageData(src,0,0);
}

button.addEventListener('click',async()=>{
  if(!file||isBusy)return;isBusy=true;button.disabled=true;download.hidden=true;outputReady=false;
  try{
    setStatus(tr('Preparing…','Preparando…'),3);
    await ensureModel();
    setStatus(tr('Preparing image…','Preparando imagen…'),58);
    const raw=await RawImage.read(sourceURL);const {pixel_values}=await processor(raw);
    setStatus(tr('Removing background…','Quitando fondo…'),72);
    const outputs=await model({input_image:pixel_values});const logits=outputs.logits||outputs.output||Object.values(outputs)[0];
    if(!logits?.data)throw new Error('BAD_OUTPUT');
    const mask=Float32Array.from(logits.data,sigmoid);
    setStatus(tr('Almost done…','Casi listo…'),90);
    await buildTransparentResult(mask);
    preview.hidden=false;download.hidden=false;outputReady=true;setStatus(tr('Ready ✓','Listo ✓'),100);
    preview.scrollIntoView({behavior:'smooth',block:'nearest'});
  }catch(err){console.error('[droop background removal]',err);setStatus(tr('Could not process this image. Try a smaller JPG, PNG or WebP.','No se pudo procesar esta imagen. Probá con un JPG, PNG o WebP más chico.'),0,true);
  }finally{isBusy=false;button.disabled=!file;}
});

download.addEventListener('click',()=>{
  if(!outputReady)return;canvas.toBlob(blob=>{if(!blob)return;const a=document.createElement('a'),url=URL.createObjectURL(blob),base=(file.name||'image').replace(/\.[^.]+$/,'');a.href=url;a.download=`${base}-no-background.png`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);},'image/png');
});