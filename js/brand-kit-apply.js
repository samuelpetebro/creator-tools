(()=>{'use strict';

const safePrefix=value=>String(value||'').trim().replace(/\s+/g,'-').replace(/[^a-z0-9_-]+/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,50);
const safeHex=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(String(value||''))?String(value).toLowerCase():fallback;
const isEs=()=>{try{return (localStorage.getItem('droop-language')||navigator.language||'en').toLowerCase().startsWith('es');}catch(_){return false;}};

async function run(){
  const accessApi=window.DroopProAccess;
  if(!accessApi)return;
  const access=await accessApi.ready;
  if(!access?.isPro||!accessApi.client)return;
  const {data,error}=await accessApi.client.from('brand_kits').select('name,settings').eq('user_id',access.user.id).eq('is_active',true).maybeSingle();
  if(error||!data)return;
  const raw=data.settings&&typeof data.settings==='object'&&!Array.isArray(data.settings)?data.settings:{};
  const settings={filename_prefix:safePrefix(raw.filename_prefix),primary_color:safeHex(raw.primary_color,'#6c63ff'),secondary_color:safeHex(raw.secondary_color,'#111111')};
  const root=document.documentElement;
  root.dataset.droopBrandPrefix=settings.filename_prefix;
  root.dataset.droopBrandPrimary=settings.primary_color;
  root.dataset.droopBrandSecondary=settings.secondary_color;
  let applied=false;
  const thumbColor=document.querySelector('#thumbColor');
  if(thumbColor){thumbColor.value=settings.primary_color;thumbColor.dispatchEvent(new Event('input',{bubbles:true}));applied=true;}
  const customPrefix=document.querySelector('#customPackPrefix');
  if(customPrefix&&settings.filename_prefix){customPrefix.value=settings.filename_prefix;customPrefix.dispatchEvent(new Event('input',{bubbles:true}));applied=true;}
  if(!applied&&!(document.querySelector('#packSelect')||document.querySelector('#thumbCanvas')))return;
  const panel=document.querySelector('.tool-panel');
  if(panel&&!panel.querySelector('.brand-kit-applied')){
    const note=document.createElement('p');note.className='creator-profile-applied brand-kit-applied';
    note.textContent=isEs()?'Kit de marca activo: '+data.name:'Active Brand Kit: '+data.name;
    panel.prepend(note);
  }
  window.dispatchEvent(new CustomEvent('droop:brand-kit-applied',{detail:{name:data.name,settings}}));
  window.DroopAnalytics?.track?.('pro_brand_kit_apply');
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>run().catch(error=>console.warn('[brand kit apply]',error)),{once:true});
else run().catch(error=>console.warn('[brand kit apply]',error));
})();