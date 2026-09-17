/* Small, fail-open adapter: media processing never depends on analytics. */
(()=>{
'use strict';
const noop=()=>{};window.DroopAnalytics=Object.freeze({start:noop,finish:noop});
const config=window.DroopAnalyticsConfig||{};
const paths=['/','/index.html','/make-it-fit.html','/under-x-mb.html','/release-pack.html','/metadata-cleaner.html','/image-converter.html','/background-remover.html','/video-under-x-mb.html','/video-trimmer.html','/extract-audio/','/extract-audio/index.html','/audio-converter.html','/audio-trimmer.html','/safe-zones.html','/video-cropper.html','/thumbnail-maker.html','/video-to-gif.html','/subtitle-burner.html','/image-upscaler.html','/pro.html'];
if(location.hostname!=='droopweb.lat'||!paths.includes(location.pathname)||navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true)return;
if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(config.websiteId||''))return;
let trackerURL;try{trackerURL=new URL(config.scriptUrl);if(trackerURL.protocol!=='https:'||trackerURL.username||trackerURL.password||trackerURL.search||trackerURL.hash)return;}catch(_){return;}
function permitted(){try{return navigator.doNotTrack!=='1'&&navigator.globalPrivacyControl!==true&&localStorage.getItem('droop-analytics-disabled')!=='1';}catch(_){return false;}}
if(!permitted())return;
const path=location.pathname==='/index.html'?'/':location.pathname.replace('/extract-audio/index.html','/extract-audio/');
const tool=path==='/'?'home':path.split('/').filter(Boolean)[0].replace('.html','');
const names=new Set(['process_start','process_complete','process_error','process_cancel','download_click','cta_account','cta_plans','cta_pro_early_access']);
let loaded=false,failed=false,running=false,queue=[];
const payload=name=>{
 let referrer='';try{const u=new URL(document.referrer);if(/^https?:$/.test(u.protocol)&&u.hostname!==location.hostname)referrer=u.origin;}catch(_){}
 const value={website:config.websiteId,hostname:'droopweb.lat',url:path,title:tool,language:document.documentElement.lang==='es'?'es':'en',referrer};
 if(name){value.name=name;value.data={tool};}return value;
};
// Return a fresh allowlisted payload, never forward DOM text, filenames, query strings or arbitrary properties.
window.droopAnalyticsBeforeSend=(type,data)=>permitted()&&type==='event'&&(!data.name||names.has(data.name))?payload(data.name):false;
function send(name){try{if(failed||!permitted())return;if(!loaded){if(queue.length<30)queue.push(name);return;}Promise.resolve(window.umami.track(payload(name))).catch(noop);}catch(_){}}
window.DroopAnalytics=Object.freeze({start(){if(running)return;running=true;send('process_start');},finish(outcome){if(!running||!['complete','error','cancel'].includes(outcome))return;running=false;send('process_'+outcome);}});
const script=document.createElement('script');script.src=trackerURL.href;script.async=true;script.referrerPolicy='no-referrer';
for(const [key,value] of Object.entries({'data-website-id':config.websiteId,'data-auto-track':'false','data-exclude-search':'true','data-exclude-hash':'true','data-do-not-track':'true','data-before-send':'droopAnalyticsBeforeSend','data-performance':'true'}))script.setAttribute(key,value);
const timeout=setTimeout(()=>{failed=true;queue=[];},10000);
script.onload=()=>{clearTimeout(timeout);if(failed||typeof window.umami?.track!=='function'){failed=true;queue=[];return;}loaded=true;send();const pending=queue;queue=[];pending.forEach(send);};
script.onerror=()=>{clearTimeout(timeout);failed=true;queue=[];};
document.addEventListener('click',event=>{const link=event.target.closest?.('a[download]');if(link&&/^(blob:|data:image\/|data:audio\/|data:video\/)/.test(link.getAttribute('href')||''))send('download_click');},true);
document.addEventListener('click',event=>{const target=event.target.closest?.('[data-droop-event]');const name=target?.getAttribute('data-droop-event');if(name&&names.has(name))send(name);},true);
document.head.appendChild(script);
})();
