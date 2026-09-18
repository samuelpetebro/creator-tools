(()=>{'use strict';

const cfg=window.DroopSupabaseConfig||{};
const CDN='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
let client=null,state={authenticated:false,plan:'free',isPro:false,user:null};

const loadScript=src=>new Promise((resolve,reject)=>{
  if(window.supabase){resolve();return;}
  const existing=[...document.scripts].find(s=>s.src===src);
  if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}
  const script=document.createElement('script');
  script.src=src;
  script.onload=resolve;
  script.onerror=reject;
  document.head.appendChild(script);
});

const refresh=async()=>{
  if(!cfg.url||!cfg.anonKey)return state;
  if(!window.supabase)await loadScript(CDN);
  if(!client)client=window.supabase.createClient(cfg.url,cfg.anonKey);
  const {data,error}=await client.auth.getSession();
  if(error)throw error;
  const session=data?.session||null;
  if(!session){state={authenticated:false,plan:'free',isPro:false,user:null};return state;}
  const {data:profile,error:profileError}=await client.from('profiles').select('plan').eq('id',session.user.id).single();
  if(profileError)throw profileError;
  const plan=profile?.plan==='pro'?'pro':'free';
  state={authenticated:true,plan,isPro:plan==='pro',user:session.user};
  return state;
};

const isEs=()=>{try{return (localStorage.getItem('droop-language')||navigator.language||'en').toLowerCase().startsWith('es');}catch(_){return false;}};
const copy=()=>{
  const es=isEs();
  return es?{
    locked:'Esta función está incluida en Droop Pro.',
    guest:'Iniciá sesión para comprobar tu acceso Pro.',
    compare:'Ver Pro · USD 5/mes'
  }:{
    locked:'This feature is included with Droop Pro.',
    guest:'Sign in to check your Pro access.',
    compare:'See Pro · USD 5/month'
  };
};

const render=async(root)=>{
  if(!root)return null;
  let current=state;
  try{current=await refresh();}catch(error){console.warn('[droop pro access]',error);}
  const locked=root.querySelector('[data-pro-locked]');
  const content=root.querySelector('[data-pro-content]');
  const note=root.querySelector('[data-pro-note]');
  const c=copy(),es=isEs();
  root.querySelectorAll('[data-pro-en][data-pro-es]').forEach(el=>{el.textContent=es?el.dataset.proEs:el.dataset.proEn;});
  root.dataset.proState=current.isPro?'pro':current.authenticated?'free':'guest';
  if(locked)locked.hidden=current.isPro;
  if(content)content.hidden=!current.isPro;
  if(note&&!current.isPro)note.textContent=current.authenticated?c.locked:c.guest;
  const link=root.querySelector('[data-pro-compare]');
  if(link)link.textContent=c.compare;
  return current;
};

const ready=(async()=>{
  try{return await refresh();}catch(error){console.warn('[droop pro access]',error);return state;}
})();

window.DroopProAccess=Object.freeze({
  ready,
  refresh,
  render,
  get state(){return state;},
  get client(){return client;}
});
})();