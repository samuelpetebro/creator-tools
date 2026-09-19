(()=>{'use strict';
async function run(){
  const accessApi=window.DroopProAccess;
  if(!accessApi)return;
  const access=await accessApi.ready;
  if(!access?.isPro||!accessApi.client)return;
  const client=accessApi.client;
  const {data,error}=await client.from('creator_profiles').select('name,settings').eq('user_id',access.user.id).eq('is_active',true).maybeSingle();
  if(error||!data)return;
  const settings=data.settings&&typeof data.settings==='object'&&!Array.isArray(data.settings)?data.settings:{};
  const destinations=new Set(['youtube','instagram-post','instagram-story','spotify','discord-avatar']);
  const packs=new Set(['music','youtube','social','profile']);
  const qualities=new Set(['75','85','92']);
  let applied=false;
  const make=document.querySelector('#presetSelect');
  if(make&&destinations.has(settings.make_it_fit_destination)){make.value=settings.make_it_fit_destination;make.dispatchEvent(new Event('change',{bubbles:true}));applied=true;}
  const pack=document.querySelector('#packSelect');
  if(pack&&packs.has(settings.release_pack)){pack.value=settings.release_pack;pack.dispatchEvent(new Event('change',{bubbles:true}));applied=true;}
  const prefix=document.querySelector('#customPackPrefix');
  if(prefix&&typeof settings.filename_prefix==='string'){prefix.value=settings.filename_prefix.slice(0,50);applied=true;}
  const quality=document.querySelector('#customPackQuality');
  const q=String(settings.jpeg_quality||'');
  if(quality&&qualities.has(q)){quality.value=q;applied=true;}
  if(!applied)return;
  const panel=document.querySelector('.tool-panel');
  if(panel&&!panel.querySelector('.creator-profile-applied')){
    const note=document.createElement('p');note.className='creator-profile-applied';
    const es=(()=>{try{return (localStorage.getItem('droop-language')||navigator.language||'en').toLowerCase().startsWith('es');}catch(_){return false;}})();
    note.textContent=es?`Perfil de creador activo: ${data.name}`:`Active Creator Profile: ${data.name}`;
    panel.prepend(note);
  }
  window.DroopAnalytics?.track?.('pro_creator_profile_apply');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>run().catch(error=>console.warn('[creator profile apply]',error)),{once:true});
else run().catch(error=>console.warn('[creator profile apply]',error));
})();