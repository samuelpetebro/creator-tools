(()=>{'use strict';

const cfg=window.DroopSupabaseConfig||{};
const CDN='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
const FREE_LIMIT=5;
const PRO_LIMIT=100;
const lang=(()=>{try{return (localStorage.getItem('droop-language')||localStorage.getItem('droop-lang')||navigator.language||'en').toLowerCase().startsWith('es')?'es':'en';}catch(_){return 'en';}})();
const copy={
  en:{title:'Saved presets',account:'Account',intro:'Save reusable settings only. Your media is never uploaded.',signin:'Sign in to save presets',choose:'Choose a preset…',load:'Load',delete:'Delete',name:'Preset name',save:'Save current settings',used:'presets used',noSettings:'This tool has no reusable settings yet.',saving:'Saving…',saved:'Preset saved.',chooseFirst:'Choose a preset first.',loaded:'loaded.',confirm:'Delete',deleted:'Preset deleted.',loadError:'Could not load presets.',saveError:'Could not save preset.',deleteError:'Could not delete preset.'},
  es:{title:'Presets guardados',account:'Cuenta',intro:'Guardá solo configuraciones reutilizables. Tus archivos nunca se suben.',signin:'Iniciá sesión para guardar presets',choose:'Elegí un preset…',load:'Cargar',delete:'Eliminar',name:'Nombre del preset',save:'Guardar configuración actual',used:'presets usados',noSettings:'Esta herramienta todavía no tiene configuraciones reutilizables.',saving:'Guardando…',saved:'Preset guardado.',chooseFirst:'Primero elegí un preset.',loaded:'cargado.',confirm:'¿Eliminar',deleted:'Preset eliminado.',loadError:'No se pudieron cargar los presets.',saveError:'No se pudo guardar el preset.',deleteError:'No se pudo eliminar el preset.'}
};
const t=key=>copy[lang][key]||copy.en[key]||key;
let client=null;
let session=null;
let profile=null;

const loadScript=src=>new Promise((resolve,reject)=>{
  if(window.supabase){resolve();return;}
  const existing=[...document.scripts].find(s=>s.src===src);
  if(existing){
    existing.addEventListener('load',resolve,{once:true});
    existing.addEventListener('error',reject,{once:true});
    return;
  }
  const script=document.createElement('script');
  script.src=src;
  script.onload=resolve;
  script.onerror=reject;
  document.head.appendChild(script);
});

const toolSlug=()=>{
  const parts=location.pathname.split('/').filter(Boolean);
  let last=parts.pop()||'home';
  if(last==='index.html'&&parts.length)last=parts.pop();
  return last.replace(/\.html$/,'')||'home';
};

const ensureClient=async()=>{
  if(client)return client;
  if(!cfg.url||!cfg.anonKey)throw new Error('Droop account configuration is missing.');
  if(!window.supabase)await loadScript(CDN);
  client=window.supabase.createClient(cfg.url,cfg.anonKey);
  return client;
};

const refreshSession=async()=>{
  const c=await ensureClient();
  const {data,error}=await c.auth.getSession();
  if(error)throw error;
  session=data.session;
  return session;
};

const getProfile=async(force=false)=>{
  if(profile&&!force)return profile;
  const s=await refreshSession();
  if(!s){profile=null;return null;}
  const c=await ensureClient();
  const {data,error}=await c.from('profiles')
    .select('id,email,display_name,plan,updated_at')
    .eq('id',s.user.id)
    .single();
  if(error)throw error;
  profile=data;
  return data;
};

const listPresets=async(slug=null)=>{
  const s=await refreshSession();
  if(!s)return [];
  const c=await ensureClient();
  let q=c.from('presets')
    .select('id,user_id,tool_slug,name,settings,created_at,updated_at')
    .eq('user_id',s.user.id)
    .order('updated_at',{ascending:false});
  if(slug)q=q.eq('tool_slug',slug);
  const {data,error}=await q;
  if(error)throw error;
  return data||[];
};

const savePreset=async(name,settings,slug=toolSlug())=>{
  const clean=String(name||'').trim().slice(0,60);
  if(!clean)throw new Error('Give the preset a name first.');
  const s=await refreshSession();
  if(!s)throw new Error('Sign in to save presets.');
  const c=await ensureClient();

  const {data:existing,error:findError}=await c.from('presets')
    .select('id')
    .eq('user_id',s.user.id)
    .eq('tool_slug',slug)
    .eq('name',clean)
    .maybeSingle();
  if(findError)throw findError;

  if(existing?.id){
    const {data,error}=await c.from('presets')
      .update({settings})
      .eq('id',existing.id)
      .select()
      .single();
    if(error)throw error;
    return data;
  }

  const {data,error}=await c.from('presets')
    .insert({user_id:s.user.id,tool_slug:slug,name:clean,settings})
    .select()
    .single();
  if(error)throw error;
  return data;
};

const deletePreset=async id=>{
  const s=await refreshSession();
  if(!s)throw new Error('Sign in first.');
  const c=await ensureClient();
  const {error}=await c.from('presets')
    .delete()
    .eq('id',id)
    .eq('user_id',s.user.id);
  if(error)throw error;
};

const reusableControls=(root=document)=>[...root.querySelectorAll('.controls select,.controls input,.controls textarea,[data-droop-preset]')]
  .filter(el=>!el.closest('.droop-presets')&&el.type!=='file'&&el.type!=='button'&&el.type!=='submit');

const captureSettings=(root=document)=>{
  const settings={};
  reusableControls(root).forEach((el,index)=>{
    const key=el.id||el.name||`control_${index}`;
    settings[key]=(el.type==='checkbox'||el.type==='radio')?!!el.checked:el.value;
  });
  return settings;
};

const applySettings=(settings,root=document)=>{
  if(!settings||typeof settings!=='object')return;
  reusableControls(root).forEach((el,index)=>{
    const key=el.id||el.name||`control_${index}`;
    if(!(key in settings))return;
    if(el.type==='checkbox'||el.type==='radio')el.checked=!!settings[key];
    else el.value=String(settings[key]);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  });
};

const limitForPlan=plan=>plan==='pro'?PRO_LIMIT:FREE_LIMIT;
const escapeHtml=value=>String(value).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

const mountPresetWidget=async()=>{
  const panel=document.querySelector('.tool-panel');
  if(!panel||document.querySelector('.droop-presets')||!reusableControls(panel).length)return;

  const box=document.createElement('section');
  box.className='droop-presets';
  box.innerHTML=`
    <div class="droop-presets-head">
      <div><span class="droop-presets-kicker">DROOP ACCOUNT</span><strong>${t('title')}</strong></div>
      <a href="/account.html">${t('account')}</a>
    </div>
    <p class="droop-presets-copy">${t('intro')}</p>
    <div class="droop-presets-guest" hidden>
      <a href="/account.html" class="droop-presets-signin">${t('signin')}</a>
    </div>
    <div class="droop-presets-user" hidden>
      <div class="droop-presets-loadrow">
        <select aria-label="${t('title')}"><option value="">${t('choose')}</option></select>
        <button type="button" data-action="load">${t('load')}</button>
        <button type="button" data-action="delete" class="is-secondary">${t('delete')}</button>
      </div>
      <div class="droop-presets-saverow">
        <input type="text" maxlength="60" placeholder="${t('name')}" aria-label="${t('name')}">
        <button type="button" data-action="save">${t('save')}</button>
      </div>
      <span class="droop-presets-usage"></span>
    </div>
    <p class="droop-presets-status" role="status" aria-live="polite"></p>`;
  panel.appendChild(box);

  const guest=box.querySelector('.droop-presets-guest');
  const user=box.querySelector('.droop-presets-user');
  const select=box.querySelector('select');
  const input=box.querySelector('input');
  const usage=box.querySelector('.droop-presets-usage');
  const status=box.querySelector('.droop-presets-status');
  const slug=toolSlug();
  let current=[];

  const say=(msg,error=false)=>{
    status.textContent=msg||'';
    status.dataset.state=error?'error':'ok';
  };

  const reload=async()=>{
    try{
      const s=await refreshSession();
      guest.hidden=!!s;
      user.hidden=!s;
      if(!s){say('');return;}
      const [p,toolPresets,all]=await Promise.all([getProfile(true),listPresets(slug),listPresets()]);
      current=toolPresets;
      select.innerHTML=`<option value="">${t('choose')}</option>`+
        current.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
      const plan=p?.plan||'free';
      usage.textContent=`${plan.toUpperCase()} · ${all.length}/${limitForPlan(plan)} ${t('used')}`;
    }catch(err){
      say(err.message||t('loadError'),true);
    }
  };

  box.querySelector('[data-action="save"]').addEventListener('click',async()=>{
    const settings=captureSettings(panel);
    if(!Object.keys(settings).length){
      say(t('noSettings'),true);
      return;
    }
    try{
      say(t('saving'));
      await savePreset(input.value,settings,slug);
      input.value='';
      await reload();
      window.DroopAnalytics?.track?.('preset_save');
      say(t('saved'));
    }catch(err){
      say(err.message||t('saveError'),true);
    }
  });

  box.querySelector('[data-action="load"]').addEventListener('click',()=>{
    const chosen=current.find(p=>p.id===select.value);
    if(!chosen){say(t('chooseFirst'),true);return;}
    applySettings(chosen.settings,panel);
    window.DroopAnalytics?.track?.('preset_load');
    say(`${chosen.name} ${t('loaded')}`);
  });

  box.querySelector('[data-action="delete"]').addEventListener('click',async()=>{
    const chosen=current.find(p=>p.id===select.value);
    if(!chosen){say('Choose a preset first.',true);return;}
    if(!confirm(lang==='es'?`${t('confirm')} "${chosen.name}"?`:`${t('confirm')} "${chosen.name}"?`))return;
    try{
      await deletePreset(chosen.id);
      await reload();
      window.DroopAnalytics?.track?.('preset_delete');
      say(t('deleted'));
    }catch(err){
      say(err.message||t('deleteError'),true);
    }
  });

  const c=await ensureClient();
  c.auth.onAuthStateChange(()=>setTimeout(reload,0));
  await reload();
};

const ready=(async()=>{
  try{
    const c=await ensureClient();
    await refreshSession();
    if(document.readyState==='loading'){
      await new Promise(r=>document.addEventListener('DOMContentLoaded',r,{once:true}));
    }
    await mountPresetWidget();
    return c;
  }catch(err){
    console.warn('[droop cloud]',err);
    return null;
  }
})();

window.DroopCloud=Object.freeze({
  ready,
  get client(){return client;},
  get session(){return session;},
  toolSlug,
  getProfile,
  listPresets,
  savePreset,
  deletePreset,
  captureSettings,
  applySettings,
  limitForPlan,
  refreshSession
});
})();