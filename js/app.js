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

let currentFile=null;
let currentImage=null;
let currentObjectUrl=null;
let focusX=.5;
let focusY=.5;
let dragging=false;
let lastPointer={x:0,y:0};

function clamp(value,min,max){return Math.min(max,Math.max(min,value));}

function getCropRect(img,preset){
  const sourceRatio=img.width/img.height;
  const targetRatio=preset.width/preset.height;
  let sw=img.width,sh=img.height;

  if(sourceRatio>targetRatio){
    sw=img.height*targetRatio;
  }else{
    sh=img.width/targetRatio;
  }

  const maxX=img.width-sw;
  const maxY=img.height-sh;
  const sx=maxX*focusX;
  const sy=maxY*focusY;
  return{sx,sy,sw,sh,maxX,maxY};
}

function renderCropPreview(){
  if(!currentImage)return;
  const preset=presets[select.value];
  const ratio=preset.width/preset.height;
  const maxWidth=Math.min(760,cropStage.clientWidth||760);
  const maxHeight=440;
  let width=maxWidth;
  let height=width/ratio;

  if(height>maxHeight){
    height=maxHeight;
    width=height*ratio;
  }

  const dpr=Math.min(window.devicePixelRatio||1,2);
  cropCanvas.width=Math.max(1,Math.round(width*dpr));
  cropCanvas.height=Math.max(1,Math.round(height*dpr));
  cropCanvas.style.width=`${Math.round(width)}px`;
  cropCanvas.style.height=`${Math.round(height)}px`;

  const crop=getCropRect(currentImage,preset);
  cropCtx.setTransform(dpr,0,0,dpr,0,0);
  cropCtx.clearRect(0,0,width,height);
  cropCtx.drawImage(currentImage,crop.sx,crop.sy,crop.sw,crop.sh,0,0,width,height);
}

function loadImage(file){
  if(currentObjectUrl)URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl=URL.createObjectURL(file);
  const img=new Image();
  img.onload=()=>{
    currentImage=img;
    focusX=.5;
    focusY=.5;
    cropEditor.hidden=false;
    processBtn.disabled=false;
    result.hidden=true;
    renderCropPreview();
  };
  img.src=currentObjectUrl;
}

function setFile(file){
  if(!file||!file.type.startsWith('image/')){
    alert('Please choose an image file.');
    return;
  }
  currentFile=file;
  info.hidden=false;
  info.textContent=`${file.name} · ${(file.size/1024/1024).toFixed(2)} MB`;
  loadImage(file);
}

input.addEventListener('change',e=>setFile(e.target.files[0]));

['dragenter','dragover'].forEach(type=>drop.addEventListener(type,e=>{
  e.preventDefault();
  drop.classList.add('dragging');
}));

['dragleave','drop'].forEach(type=>drop.addEventListener(type,e=>{
  e.preventDefault();
  drop.classList.remove('dragging');
}));

drop.addEventListener('drop',e=>setFile(e.dataTransfer.files[0]));

select.addEventListener('change',()=>{
  focusX=.5;
  focusY=.5;
  result.hidden=true;
  renderCropPreview();
});

resetCropButton.addEventListener('click',()=>{
  focusX=.5;
  focusY=.5;
  renderCropPreview();
});

cropStage.addEventListener('pointerdown',e=>{
  if(!currentImage)return;
  dragging=true;
  lastPointer={x:e.clientX,y:e.clientY};
  cropStage.setPointerCapture(e.pointerId);
  cropStage.classList.add('is-dragging');
});

cropStage.addEventListener('pointermove',e=>{
  if(!dragging||!currentImage)return;
  const preset=presets[select.value];
  const crop=getCropRect(currentImage,preset);
  const rect=cropCanvas.getBoundingClientRect();
  const dx=e.clientX-lastPointer.x;
  const dy=e.clientY-lastPointer.y;
  lastPointer={x:e.clientX,y:e.clientY};

  if(crop.maxX>0){
    const sourceDx=dx*(crop.sw/rect.width);
    focusX=clamp(focusX-sourceDx/crop.maxX,0,1);
  }
  if(crop.maxY>0){
    const sourceDy=dy*(crop.sh/rect.height);
    focusY=clamp(focusY-sourceDy/crop.maxY,0,1);
  }
  renderCropPreview();
});

function stopDragging(e){
  dragging=false;
  cropStage.classList.remove('is-dragging');
  if(e&&cropStage.hasPointerCapture?.(e.pointerId))cropStage.releasePointerCapture(e.pointerId);
}

cropStage.addEventListener('pointerup',stopDragging);
cropStage.addEventListener('pointercancel',stopDragging);

processBtn.addEventListener('click',()=>{
  if(!currentImage)return;
  const preset=presets[select.value];
  const crop=getCropRect(currentImage,preset);

  canvas.width=preset.width;
  canvas.height=preset.height;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(currentImage,crop.sx,crop.sy,crop.sw,crop.sh,0,0,preset.width,preset.height);

  document.querySelector('#resultPreset').textContent=preset.name;
  document.querySelector('#resultDimensions').textContent=`${preset.width} × ${preset.height} JPG`;
  result.hidden=false;
  result.scrollIntoView({behavior:'smooth',block:'nearest'});
});

downloadBtn.addEventListener('click',()=>{
  const preset=presets[select.value];
  canvas.toBlob(blob=>{
    if(!blob)return;
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`creatortools-${select.value}-${preset.width}x${preset.height}.jpg`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  },'image/jpeg',.92);
});

window.addEventListener('resize',()=>{
  if(currentImage)renderCropPreview();
});
