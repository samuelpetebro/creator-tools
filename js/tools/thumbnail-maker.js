(()=>{
  'use strict';
  const $=id=>document.getElementById(id), canvas=$('thumbCanvas'),ctx=canvas.getContext('2d');
  const copy={
    en:{all:'All tools',image:'Image',privacy:'Local processing · No uploads',name:'Thumbnail Maker',kicker:'SOCIAL · NEW',headline:'Your next video. A better first impression.',lead:'Start with a photo or a moment from your video. Add your title and make a YouTube thumbnail in a few clicks.',local:'✦ Made on your device',noAccount:'No account needed',drop:'Drop a photo or video here',choose:'or tap to choose a file',frame:'Pick a moment',frameHelp:'Move the slider to choose the frame for your thumbnail.',titleLabel:'Your title',titleHelp:'Optional. Short titles work best. Line breaks are welcome.',style:'Choose a style',bold:'Bold',clean:'Clean',border:'Framed',placement:'Text position',bottom:'Bottom',center:'Center',top:'Top',accent:'Accent color',crop:'Reposition your image',export:'Create my thumbnail',output:'JPG · 1280 × 720 · Under 2 MB',download:'Download thumbnail',editAgain:'You can keep editing and create another version.',info1h:'Find your starting point',info1p:'Use a JPG, PNG or WebP photo, or pick a frame from a video your browser can play. Nothing is uploaded.',info2h:'Make the title readable',info2p:'Pick a style and move the text away from the subject. Your title automatically fits inside the thumbnail.',info3h:'Take it to YouTube',info3p:'Download a 16:9 JPG under 2 MB. This lightweight version exports at 1280 × 720 and works without an account.',related:'Keep getting ready to post',remove:'Remove a background',compress:'Compress an image',videoCrop:'Crop a video for social',footer:'droop · Everything you need before you post.',footerPrivacy:'Private browser-based tools.',placeholder:'Make them want to watch',preview:'Thumbnail preview',loading:'Opening your file…',seeking:'Finding your frame…',working:'Creating your thumbnail…',ready:'Ready ✓',loaded:'Your file is ready. Add a title or keep it text-free.',invalid:'Choose a JPG, PNG, WebP, MP4, MOV or WebM file.',failed:'This file could not be opened. Try a JPG image or a video your browser can play.',large:'Try an image smaller than 30 MB.',exportFailed:'Could not create the thumbnail. Try another image or video frame.',horizontal:'Move left or right to keep your subject in the picture.',vertical:'Move up or down to keep your subject in the picture.',same:'Your image already fits this shape.',pageTitle:'YouTube Thumbnail Maker — droop',meta:'Make a YouTube thumbnail from an image or a video frame. Add a title, choose a style and download a JPG under 2 MB, right in your browser.'},
    es:{all:'Todas las herramientas',image:'Imagen',privacy:'Procesamiento local · Sin subidas',name:'Creador de miniaturas',kicker:'SOCIAL · NUEVO',headline:'Tu próximo video. Una mejor primera impresión.',lead:'Empezá con una foto o un momento de tu video. Agregá tu título y creá una miniatura para YouTube en pocos pasos.',local:'✦ Hecho en tu dispositivo',noAccount:'Sin cuenta',drop:'Soltá una foto o un video acá',choose:'o tocá para elegir un archivo',frame:'Elegí un momento',frameHelp:'Mové el control para elegir el fotograma de tu miniatura.',titleLabel:'Tu título',titleHelp:'Opcional. Los títulos cortos funcionan mejor. Podés usar saltos de línea.',style:'Elegí un estilo',bold:'Impacto',clean:'Simple',border:'Con marco',placement:'Posición del texto',bottom:'Abajo',center:'Centro',top:'Arriba',accent:'Color de acento',crop:'Acomodá la imagen',export:'Crear mi miniatura',output:'JPG · 1280 × 720 · Menos de 2 MB',download:'Descargar miniatura',editAgain:'Podés seguir editando y crear otra versión.',info1h:'Elegí tu punto de partida',info1p:'Usá una foto JPG, PNG o WebP, o elegí un fotograma de un video que tu navegador pueda reproducir. No se sube ningún archivo.',info2h:'Hacé que se lea el título',info2p:'Elegí un estilo y acomodá el texto sin tapar lo importante. El título se ajusta automáticamente al espacio de la miniatura.',info3h:'Llevala a YouTube',info3p:'Descargá un JPG 16:9 de menos de 2 MB. Esta versión liviana exporta a 1280 × 720 y no necesita una cuenta.',related:'Seguí preparando tu publicación',remove:'Quitar un fondo',compress:'Comprimir una imagen',videoCrop:'Recortar un video para redes',footer:'droop · Todo lo que necesitás antes de publicar.',footerPrivacy:'Herramientas privadas que funcionan en tu navegador.',placeholder:'Un título que den ganas de ver',preview:'Vista previa de la miniatura',loading:'Abriendo tu archivo…',seeking:'Buscando tu fotograma…',working:'Creando tu miniatura…',ready:'Listo ✓',loaded:'Tu archivo está listo. Agregá un título o dejalo sin texto.',invalid:'Elegí un archivo JPG, PNG, WebP, MP4, MOV o WebM.',failed:'No se pudo abrir este archivo. Probá con una imagen JPG o un video que tu navegador pueda reproducir.',large:'Probá con una imagen de menos de 30 MB.',exportFailed:'No se pudo crear la miniatura. Probá con otra imagen o fotograma.',horizontal:'Mové de izquierda a derecha para mantener lo importante dentro del cuadro.',vertical:'Mové de arriba a abajo para mantener lo importante dentro del cuadro.',same:'Tu imagen ya tiene esta proporción.',pageTitle:'Creador de miniaturas para YouTube — droop',meta:'Creá una miniatura para YouTube con una imagen o un fotograma de video. Agregá texto, elegí un estilo y descargá un JPG de menos de 2 MB en tu navegador.'}
  };
  let language=(navigator.language||'en').startsWith('es')?'es':'en';
  try{const saved=localStorage.getItem('droop-language');if(saved==='es'||saved==='en')language=saved;}catch(_){}
  let source=null,sourceURL=null,outputURL=null,filename='thumbnail',style='bold',generation=0,exporting=false,frameReady=false,statusKey='',seekTimer=null;
  const t=key=>copy[language][key],bytes=n=>`${(n/1024).toFixed(0)} KB`;
  function status(key){statusKey=key;$('thumbStatus').hidden=!key;$('thumbStatus').textContent=key?t(key):'';}
  function applyLanguage(){
    document.documentElement.lang=language;document.title=t('pageTitle');
    document.querySelector('meta[name="description"]').content=t('meta');
    document.querySelectorAll('[data-copy]').forEach(el=>el.textContent=t(el.dataset.copy));
    $('thumbTitle').placeholder=t('placeholder');canvas.setAttribute('aria-label',t('preview'));
    $('thumbLang').textContent=language==='es'?'EN':'ES';$('thumbLang').setAttribute('aria-label',language==='es'?'Switch to English':'Cambiar a español');
    status(statusKey);updateCropHelp();
  }
  $('thumbLang').onclick=()=>{language=language==='es'?'en':'es';try{localStorage.setItem('droop-language',language);}catch(_){}applyLanguage();};
  function invalidate(){if(outputURL)URL.revokeObjectURL(outputURL);outputURL=null;$('thumbResult').hidden=true;$('thumbDownload').removeAttribute('href');if(statusKey==='ready')status('');}
  function updateControls(){ $('thumbExport').disabled=!source||!frameReady||exporting;$('thumbControls').disabled=exporting;$('thumbInput').disabled=exporting;$('thumbDrop').setAttribute('aria-disabled',String(exporting)); }
  function dimensions(){return source instanceof HTMLVideoElement?[source.videoWidth,source.videoHeight]:[source.width,source.height];}
  function updateCropHelp(){
    if(!source)return;
    const [w,h]=dimensions(),ratio=w/h, same=Math.abs(ratio-16/9)<.0001;
    $('thumbPosition').disabled=same;$('thumbCropHelp').textContent=t(same?'same':ratio>16/9?'horizontal':'vertical');
  }
  function render(){
    if(!source||!frameReady)return;
    const [sw,sh]=dimensions();if(!sw||!sh)return;
    const g=ThumbnailLayout.crop(sw,sh,1280,720,+$('thumbPosition').value/100);
    ctx.clearRect(0,0,1280,720);ctx.fillStyle='#172438';ctx.fillRect(0,0,1280,720);
    ctx.drawImage(source,g.x,g.y,g.w,g.h,0,0,1280,720);
    const paragraphs=$('thumbTitle').value.trim().split(/\n+/);
    const text=paragraphs.length>4?[...paragraphs.slice(0,3),paragraphs.slice(3).join(' ')].join('\n'):paragraphs.join('\n');
    const accent=$('thumbColor').value,place=$('thumbPlacement').value;
    if(style==='frame'){ctx.strokeStyle=accent;ctx.lineWidth=24;ctx.strokeRect(12,12,1256,696);}
    if(!text)return;
    let lines=[],size=style==='clean'?76:100;
    for(;size>=20;size-=2){
      ctx.font=`${style==='clean'?700:900} ${size}px Arial, sans-serif`;
      lines=ThumbnailLayout.wrap(text,1100,s=>ctx.measureText(s).width);
      if(lines.length*size*1.12<=340)break;
    }
    const lineHeight=size*1.12,height=lines.length*lineHeight;
    const top=place==='top'?64:place==='center'?(720-height)/2:656-height;
    const gradient=ctx.createLinearGradient(0,Math.max(0,top-65),0,Math.min(720,top+height+65));
    gradient.addColorStop(0,'rgba(9,17,29,0)');gradient.addColorStop(.25,'rgba(9,17,29,.67)');gradient.addColorStop(.8,'rgba(9,17,29,.67)');gradient.addColorStop(1,'rgba(9,17,29,0)');
    ctx.fillStyle=gradient;ctx.fillRect(0,Math.max(0,top-65),1280,Math.min(720,top+height+65)-Math.max(0,top-65));
    ctx.textBaseline='top';ctx.textAlign=style==='clean'?'left':'center';ctx.lineJoin='round';
    const x=style==='clean'?90:640;
    if(style==='clean'){ctx.fillStyle=accent;ctx.fillRect(62,top,8,height);}
    lines.forEach((line,i)=>{
      ctx.strokeStyle='rgba(0,0,0,.8)';ctx.lineWidth=size*.09;
      if(style!=='clean')ctx.strokeText(line,x,top+i*lineHeight);
      ctx.fillStyle=style==='bold'?accent:'#ffffff';ctx.fillText(line,x,top+i*lineHeight);
    });
  }
  function dispose(){clearTimeout(seekTimer);seekTimer=null;if(source instanceof HTMLVideoElement){source.pause();source.removeAttribute('src');source.load();}source=null;if(sourceURL)URL.revokeObjectURL(sourceURL);sourceURL=null;}
  function clock(seconds){const m=Math.floor(seconds/60),s=(seconds%60).toFixed(2).padStart(5,'0');return `${m}:${s}`;}
  function openFile(file){
    if(!file||exporting)return;
    const isImage=/\.(jpe?g|png|webp)$/i.test(file.name)||/image\/(jpeg|png|webp)/.test(file.type);
    const isVideo=/\.(mp4|mov|m4v|webm)$/i.test(file.name)||file.type.startsWith('video/');
    if(!isImage&&!isVideo){status('invalid');return;}
    if(isImage&&file.size>30*1024*1024){status('large');return;}
    const ticket=++generation;dispose();invalidate();frameReady=false;updateControls();status('loading');
    $('thumbEditor').hidden=true;$('thumbFile').hidden=false;$('thumbFile').textContent=`${file.name} · ${bytes(file.size)}`;
    filename=file.name.replace(/\.[^.]+$/,'').replace(/[<>:"/\\|?*\u0000-\u001F]/g,'-').slice(0,100)||'thumbnail';
    $('thumbPosition').value='50';$('thumbFrameGroup').hidden=!isVideo;sourceURL=URL.createObjectURL(file);
    const fail=()=>{if(ticket!==generation)return;dispose();frameReady=false;$('thumbEditor').hidden=true;updateControls();status('failed');};
    const ready=()=>{if(ticket!==generation)return;frameReady=true;$('thumbEditor').hidden=false;status('loaded');updateControls();updateCropHelp();render();};
    if(isImage){
      const image=new Image();image.onload=()=>{
        if(ticket!==generation)return;
        try{
          const scale=Math.min(1,1920/Math.max(image.naturalWidth,image.naturalHeight));
          const reduced=document.createElement('canvas');reduced.width=Math.max(1,Math.round(image.naturalWidth*scale));reduced.height=Math.max(1,Math.round(image.naturalHeight*scale));
          reduced.getContext('2d').drawImage(image,0,0,reduced.width,reduced.height);source=reduced;
          URL.revokeObjectURL(sourceURL);sourceURL=null;image.onload=null;image.onerror=null;image.src='';ready();
        }catch(_){fail();}
      };image.onerror=fail;image.src=sourceURL;
    }else{
      const video=document.createElement('video');source=video;video.muted=true;video.playsInline=true;video.preload='auto';
      let target=0;
      video.onloadedmetadata=()=>{
        if(ticket!==generation)return;
        if(!video.videoWidth||!video.videoHeight||!Number.isFinite(video.duration)||video.duration<=0){fail();return;}
        $('thumbFrame').max=String(Math.max(0,video.duration-.04));$('thumbFrame').value='0';$('thumbTime').textContent=`${clock(0)} / ${clock(video.duration)}`;
      };
      video.onloadeddata=()=>{if(ticket===generation&&!video.seeking)ready();};
      video.onseeked=()=>{
        if(ticket!==generation)return;
        if(Math.abs(video.currentTime-target)>.02){video.currentTime=target;return;}
        ready();
      };
      video.onerror=fail;
      $('thumbFrame').oninput=()=>{
        if(ticket!==generation||exporting)return;
        target=+$('thumbFrame').value;invalidate();frameReady=false;updateControls();status('seeking');
        $('thumbTime').textContent=`${clock(target)} / ${clock(video.duration)}`;
        clearTimeout(seekTimer);seekTimer=setTimeout(()=>{if(ticket!==generation)return;if(video.seeking)return;if(Math.abs(video.currentTime-target)<.001){ready();return;}video.currentTime=target;},80);
      };
      video.src=sourceURL;
    }
  }
  $('thumbInput').onclick=()=>{$('thumbInput').value='';};$('thumbInput').onchange=e=>openFile(e.target.files[0]);
  ['dragenter','dragover'].forEach(event=>$('thumbDrop').addEventListener(event,e=>{e.preventDefault();if(!exporting)$('thumbDrop').classList.add('dragging');}));
  ['dragleave','drop'].forEach(event=>$('thumbDrop').addEventListener(event,e=>{e.preventDefault();$('thumbDrop').classList.remove('dragging');}));$('thumbDrop').addEventListener('drop',e=>openFile(e.dataTransfer.files[0]));
  ['thumbTitle','thumbPlacement','thumbColor','thumbPosition'].forEach(id=>$(id).addEventListener('input',()=>{invalidate();render();}));
  document.querySelectorAll('[data-style]').forEach(button=>button.onclick=()=>{style=button.dataset.style;document.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));invalidate();render();});
  $('thumbExport').onclick=async()=>{
    if(!source||!frameReady||exporting)return;
    exporting=true;updateControls();invalidate();status('working');
    try{
      render();let blob;
      for(const quality of [.94,.88,.8,.7,.6,.45,.3]){
        blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
        if(blob&&blob.size<2000000)break;
      }
      if(!blob||blob.size>=2000000)throw new Error('Output unavailable');
      outputURL=URL.createObjectURL(blob);$('thumbDownload').href=outputURL;$('thumbDownload').download=`${filename}-youtube-thumbnail.jpg`;
      $('thumbResultInfo').textContent=`JPG · 1280 × 720 · ${bytes(blob.size)}`;$('thumbResult').hidden=false;status('ready');
    }catch(e){console.error('[droop thumbnail]',e);status('exportFailed');}
    finally{exporting=false;updateControls();}
  };
  window.addEventListener('pagehide',()=>{generation++;dispose();invalidate();frameReady=false;$('thumbEditor').hidden=true;updateControls();});
  applyLanguage();updateControls();
})();
