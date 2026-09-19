(()=>{'use strict';
const cfg=window.DroopSupabaseConfig||{};
const container=document.querySelector('#auth-turnstile');
const enabled=cfg.turnstileEnabled===true&&typeof cfg.turnstileSiteKey==='string'&&cfg.turnstileSiteKey.trim().length>10&&!!container;
let token='',widgetId=null,readyResolve,readyReject,pending=[];
const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});

function finishPending(value,error){
  const list=pending.splice(0);
  for(const item of list){if(error)item.reject(error);else item.resolve(value);}
}
function load(){
  if(!enabled){readyResolve(false);return;}
  container.hidden=false;
  const start=()=>{
    try{
      if(!window.turnstile)throw new Error('Turnstile failed to load');
      widgetId=window.turnstile.render(container,{
        sitekey:cfg.turnstileSiteKey.trim(),
        theme:'auto',
        appearance:'interaction-only',
        execution:'execute',
        callback:value=>{token=value||'';finishPending(token);},
        'expired-callback':()=>{token='';},
        'timeout-callback':()=>{token='';finishPending('',new Error('Security check timed out'));},
        'error-callback':()=>{token='';finishPending('',new Error('Security check failed'));return true;}
      });
      readyResolve(true);
    }catch(error){readyReject(error);}
  };
  if(window.turnstile){start();return;}
  const script=document.createElement('script');
  script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async=true;script.defer=true;script.onload=start;script.onerror=()=>readyReject(new Error('Could not load security check'));
  document.head.appendChild(script);
}
async function challenge(){
  if(!enabled)return undefined;
  await ready;
  if(token)return token;
  return new Promise((resolve,reject)=>{
    pending.push({resolve,reject});
    try{window.turnstile.execute(widgetId);}catch(error){pending=pending.filter(item=>item.resolve!==resolve);reject(error);}
  });
}
function reset(){
  token='';
  if(enabled&&widgetId!=null&&window.turnstile){try{window.turnstile.reset(widgetId);}catch(_){}}
  finishPending('',new Error('Security check reset'));
}
window.DroopAuthCaptcha=Object.freeze({enabled,ready,challenge,reset,get token(){return token;}});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();