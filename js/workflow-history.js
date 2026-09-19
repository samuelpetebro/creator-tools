(()=>{'use strict';

const list=document.querySelector('#workflow-history-list');
const clear=document.querySelector('#workflow-history-clear');
if(!list||!clear)return;

const KEY='droop-pro-run-history',MAX=10;
let history=[];

const lang=()=>{try{return (localStorage.getItem('droop-language')||navigator.language||'en').toLowerCase().startsWith('es')?'es':'en';}catch(_){return'en';}};
const copy={
  en:{empty:'No recent runs on this browser yet.',again:'Run again',summary:(e)=>`${e.ok} ready · ${e.failed} failed · ${e.total} input`,cleared:'Local run history cleared.'},
  es:{empty:'Todavía no hay ejecuciones recientes en este navegador.',again:'Ejecutar de nuevo',summary:(e)=>`${e.ok} listos · ${e.failed} fallaron · ${e.total} entrada`,cleared:'Se limpió el historial local.'}
};
const t=k=>copy[lang()][k]??copy.en[k]??k;
const clamp=n=>Math.max(0,Math.min(20,Number.isFinite(Number(n))?Math.round(Number(n)):0));
function sanitizeEntry(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  const recipe=raw.recipe&&typeof raw.recipe==='object'&&!Array.isArray(raw.recipe)?raw.recipe:{};
  const ranAt=Date.parse(raw.ran_at)?new Date(raw.ran_at).toISOString():new Date().toISOString();
  return {recipe_name:String(raw.recipe_name||'Workflow').slice(0,60),recipe:{...recipe},ok:clamp(raw.ok),failed:clamp(raw.failed),total:clamp(raw.total),ran_at:ranAt};
}
function read(){
  try{
    const parsed=JSON.parse(localStorage.getItem(KEY)||'[]');
    history=Array.isArray(parsed)?parsed.map(sanitizeEntry).filter(Boolean).slice(0,MAX):[];
  }catch(_){history=[];}
}
function write(){
  try{localStorage.setItem(KEY,JSON.stringify(history.slice(0,MAX)));}catch(_){}
}
function render(){
  list.replaceChildren();
  if(!history.length){const p=document.createElement('p');p.className='account-empty';p.textContent=t('empty');list.appendChild(p);clear.hidden=true;return;}
  clear.hidden=false;
  history.forEach((entry,index)=>{
    const row=document.createElement('div');row.className='workflow-history-row';
    const meta=document.createElement('div'),title=document.createElement('strong'),small=document.createElement('small');
    title.textContent=entry.recipe_name;
    const when=new Date(entry.ran_at).toLocaleString(lang()==='es'?'es-AR':'en-US',{dateStyle:'medium',timeStyle:'short'});
    small.textContent=`${when} · ${t('summary')(entry)}`;
    meta.append(title,small);
    const again=document.createElement('button');again.type='button';again.dataset.runAgain=String(index);again.textContent=t('again');
    row.append(meta,again);list.appendChild(row);
  });
}
window.addEventListener('droop:workflow-run-complete',event=>{
  const entry=sanitizeEntry(event.detail);if(!entry)return;
  history=[entry,...history].slice(0,MAX);write();render();
});
list.addEventListener('click',event=>{
  const button=event.target.closest('[data-run-again]');if(!button)return;
  const entry=history[Number(button.dataset.runAgain)];if(!entry)return;
  window.dispatchEvent(new CustomEvent('droop:workflow-run-again',{detail:{recipe_name:entry.recipe_name,recipe:{...entry.recipe}}}));
});
clear.addEventListener('click',()=>{history=[];write();render();});
document.querySelector('#workflow-lang')?.addEventListener('click',()=>setTimeout(render,0));
read();render();
})();