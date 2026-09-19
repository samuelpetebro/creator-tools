(()=>{'use strict';

const accessApi=window.DroopProAccess;
const locked=document.querySelector('#workflow-locked'),pro=document.querySelector('#workflow-pro');
if(!accessApi||!locked||!pro)return;

const form=document.querySelector('#workflow-recipe-form');
const nameInput=document.querySelector('#workflow-name');
const resizeInput=document.querySelector('#workflow-resize');
const formatInput=document.querySelector('#workflow-format');
const qualityInput=document.querySelector('#workflow-quality');
const targetInput=document.querySelector('#workflow-target');
const unitInput=document.querySelector('#workflow-unit');
const downscaleInput=document.querySelector('#workflow-downscale');
const templateInput=document.querySelector('#workflow-template');
const saveButton=document.querySelector('#workflow-save');
const cancelButton=document.querySelector('#workflow-cancel');
const formStatus=document.querySelector('#workflow-form-status');
const usage=document.querySelector('#workflow-usage');
const recipeList=document.querySelector('#workflow-recipe-list');
const runTitle=document.querySelector('#workflow-run-title');
const runSummary=document.querySelector('#workflow-run-summary');
const filesInput=document.querySelector('#workflow-files');
const runButton=document.querySelector('#workflow-run');
const downloadButton=document.querySelector('#workflow-download');
const runStatus=document.querySelector('#workflow-run-status');
const results=document.querySelector('#workflow-results');
const langButton=document.querySelector('#workflow-lang');

const MAX_RECIPES=20,MAX_FILES=20,MAX_BYTES=200*1024*1024;
const PRESETS={
  none:null,youtube:{width:1280,height:720},'instagram-post':{width:1080,height:1080},
  'instagram-story':{width:1080,height:1920},'instagram-portrait':{width:1080,height:1350},
  spotify:{width:3000,height:3000},'discord-avatar':{width:512,height:512}
};
const RESIZES=new Set(Object.keys(PRESETS)),FORMATS=new Set(['jpeg','webp']),QUALITIES=new Set([75,85,92]),UNITS=new Set(['KB','MB']);
let client=null,session=null,recipes=[],editingId=null,selectedId=null,selectedSnapshot=null,files=[],entries=[];

const copy={
en:{navTools:'Tools',navAccount:'Account',privacy:'Local processing · No media uploads',title:'Do the boring<br>work once.',lead:'Save a repeatable image workflow, drop in a batch, and let Droop resize, re-export, target a file size, rename and ZIP everything locally.',lockedTitle:'Workflow Recipes are a Pro feature.',lockedCopy:'Free tools stay free. Pro adds repeatable batch workflows that remove setup work.',viewPro:'View Droop Pro · USD 5/month',signIn:'Sign in',editorLabel:'RECIPE EDITOR',editorTitle:'Build the steps once.',name:'Recipe name',resize:'Resize / crop',keepOriginal:'Keep original dimensions',format:'Output format',quality:'Starting quality',target:'Optional max file size',unit:'Unit',downscale:'Allow dimensions to shrink if quality alone cannot hit the target',filename:'Filename template',tokens:'Available: {{name}}, {{recipe}}, {{index}}. Every output is a fresh re-export, so common image metadata is removed.',save:'Save recipe',update:'Update recipe',cancel:'Cancel edit',libraryLabel:'YOUR RECIPES',libraryTitle:'Pick one and run it.',empty:'No Workflow Recipes saved yet.',use:'Use recipe',edit:'Edit',remove:'Delete',runnerLabel:'RUN RECIPE',chooseRecipe:'Choose a saved recipe first.',drop:'Choose up to 20 images',batchLimit:'200 MB total · processed sequentially on this device',run:'Run workflow',download:'Download ZIP',footer:'Private browser-based tools.',saved:'Workflow Recipe saved.',updated:'Workflow Recipe updated.',deleted:'Workflow Recipe deleted.',confirm:'Delete this Workflow Recipe?',tooManyRecipes:'Workflow Recipe limit reached.',filesReady:n=>`${n} images ready.`,tooManyFiles:`Choose up to ${MAX_FILES} images.`,tooLarge:'Keep the batch under 200 MB total.',imagesOnly:'Every batch file must be an image.',processing:(i,n)=>`Processing ${i} of ${n}…`,done:(ok,failed)=>failed?`${ok} ready · ${failed} failed. Download the successful outputs.`:`${ok} outputs ready. Download one ZIP.`,noTarget:'No size limit',couldNotFit:'could not hit the requested size target',error:'Something went wrong with this workflow.'},
es:{navTools:'Herramientas',navAccount:'Cuenta',privacy:'Procesamiento local · Sin subir archivos',title:'Hacé el trabajo aburrido<br>una sola vez.',lead:'Guardá un flujo repetible para imágenes, tirá un lote y dejá que Droop ajuste, reexporte, apunte a un peso, renombre y arme el ZIP localmente.',lockedTitle:'Workflow Recipes es una función Pro.',lockedCopy:'Las herramientas Free siguen siendo gratis. Pro suma flujos repetibles por lote para evitar configurar todo de nuevo.',viewPro:'Ver Droop Pro · USD 5/mes',signIn:'Iniciar sesión',editorLabel:'EDITOR DE RECETA',editorTitle:'Armá los pasos una vez.',name:'Nombre de la receta',resize:'Ajuste / recorte',keepOriginal:'Mantener dimensiones originales',format:'Formato de salida',quality:'Calidad inicial',target:'Peso máximo opcional',unit:'Unidad',downscale:'Permitir reducir dimensiones si la calidad sola no alcanza el peso',filename:'Plantilla de nombre',tokens:'Disponibles: {{name}}, {{recipe}}, {{index}}. Cada salida se reexporta desde cero, así que se eliminan metadatos comunes de imagen.',save:'Guardar receta',update:'Actualizar receta',cancel:'Cancelar edición',libraryLabel:'TUS RECETAS',libraryTitle:'Elegí una y ejecutala.',empty:'Todavía no guardaste Workflow Recipes.',use:'Usar receta',edit:'Editar',remove:'Eliminar',runnerLabel:'EJECUTAR RECETA',chooseRecipe:'Primero elegí una receta guardada.',drop:'Elegí hasta 20 imágenes',batchLimit:'200 MB total · procesadas una por una en este dispositivo',run:'Ejecutar workflow',download:'Descargar ZIP',footer:'Herramientas privadas desde tu navegador.',saved:'Workflow Recipe guardada.',updated:'Workflow Recipe actualizada.',deleted:'Workflow Recipe eliminada.',confirm:'¿Eliminar esta Workflow Recipe?',tooManyRecipes:'Llegaste al límite de Workflow Recipes.',filesReady:n=>`${n} imágenes listas.`,tooManyFiles:`Elegí hasta ${MAX_FILES} imágenes.`,tooLarge:'Mantené el lote por debajo de 200 MB en total.',imagesOnly:'Todos los archivos del lote deben ser imágenes.',processing:(i,n)=>`Procesando ${i} de ${n}…`,done:(ok,failed)=>failed?`${ok} listos · ${failed} fallaron. Descargá las salidas correctas.`:`${ok} salidas listas. Descargá un solo ZIP.`,noTarget:'Sin límite de peso',couldNotFit:'no pudo alcanzar el peso solicitado',error:'Algo falló en este workflow.'}
};
const getLang=()=>{try{return (localStorage.getItem('droop-language')||navigator.language||'en').toLowerCase().startsWith('es')?'es':'en';}catch(_){return'en';}};
const t=k=>copy[getLang()][k]??copy.en[k]??k;
const say=(el,msg,error=false)=>{el.textContent=msg||'';el.dataset.state=error?'error':'ok';};
const safeToken=value=>String(value||'').trim().replace(/\.[^.]+$/,'').replace(/[^a-z0-9_-]+/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'file';
const pretty=bytes=>bytes<1024?`${bytes} B`:bytes<1048576?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/1048576).toFixed(2)} MB`;

function sanitizeRecipe(raw={}){
  const resize=RESIZES.has(raw.resize)?raw.resize:'none';
  const output_format=FORMATS.has(raw.output_format)?raw.output_format:'jpeg';
  const quality=QUALITIES.has(Number(raw.quality))?Number(raw.quality):92;
  const targetValue=Number(raw.target_value);
  const target_value=Number.isFinite(targetValue)&&targetValue>0&&targetValue<=500?targetValue:null;
  const target_unit=UNITS.has(raw.target_unit)?raw.target_unit:'MB';
  let filename_template=String(raw.filename_template||'{{name}}-{{recipe}}-{{index}}').trim().slice(0,80);
  if(!filename_template)filename_template='{{name}}-{{recipe}}-{{index}}';
  return {version:1,resize,output_format,quality,target_value,target_unit,allow_downscale:raw.allow_downscale===true,filename_template};
}
function recipeFromForm(){return sanitizeRecipe({resize:resizeInput.value,output_format:formatInput.value,quality:Number(qualityInput.value),target_value:targetInput.value,target_unit:unitInput.value,allow_downscale:downscaleInput.checked,filename_template:templateInput.value});}
function targetBytes(recipe){if(!recipe.target_value)return 0;return recipe.target_unit==='KB'?recipe.target_value*1024:recipe.target_value*1024*1024;}
function recipeSummaryText(recipe){
  const r=sanitizeRecipe(recipe),parts=[r.resize==='none'?t('keepOriginal'):r.resize.toUpperCase(),r.output_format.toUpperCase(),`${r.quality}%`];
  parts.push(r.target_value?`≤ ${r.target_value} ${r.target_unit}`:t('noTarget'));
  if(r.allow_downscale)parts.push(getLang()==='es'?'downscale permitido':'downscale allowed');
  return parts.join(' · ');
}
function applyCopy(){
  document.documentElement.lang=getLang();
  document.querySelectorAll('[data-wf]').forEach(el=>{const value=t(el.dataset.wf);if(typeof value==='string')el.textContent=value;});
  document.querySelectorAll('[data-wf-html]').forEach(el=>{const value=t(el.dataset.wfHtml);if(typeof value==='string')el.innerHTML=value;});
  langButton.textContent=getLang()==='es'?'EN':'ES';
  langButton.setAttribute('aria-label',getLang()==='es'?'Cambiar a inglés':'Switch to Spanish');
  nameInput.placeholder=getLang()==='es'?'Entrega Instagram':'Instagram delivery';
  targetInput.placeholder=getLang()==='es'?'Sin límite':'No limit';
  saveButton.textContent=editingId?t('update'):t('save');
  renderRecipes();renderSelected();
}
function resetForm(){editingId=null;form.reset();resizeInput.value='none';formatInput.value='jpeg';qualityInput.value='92';unitInput.value='MB';templateInput.value='{{name}}-{{recipe}}-{{index}}';cancelButton.hidden=true;saveButton.textContent=t('save');}
function editRecipe(item){
  editingId=item.id;const r=sanitizeRecipe(item.recipe);
  nameInput.value=item.name;resizeInput.value=r.resize;formatInput.value=r.output_format;qualityInput.value=String(r.quality);targetInput.value=r.target_value||'';unitInput.value=r.target_unit;downscaleInput.checked=r.allow_downscale;templateInput.value=r.filename_template;
  cancelButton.hidden=false;saveButton.textContent=t('update');form.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function renderRecipes(){
  usage.textContent=`${recipes.length} / ${MAX_RECIPES}`;recipeList.replaceChildren();
  if(!recipes.length){const p=document.createElement('p');p.className='account-empty';p.textContent=t('empty');recipeList.appendChild(p);return;}
  for(const item of recipes){
    const card=document.createElement('article');card.className='workflow-recipe-card'+(item.id===selectedId?' is-selected':'');card.dataset.id=item.id;
    const h=document.createElement('h3');h.textContent=item.name;
    const p=document.createElement('p');p.textContent=recipeSummaryText(item.recipe);
    const actions=document.createElement('div');actions.className='workflow-recipe-actions';
    const use=document.createElement('button');use.type='button';use.dataset.use=item.id;use.textContent=t('use');
    const edit=document.createElement('button');edit.type='button';edit.dataset.edit=item.id;edit.textContent=t('edit');
    const del=document.createElement('button');del.type='button';del.dataset.delete=item.id;del.textContent=t('remove');
    actions.append(use,edit,del);card.append(h,p,actions);recipeList.appendChild(card);
  }
}
function selectedRecipe(){return recipes.find(r=>r.id===selectedId)||selectedSnapshot||null;}
function renderSelected(){
  const item=selectedRecipe();
  if(!item){runTitle.textContent=t('chooseRecipe');runSummary.textContent='';runButton.disabled=true;return;}
  runTitle.textContent=item.name;runSummary.textContent=recipeSummaryText(item.recipe);runButton.disabled=!files.length;renderRecipes();
}
async function reload(){
  const {data,error}=await client.from('workflow_recipes').select('id,name,recipe,updated_at').eq('user_id',session.user.id).order('updated_at',{ascending:false});
  if(error)throw error;recipes=data||[];
  if(selectedId&&!recipes.some(r=>r.id===selectedId))selectedId=null;
  renderRecipes();renderSelected();
}

form.addEventListener('submit',async event=>{
  event.preventDefault();if(!session)return;
  const name=nameInput.value.trim().slice(0,60);if(!name)return;
  if(!editingId&&recipes.length>=MAX_RECIPES){say(formStatus,t('tooManyRecipes'),true);return;}
  saveButton.disabled=true;say(formStatus,'');
  try{
    if(editingId){
      const {error}=await client.from('workflow_recipes').update({name,recipe:recipeFromForm()}).eq('id',editingId).eq('user_id',session.user.id);if(error)throw error;say(formStatus,t('updated'));
    }else{
      const {error}=await client.from('workflow_recipes').insert({user_id:session.user.id,name,recipe:recipeFromForm()});if(error)throw error;say(formStatus,t('saved'));
    }
    window.DroopAnalytics?.track?.('pro_recipe_save');resetForm();await reload();
  }catch(error){console.error('Workflow Recipe save failed',error);say(formStatus,error?.message||t('error'),true);}
  finally{saveButton.disabled=false;}
});
cancelButton.addEventListener('click',()=>{resetForm();say(formStatus,'');});
recipeList.addEventListener('click',async event=>{
  const use=event.target.closest('[data-use]');if(use){selectedId=use.dataset.use;selectedSnapshot=null;entries=[];results.replaceChildren();downloadButton.hidden=true;say(runStatus,'');renderSelected();return;}
  const edit=event.target.closest('[data-edit]');if(edit){const item=recipes.find(r=>r.id===edit.dataset.edit);if(item)editRecipe(item);return;}
  const del=event.target.closest('[data-delete]');if(!del)return;
  if(!confirm(t('confirm')))return;
  try{const {error}=await client.from('workflow_recipes').delete().eq('id',del.dataset.delete).eq('user_id',session.user.id);if(error)throw error;if(selectedId===del.dataset.delete)selectedId=null;if(editingId===del.dataset.delete)resetForm();window.DroopAnalytics?.track?.('pro_recipe_delete');await reload();say(formStatus,t('deleted'));}catch(error){say(formStatus,error?.message||t('error'),true);}
});

filesInput.addEventListener('change',()=>{
  entries=[];results.replaceChildren();downloadButton.hidden=true;
  const selected=[...filesInput.files];
  if(!selected.length){files=[];runButton.disabled=true;say(runStatus,'');return;}
  if(selected.length>MAX_FILES){files=[];filesInput.value='';runButton.disabled=true;say(runStatus,t('tooManyFiles'),true);return;}
  if(selected.some(f=>!f.type.startsWith('image/'))){files=[];filesInput.value='';runButton.disabled=true;say(runStatus,t('imagesOnly'),true);return;}
  if(selected.reduce((n,f)=>n+f.size,0)>MAX_BYTES){files=[];filesInput.value='';runButton.disabled=true;say(runStatus,t('tooLarge'),true);return;}
  files=selected;runButton.disabled=!selectedRecipe();say(runStatus,t('filesReady')(files.length));
});

const decode=file=>new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('decode'));};img.src=url;});
const encode=(canvas,mime,q)=>new Promise(resolve=>canvas.toBlob(resolve,mime,q));
function makeCanvas(img,resize,scale,format){
  const preset=PRESETS[resize];
  const baseW=preset?.width||img.naturalWidth,baseH=preset?.height||img.naturalHeight;
  const width=Math.max(1,Math.round(baseW*scale)),height=Math.max(1,Math.round(baseH*scale));
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  if(format==='jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);}
  if(preset){
    const sr=img.naturalWidth/img.naturalHeight,tr=baseW/baseH;let sx=0,sy=0,sw=img.naturalWidth,sh=img.naturalHeight;
    if(sr>tr){sw=img.naturalHeight*tr;sx=(img.naturalWidth-sw)/2;}else{sh=img.naturalWidth/tr;sy=(img.naturalHeight-sh)/2;}
    ctx.drawImage(img,sx,sy,sw,sh,0,0,width,height);
  }else ctx.drawImage(img,0,0,width,height);
  return canvas;
}
async function bestBlob(canvas,mime,maxQ,limit){
  if(!limit){const blob=await encode(canvas,mime,maxQ);return blob?{blob,quality:maxQ}:null;}
  const full=await encode(canvas,mime,maxQ);if(full&&full.size<=limit)return{blob:full,quality:maxQ};
  const min=.08,minimum=await encode(canvas,mime,min);if(!minimum||minimum.size>limit)return null;
  let low=min,high=maxQ,best=minimum,bq=min;
  for(let i=0;i<10;i++){const q=(low+high)/2,blob=await encode(canvas,mime,q);if(!blob)break;if(blob.size<=limit){best=blob;bq=q;low=q;}else high=q;}
  return{blob:best,quality:bq};
}
async function processFile(file,recipe){
  const img=await decode(file),mime=recipe.output_format==='jpeg'?'image/jpeg':'image/webp',limit=targetBytes(recipe),maxQ=recipe.quality/100;
  const attempts=recipe.allow_downscale?6:1;
  for(let i=0;i<attempts;i++){
    const scale=Math.pow(.85,i),canvas=makeCanvas(img,recipe.resize,scale,recipe.output_format),best=await bestBlob(canvas,mime,maxQ,limit);
    if(best)return{...best,width:canvas.width,height:canvas.height};
  }
  return null;
}
function outputName(template,file,recipeName,index,ext){
  const source=safeToken(file.name),recipe=safeToken(recipeName),n=String(index+1).padStart(2,'0');
  let raw=String(template||'{{name}}-{{recipe}}-{{index}}').replaceAll('{{name}}',source).replaceAll('{{recipe}}',recipe).replaceAll('{{index}}',n);
  raw=raw.replace(/[\\/:*?"<>|]+/g,'-').replace(/\.+$/,'').trim().slice(0,120);
  return `${raw||source}.${ext}`;
}
function appendResult(name,detail,error=false){
  const li=document.createElement('li'),left=document.createElement('strong'),right=document.createElement('span');
  left.textContent=name;right.textContent=detail;if(error)li.dataset.state='error';li.append(left,right);results.appendChild(li);
}
runButton.addEventListener('click',async()=>{
  const item=selectedRecipe();if(!item||!files.length)return;
  const access=await accessApi.refresh();if(!access?.isPro){location.href='pro.html';return;}
  const recipe=sanitizeRecipe(item.recipe),ext=recipe.output_format==='jpeg'?'jpg':'webp';
  runButton.disabled=true;filesInput.disabled=true;downloadButton.hidden=true;entries=[];results.replaceChildren();
  let failed=0;window.DroopAnalytics?.start?.();
  for(let i=0;i<files.length;i++){
    say(runStatus,t('processing')(i+1,files.length));
    try{
      const out=await processFile(files[i],recipe);
      if(!out){failed++;appendResult(files[i].name,t('couldNotFit'),true);continue;}
      const name=outputName(recipe.filename_template,files[i],item.name,i,ext);entries.push({name,blob:out.blob});
      appendResult(name,`${pretty(out.blob.size)} · ${out.width}×${out.height} · ${Math.round(out.quality*100)}%`);
    }catch(error){console.error('Workflow file failed',error);failed++;appendResult(files[i].name,t('error'),true);}
  }
  if(entries.length){window.DroopAnalytics?.finish?.('complete');window.DroopAnalytics?.track?.('pro_recipe_run');window.dispatchEvent(new CustomEvent('droop:workflow-run-complete',{detail:{recipe_id:item.id||null,recipe_name:item.name,recipe,ok:entries.length,failed,total:files.length,ran_at:new Date().toISOString()}}));downloadButton.hidden=false;say(runStatus,t('done')(entries.length,failed),failed>0);}
  else{window.DroopAnalytics?.finish?.('error');say(runStatus,t('error'),true);}
  runButton.disabled=false;filesInput.disabled=false;
});
downloadButton.addEventListener('click',async()=>{
  if(!entries.length)return;downloadButton.disabled=true;
  try{const zip=await window.DroopZip.create(entries),url=URL.createObjectURL(zip),a=document.createElement('a');a.href=url;a.download=`droop-workflow-${safeToken(selectedRecipe()?.name||'recipe')}.zip`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  catch(error){console.error('Workflow ZIP failed',error);say(runStatus,t('error'),true);}
  finally{downloadButton.disabled=false;}
});
langButton.addEventListener('click',()=>{const next=getLang()==='es'?'en':'es';try{localStorage.setItem('droop-language',next);}catch(_){}applyCopy();});
window.addEventListener('droop:workflow-run-again',event=>{
  const detail=event.detail||{};
  const name=String(detail.recipe_name||'Recent workflow').slice(0,60);
  selectedId=null;selectedSnapshot={id:null,name,recipe:sanitizeRecipe(detail.recipe||{})};
  entries=[];results.replaceChildren();downloadButton.hidden=true;say(runStatus,'');renderSelected();
  window.DroopAnalytics?.track?.('pro_run_again');
  document.querySelector('.workflow-runner')?.scrollIntoView({behavior:'smooth',block:'start'});
});

(async()=>{
  applyCopy();
  const access=await accessApi.refresh();
  session=access?.user?{user:access.user}:null;client=accessApi.client;
  locked.hidden=!!access?.isPro;pro.hidden=!access?.isPro;
  if(!access?.isPro)return;
  await reload();
})().catch(error=>{console.error('Workflow Recipes init failed',error);say(formStatus,t('error'),true);});
})();