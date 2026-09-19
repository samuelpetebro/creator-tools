(()=>{'use strict';

const root=document.querySelector('#account-creator-profiles');
if(!root)return;
const cfg=window.DroopSupabaseConfig||{};
if(!window.supabase||!cfg.url||!cfg.anonKey)return;

const client=window.supabase.createClient(cfg.url,cfg.anonKey);
const locked=root.querySelector('[data-pro-locked]');
const content=root.querySelector('[data-pro-content]');
const form=root.querySelector('#creator-profile-form');
const nameInput=root.querySelector('#creator-profile-name');
const prefixInput=root.querySelector('#creator-profile-prefix');
const makeFit=root.querySelector('#creator-profile-makefit');
const releasePack=root.querySelector('#creator-profile-releasepack');
const quality=root.querySelector('#creator-profile-quality');
const save=root.querySelector('#creator-profile-save');
const cancel=root.querySelector('#creator-profile-cancel');
const list=root.querySelector('#creator-profile-list');
const usage=root.querySelector('#creator-profile-usage');
const status=root.querySelector('#creator-profile-status');
const MAX=10;
let session=null,plan='free',items=[],editingId=null;

const copy={
  en:{title:'Creator Profiles',intro:'Sync reusable creator defaults across Droop. Only settings are stored — never your media.',locked:'Creator Profiles are included with Droop Pro.',name:'Profile name',prefix:'Filename prefix',makeFit:'Make It Fit default',release:'Release Pack default',quality:'JPEG quality',save:'Save Creator Profile',update:'Update Creator Profile',cancel:'Cancel edit',active:'ACTIVE',activate:'Make active',edit:'Edit',remove:'Delete',empty:'No Creator Profiles yet.',usage:n=>`${n}/${MAX} profiles`,saved:'Creator Profile saved.',updated:'Creator Profile updated.',activated:'Active Creator Profile changed.',deleted:'Creator Profile deleted.',confirm:'Delete this Creator Profile?',limit:'Creator Profile limit reached.',error:'Could not update Creator Profiles.'},
  es:{title:'Perfiles de creador',intro:'Sincronizá ajustes reutilizables de creador en Droop. Solo se guardan configuraciones, nunca tus archivos.',locked:'Los Perfiles de creador están incluidos con Droop Pro.',name:'Nombre del perfil',prefix:'Prefijo de archivos',makeFit:'Default de Make It Fit',release:'Default de Release Pack',quality:'Calidad JPEG',save:'Guardar perfil de creador',update:'Actualizar perfil de creador',cancel:'Cancelar edición',active:'ACTIVO',activate:'Usar como activo',edit:'Editar',remove:'Eliminar',empty:'Todavía no tenés perfiles de creador.',usage:n=>`${n}/${MAX} perfiles`,saved:'Perfil de creador guardado.',updated:'Perfil de creador actualizado.',activated:'Cambió el perfil de creador activo.',deleted:'Perfil de creador eliminado.',confirm:'¿Eliminar este perfil de creador?',limit:'Llegaste al límite de perfiles de creador.',error:'No se pudieron actualizar los perfiles de creador.'}
};
const lang=()=>{try{return (localStorage.getItem('droop-language')||navigator.language||'en').toLowerCase().startsWith('es')?'es':'en';}catch(_){return'en';}};
const t=k=>copy[lang()][k]??copy.en[k]??k;
const say=(message,error=false)=>{status.textContent=message||'';status.dataset.state=error?'error':'ok';};

function applyCopy(){
  root.querySelectorAll('[data-cp]').forEach(el=>{const key=el.dataset.cp;if(typeof t(key)==='string')el.textContent=t(key);});
  nameInput.placeholder=lang()==='es'?'Ej. Mi canal de YouTube':'e.g. My YouTube channel';
  prefixInput.placeholder=lang()==='es'?'mi-proyecto':'my-project';
  save.textContent=editingId?t('update'):t('save');
  cancel.textContent=t('cancel');
  render();
}

function cleanSettings(raw={}){
  const destinations=new Set(['youtube','instagram-post','instagram-story','spotify','discord-avatar']);
  const packs=new Set(['music','youtube','social','profile']);
  const qualities=new Set([75,85,92]);
  return {
    filename_prefix:String(raw.filename_prefix||'').trim().slice(0,50),
    make_it_fit_destination:destinations.has(raw.make_it_fit_destination)?raw.make_it_fit_destination:'youtube',
    release_pack:packs.has(raw.release_pack)?raw.release_pack:'music',
    jpeg_quality:qualities.has(Number(raw.jpeg_quality))?Number(raw.jpeg_quality):92
  };
}
function currentSettings(){return cleanSettings({filename_prefix:prefixInput.value,make_it_fit_destination:makeFit.value,release_pack:releasePack.value,jpeg_quality:Number(quality.value)});}
function resetForm(){editingId=null;form.reset();makeFit.value='youtube';releasePack.value='music';quality.value='92';cancel.hidden=true;save.textContent=t('save');}
function setEditing(item){
  editingId=item.id;
  const s=cleanSettings(item.settings);
  nameInput.value=item.name||'';
  prefixInput.value=s.filename_prefix;
  makeFit.value=s.make_it_fit_destination;
  releasePack.value=s.release_pack;
  quality.value=String(s.jpeg_quality);
  cancel.hidden=false;save.textContent=t('update');
  form.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function summary(item){
  const s=cleanSettings(item.settings);
  const parts=[s.make_it_fit_destination,s.release_pack,`JPEG ${s.jpeg_quality}%`];
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
    const meta=document.createElement('div');
    const title=document.createElement('strong');title.textContent=item.name;
    const small=document.createElement('small');small.textContent=summary(item);
    meta.append(title,small);
    const actions=document.createElement('div');actions.className='creator-profile-actions';
    if(item.is_active){const badge=document.createElement('span');badge.className='creator-profile-active';badge.textContent=t('active');actions.appendChild(badge);}
    else{const active=document.createElement('button');active.type='button';active.dataset.activate=item.id;active.textContent=t('activate');actions.appendChild(active);}
    const edit=document.createElement('button');edit.type='button';edit.dataset.edit=item.id;edit.textContent=t('edit');
    const remove=document.createElement('button');remove.type='button';remove.dataset.delete=item.id;remove.textContent=t('remove');
    actions.append(edit,remove);row.append(meta,actions);list.appendChild(row);
  }
}
async function reload(){
  const {data:sessionData,error:sessionError}=await client.auth.getSession();
  if(sessionError)throw sessionError;
  session=sessionData?.session||null;
  if(!session)return;
  const {data:profile,error:profileError}=await client.from('profiles').select('plan').eq('id',session.user.id).single();
  if(profileError)throw profileError;
  plan=profile?.plan==='pro'?'pro':'free';
  root.dataset.proState=plan;
  locked.hidden=plan==='pro';content.hidden=plan!=='pro';
  if(plan!=='pro'){items=[];render();return;}
  const {data,error}=await client.from('creator_profiles').select('id,name,settings,is_active,updated_at').eq('user_id',session.user.id).order('updated_at',{ascending:false});
  if(error)throw error;
  items=data||[];render();
}
form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!session||plan!=='pro')return;
  const name=nameInput.value.trim().slice(0,60);
  if(!name){say(t('name'),true);return;}
  if(!editingId&&items.length>=MAX){say(t('limit'),true);return;}
  save.disabled=true;say('');
  try{
    if(editingId){
      const {error}=await client.from('creator_profiles').update({name,settings:currentSettings()}).eq('id',editingId).eq('user_id',session.user.id);
      if(error)throw error;
      window.DroopAnalytics?.track?.('pro_creator_profile_save');say(t('updated'));
    }else{
      const {error}=await client.from('creator_profiles').insert({user_id:session.user.id,name,settings:currentSettings(),is_active:items.length===0});
      if(error)throw error;
      window.DroopAnalytics?.track?.('pro_creator_profile_save');say(t('saved'));
    }
    resetForm();await reload();
  }catch(error){console.error('Droop Creator Profile save failed',error);say(error?.message||t('error'),true);}
  finally{save.disabled=false;}
});
cancel.addEventListener('click',()=>{resetForm();say('');});
list.addEventListener('click',async event=>{
  const edit=event.target.closest('[data-edit]');
  if(edit){const item=items.find(x=>x.id===edit.dataset.edit);if(item)setEditing(item);return;}
  const activate=event.target.closest('[data-activate]');
  if(activate){
    try{const {error}=await client.rpc('set_my_active_creator_profile',{p_profile_id:activate.dataset.activate});if(error)throw error;window.DroopAnalytics?.track?.('pro_creator_profile_activate');await reload();say(t('activated'));}catch(error){say(error?.message||t('error'),true);}return;
  }
  const remove=event.target.closest('[data-delete]');
  if(remove){
    if(!confirm(t('confirm')))return;
    try{const {error}=await client.from('creator_profiles').delete().eq('id',remove.dataset.delete).eq('user_id',session.user.id);if(error)throw error;window.DroopAnalytics?.track?.('pro_creator_profile_delete');if(editingId===remove.dataset.delete)resetForm();await reload();say(t('deleted'));}catch(error){say(error?.message||t('error'),true);}
  }
});
document.querySelector('#account-lang')?.addEventListener('click',()=>setTimeout(applyCopy,0));
client.auth.onAuthStateChange(()=>setTimeout(()=>reload().catch(error=>console.warn('[creator profiles]',error)),0));
applyCopy();
reload().catch(error=>{console.warn('[creator profiles]',error);say(t('error'),true);});
})();