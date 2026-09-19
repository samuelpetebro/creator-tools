(()=>{'use strict';

const root=document.querySelector('#account-brand-kits');
if(!root)return;
const cfg=window.DroopSupabaseConfig||{};
if(!window.supabase||!cfg.url||!cfg.anonKey)return;

const client=window.supabase.createClient(cfg.url,cfg.anonKey);
const locked=root.querySelector('[data-pro-locked]');
const content=root.querySelector('[data-pro-content]');
const form=root.querySelector('#brand-kit-form');
const nameInput=root.querySelector('#brand-kit-name');
const prefixInput=root.querySelector('#brand-kit-prefix');
const primaryInput=root.querySelector('#brand-kit-primary');
const secondaryInput=root.querySelector('#brand-kit-secondary');
const save=root.querySelector('#brand-kit-save');
const cancel=root.querySelector('#brand-kit-cancel');
const list=root.querySelector('#brand-kit-list');
const usage=root.querySelector('#brand-kit-usage');
const status=root.querySelector('#brand-kit-status');
const MAX=5;
let session=null,plan='free',items=[],editingId=null;

const copy={
  en:{title:'Brand Kits',intro:'Keep reusable brand defaults synced across Droop. Only small settings are stored — never your media or logo files.',locked:'Brand Kits are included with Droop Pro.',name:'Kit name',prefix:'Filename prefix',primary:'Primary color',secondary:'Secondary color',save:'Save Brand Kit',update:'Update Brand Kit',cancel:'Cancel edit',active:'ACTIVE',activate:'Make active',edit:'Edit',remove:'Delete',empty:'No Brand Kits yet.',usage:n=>`${n}/${MAX} kits`,saved:'Brand Kit saved.',updated:'Brand Kit updated.',activated:'Active Brand Kit changed.',deleted:'Brand Kit deleted.',confirm:'Delete this Brand Kit?',limit:'Brand Kit limit reached.',error:'Could not update Brand Kits.'},
  es:{title:'Kits de marca',intro:'Sincronizá ajustes reutilizables de marca en Droop. Solo se guardan configuraciones pequeñas, nunca tus archivos ni logos.',locked:'Los Kits de marca están incluidos con Droop Pro.',name:'Nombre del kit',prefix:'Prefijo de archivos',primary:'Color principal',secondary:'Color secundario',save:'Guardar Kit de marca',update:'Actualizar Kit de marca',cancel:'Cancelar edición',active:'ACTIVO',activate:'Usar como activo',edit:'Editar',remove:'Eliminar',empty:'Todavía no tenés Kits de marca.',usage:n=>`${n}/${MAX} kits`,saved:'Kit de marca guardado.',updated:'Kit de marca actualizado.',activated:'Cambió el Kit de marca activo.',deleted:'Kit de marca eliminado.',confirm:'¿Eliminar este Kit de marca?',limit:'Llegaste al límite de Kits de marca.',error:'No se pudieron actualizar los Kits de marca.'}
};
const lang=()=>{try{return (localStorage.getItem('droop-language')||navigator.language||'en').toLowerCase().startsWith('es')?'es':'en';}catch(_){return'en';}};
const t=k=>copy[lang()][k]??copy.en[k]??k;
const say=(message,error=false)=>{status.textContent=message||'';status.dataset.state=error?'error':'ok';};
const cleanHex=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(String(value||''))?String(value).toLowerCase():fallback;

function applyCopy(){
  root.querySelectorAll('[data-bk]').forEach(el=>{const key=el.dataset.bk;if(typeof t(key)==='string')el.textContent=t(key);});
  nameInput.placeholder=lang()==='es'?'Ej. Mi marca':'e.g. My brand';
  prefixInput.placeholder=lang()==='es'?'mi-marca':'my-brand';
  save.textContent=editingId?t('update'):t('save');
  cancel.textContent=t('cancel');
  render();
}
function cleanSettings(raw={}){
  return {
    filename_prefix:String(raw.filename_prefix||'').trim().slice(0,50),
    primary_color:cleanHex(raw.primary_color,'#6c63ff'),
    secondary_color:cleanHex(raw.secondary_color,'#111111')
  };
}
function currentSettings(){return cleanSettings({filename_prefix:prefixInput.value,primary_color:primaryInput.value,secondary_color:secondaryInput.value});}
function resetForm(){editingId=null;form.reset();primaryInput.value='#6c63ff';secondaryInput.value='#111111';cancel.hidden=true;save.textContent=t('save');}
function setEditing(item){
  editingId=item.id;const s=cleanSettings(item.settings);
  nameInput.value=item.name||'';prefixInput.value=s.filename_prefix;primaryInput.value=s.primary_color;secondaryInput.value=s.secondary_color;
  cancel.hidden=false;save.textContent=t('update');form.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function summary(item){
  const s=cleanSettings(item.settings),parts=[s.primary_color.toUpperCase(),s.secondary_color.toUpperCase()];
  if(s.filename_prefix)parts.unshift(s.filename_prefix);
  return parts.join(' · ');
}
function render(){
  if(!list||!usage)return;
  usage.textContent=typeof t('usage')==='function'?t('usage')(items.length):`${items.length}/${MAX}`;
  list.replaceChildren();
  if(!items.length){const p=document.createElement('p');p.className='account-empty';p.textContent=t('empty');list.appendChild(p);return;}
  for(const item of items){
    const row=document.createElement('div');row.className='creator-profile-row';row.dataset.id=item.id;
    const meta=document.createElement('div'),title=document.createElement('strong'),small=document.createElement('small');
    title.textContent=item.name;small.textContent=summary(item);meta.append(title,small);
    const actions=document.createElement('div');actions.className='creator-profile-actions';
    if(item.is_active){const badge=document.createElement('span');badge.className='creator-profile-active';badge.textContent=t('active');actions.appendChild(badge);}
    else{const active=document.createElement('button');active.type='button';active.dataset.activate=item.id;active.textContent=t('activate');actions.appendChild(active);}
    const edit=document.createElement('button');edit.type='button';edit.dataset.edit=item.id;edit.textContent=t('edit');
    const remove=document.createElement('button');remove.type='button';remove.dataset.delete=item.id;remove.textContent=t('remove');
    actions.append(edit,remove);row.append(meta,actions);list.appendChild(row);
  }
}
async function reload(){
  const {data:sessionData,error:sessionError}=await client.auth.getSession();if(sessionError)throw sessionError;
  session=sessionData?.session||null;if(!session)return;
  const {data:profile,error:profileError}=await client.from('profiles').select('plan').eq('id',session.user.id).single();if(profileError)throw profileError;
  plan=profile?.plan==='pro'?'pro':'free';root.dataset.proState=plan;locked.hidden=plan==='pro';content.hidden=plan!=='pro';
  if(plan!=='pro'){items=[];render();return;}
  const {data,error}=await client.from('brand_kits').select('id,name,settings,is_active,updated_at').eq('user_id',session.user.id).order('updated_at',{ascending:false});if(error)throw error;
  items=data||[];render();
}
form.addEventListener('submit',async event=>{
  event.preventDefault();if(!session||plan!=='pro')return;
  const name=nameInput.value.trim().slice(0,60);if(!name){say(t('name'),true);return;}
  if(!editingId&&items.length>=MAX){say(t('limit'),true);return;}
  save.disabled=true;say('');
  try{
    if(editingId){
      const {error}=await client.from('brand_kits').update({name,settings:currentSettings()}).eq('id',editingId).eq('user_id',session.user.id);if(error)throw error;
      window.DroopAnalytics?.track?.('pro_brand_kit_save');say(t('updated'));
    }else{
      const {error}=await client.from('brand_kits').insert({user_id:session.user.id,name,settings:currentSettings(),is_active:items.length===0});if(error)throw error;
      window.DroopAnalytics?.track?.('pro_brand_kit_save');say(t('saved'));
    }
    resetForm();await reload();
  }catch(error){console.error('Droop Brand Kit save failed',error);say(error?.message||t('error'),true);}
  finally{save.disabled=false;}
});
cancel.addEventListener('click',()=>{resetForm();say('');});
list.addEventListener('click',async event=>{
  const edit=event.target.closest('[data-edit]');if(edit){const item=items.find(x=>x.id===edit.dataset.edit);if(item)setEditing(item);return;}
  const activate=event.target.closest('[data-activate]');
  if(activate){try{const {error}=await client.rpc('set_my_active_brand_kit',{p_brand_kit_id:activate.dataset.activate});if(error)throw error;window.DroopAnalytics?.track?.('pro_brand_kit_activate');await reload();say(t('activated'));}catch(error){say(error?.message||t('error'),true);}return;}
  const remove=event.target.closest('[data-delete]');
  if(remove){if(!confirm(t('confirm')))return;try{const {error}=await client.from('brand_kits').delete().eq('id',remove.dataset.delete).eq('user_id',session.user.id);if(error)throw error;window.DroopAnalytics?.track?.('pro_brand_kit_delete');if(editingId===remove.dataset.delete)resetForm();await reload();say(t('deleted'));}catch(error){say(error?.message||t('error'),true);}}
});
document.querySelector('#account-lang')?.addEventListener('click',()=>setTimeout(applyCopy,0));
client.auth.onAuthStateChange(()=>setTimeout(()=>reload().catch(error=>console.warn('[brand kits]',error)),0));
applyCopy();reload().catch(error=>{console.warn('[brand kits]',error);say(t('error'),true);});
})();