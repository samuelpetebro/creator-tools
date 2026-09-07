const presets={youtube:{name:'YouTube Thumbnail',width:1280,height:720},'instagram-post':{name:'Instagram Post',width:1080,height:1080},'instagram-story':{name:'Instagram Story',width:1080,height:1920},spotify:{name:'Spotify Cover',width:3000,height:3000},'discord-avatar':{name:'Discord Avatar',width:512,height:512}};

const input=document.querySelector('#fileInput');
const drop=document.querySelector('#dropZone');
const info=document.querySelector('#fileInfo');
const select=document.querySelector('#presetSelect');
const processBtn=document.querySelector('#processButton');
const result=document.querySelector('#result');
const canvas=document.querySelector('#previewCanvas');
const ctx=canvas.getContext('2d');
const downloadBtn=document.querySelector('#downloadButton');
const cropEditor=document.querySelector('#cropEditor');
const cropStage=document.querySelector('#cropStage');
const cropCanvas=document.querySelector('#cropPreviewCanvas');
const cropCtx=cropCanvas.getContext('2d');
const resetCropButton=document.querySelector('#resetCropButton');

let currentFile=null,currentImage=null,currentObjectUrl=null;
let focusX=.5,focusY=.5,dragging=false,lastPointer={x:0,y:0};

// Never visually disable the export control. If there is no image yet,
// clicking it simply tells the user what is missing.
processBtn.disabled=false;
processBtn.removeAttribute('disabled');

function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
function getCropRect(img,preset){
  const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
  const sourceRatio=iw/ih,targetRatio=preset.width/preset.height;
  let sw=iw,sh=ih;
  if(sourceRatio>targetRatio)sw=ih*targetRatio;else sh=iw/targetRatio;
  const maxX=iw-sw,maxY=ih-sh;
  return{sx:maxX*focusX,sy:maxY*focusY,sw,sh,maxX,maxY};
}
function renderCropPreview(){
  if(!currentImage)return;
  const preset=presets[select.value],ratio=preset.width/preset.height;
  const maxWidth=Math.max(260,Math.min(760,cropStage.clientWidth||760)),maxHeight=440;
  let width=maxWidth,height=width/ratio;
  if(height>maxHeight){height=maxHeight;width=height*ratio;}
  const dpr=Math.min(window.devicePixelRatio||1,2);
  cropCanvas.width=Math.max(1,Math.round(width*dpr));cropCanvas.height=Math.max(1,Math.round(height*dpr));
  cropCanvas.style.width=`${Math.round(width)}px`;cropCanvas.style.height=`${Math.round(height)}px`;
  const crop=getCropRect(currentImage,preset);
  cropCtx.setTransform(dpr,0,0,dpr,0,0);cropCtx.clearRect(0,0,width,height);
  cropCtx.drawImage(currentImage,crop.sx,crop.sy,crop.sw,crop.sh,0,0,width,height);
}
function loadImage(file){
  if(currentObjectUrl)URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl=URL.createObjectURL(file);
  const img=new Image();
  img.onload=()=>{
    currentImage=img;focusX=.5;focusY=.5;cropEditor.hidden=false;result.hidden=true;
    processBtn.disabled=false;processBtn.removeAttribute('disabled');processBtn.textContent='Export this crop';
    requestAnimationFrame(renderCropPreview);
  };
  img.onerror=()=>{
    currentImage=null;
    processBtn.disabled=false;processBtn.removeAttribute('disabled');
    alert('This browser could not read that image. Try JPG, PNG or WebP.');
  };
  img.src=currentObjectUrl;
}
function setFile(file){
  if(!file||!file.type.startsWith('image/')){alert('Please choose an image file.');return;}
  currentFile=file;info.hidden=false;info.textContent=`${file.name} · ${(file.size/1024/1024).toFixed(2)} MB`;loadImage(file);
}
input.addEventListener('change',e=>setFile(e.target.files[0]));
['dragenter','dragover'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add('dragging');}));
['dragleave','drop'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove('dragging');}));
drop.addEventListener('drop',e=>setFile(e.dataTransfer.files[0]));
select.addEventListener('change',()=>{focusX=.5;focusY=.5;result.hidden=true;renderCropPreview();});
resetCropButton.addEventListener('click',()=>{focusX=.5;focusY=.5;renderCropPreview();});

cropStage.addEventListener('pointerdown',e=>{if(!currentImage)return;dragging=true;lastPointer={x:e.clientX,y:e.clientY};try{cropStage.setPointerCapture(e.pointerId);}catch(_){}cropStage.classList.add('is-dragging');});
cropStage.addEventListener('pointermove',e=>{
  if(!dragging||!currentImage)return;
  const crop=getCropRect(currentImage,presets[select.value]),rect=cropCanvas.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const dx=e.clientX-lastPointer.x,dy=e.clientY-lastPointer.y;lastPointer={x:e.clientX,y:e.clientY};
  if(crop.maxX>0)focusX=clamp(focusX-(dx*(crop.sw/rect.width))/crop.maxX,0,1);
  if(crop.maxY>0)focusY=clamp(focusY-(dy*(crop.sh/rect.height))/crop.maxY,0,1);
  renderCropPreview();
});
function stopDragging(){dragging=false;cropStage.classList.remove('is-dragging');}
cropStage.addEventListener('pointerup',stopDragging);cropStage.addEventListener('pointercancel',stopDragging);cropStage.addEventListener('pointerleave',e=>{if(e.buttons===0)stopDragging();});

function buildExport(){
  if(!currentImage){alert('Upload an image first.');return false;}
  const preset=presets[select.value],crop=getCropRect(currentImage,preset);
  canvas.width=preset.width;canvas.height=preset.height;
  ctx.save();ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(currentImage,crop.sx,crop.sy,crop.sw,crop.sh,0,0,preset.width,preset.height);ctx.restore();
  document.querySelector('#resultPreset').textContent=preset.name;
  document.querySelector('#resultDimensions').textContent=`${preset.width} × ${preset.height} JPG`;
  result.hidden=false;return true;
}
processBtn.addEventListener('click',()=>{if(buildExport())requestAnimationFrame(()=>result.scrollIntoView({behavior:'smooth',block:'nearest'}));});
downloadBtn.addEventListener('click',()=>{
  if(!buildExport())return;
  const preset=presets[select.value];
  canvas.toBlob(blob=>{if(!blob){alert('Could not export this image.');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`creatortools-${select.value}-${preset.width}x${preset.height}.jpg`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);},'image/jpeg',.92);
});
window.addEventListener('resize',()=>{if(currentImage)renderCropPreview();});
