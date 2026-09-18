const BASE=(process.env.DROOP_BASE_URL||'https://droopweb.lat').replace(/\/$/,'');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const stamp=()=>Date.now().toString(36);

async function get(path){
  const join=path.includes('?')?'&':'?';
  const url=`${BASE}${path}${join}smoke=${stamp()}`;
  const response=await fetch(url,{redirect:'follow',headers:{'user-agent':'droop-production-smoke/1.0','cache-control':'no-cache'}});
  const type=response.headers.get('content-type')||'';
  const body=type.includes('image/')?Buffer.from(await response.arrayBuffer()):await response.text();
  return {response,type,body,url};
}
function text(body){return typeof body==='string'?body:body.toString('utf8');}
async function check(){
  const home=await get('/');
  if(home.response.status!==200||!text(home.body).includes('Everything you need'))throw Error('homepage not ready');

  for(const [path,needle] of [
    ['/faq.html','Questions before'],
    ['/pro.html','DROOP PRO'],
    ['/account.html','DROOP ACCOUNT'],
    ['/sitemap.xml','<urlset'],
    ['/robots.txt','Sitemap: https://droopweb.lat/sitemap.xml']
  ]){
    const r=await get(path);
    if(r.response.status!==200||!text(r.body).includes(needle))throw Error(`${path} failed smoke check`);
  }

  const manifestRes=await get('/site.webmanifest');
  if(manifestRes.response.status!==200)throw Error('manifest unavailable');
  const manifest=JSON.parse(text(manifestRes.body));
  if(manifest.display!=='standalone'||manifest.start_url!=='/')throw Error('manifest install fields missing');
  if(!(manifest.icons||[]).some(x=>x.sizes==='192x192')||!(manifest.icons||[]).some(x=>x.sizes==='512x512'))throw Error('manifest raster icons missing');

  for(const path of ['/icons/icon-192.png','/icons/icon-512.png','/icons/icon-maskable-512.png','/icons/apple-touch-icon.png']){
    const r=await get(path);
    if(r.response.status!==200||!r.type.includes('image/png')||r.body.length<1000)throw Error(`${path} is not a valid deployed PNG`);
  }

  const missing=await get(`/smoke-missing-${stamp()}/nested/page`);
  if(missing.response.status!==404||!text(missing.body).includes('That page'))throw Error('custom 404 failed');

  const search=await get('/?q=image');
  if(search.response.status!==200||!text(search.body).includes('home-catalog.js'))throw Error('homepage search entry URL failed');

  return true;
}

let last;
for(let attempt=1;attempt<=18;attempt++){
  try{
    await check();
    console.log(`production smoke checks: ok (attempt ${attempt})`);
    process.exit(0);
  }catch(error){
    last=error;
    console.log(`attempt ${attempt}/18 not ready: ${error.message}`);
    if(attempt<18)await wait(10000);
  }
}
console.error(last);
process.exit(1);