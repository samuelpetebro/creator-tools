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
function pngDimensions(body){
  if(!Buffer.isBuffer(body)||body.length<24)throw Error('invalid PNG payload');
  const signature='89504e470d0a1a0a';
  if(body.subarray(0,8).toString('hex')!==signature)throw Error('invalid PNG signature');
  if(body.subarray(12,16).toString('ascii')!=='IHDR')throw Error('PNG missing IHDR');
  return {width:body.readUInt32BE(16),height:body.readUInt32BE(20)};
}
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
  if(manifest.id!=='/'||manifest.start_url!=='/'||manifest.scope!=='/'||manifest.display!=='standalone')throw Error('manifest install fields missing');
  if(!manifest.name||!manifest.short_name||manifest.prefer_related_applications!==false)throw Error('manifest identity fields missing');
  if(!(manifest.icons||[]).some(x=>x.sizes==='192x192'&&x.purpose==='any'))throw Error('manifest 192px icon missing');
  if(!(manifest.icons||[]).some(x=>x.sizes==='512x512'&&x.purpose==='any'))throw Error('manifest 512px icon missing');
  if(!(manifest.icons||[]).some(x=>x.sizes==='512x512'&&String(x.purpose||'').split(/\\s+/).includes('maskable')))throw Error('manifest maskable icon missing');

  for(const [path,width,height] of [
    ['/icons/icon-192.png',192,192],
    ['/icons/icon-512.png',512,512],
    ['/icons/icon-maskable-512.png',512,512]
  ]){
    const r=await get(path);
    if(r.response.status!==200||!r.type.includes('image/png')||r.body.length<1000)throw Error(`${path} is not a valid deployed PNG`);
    const size=pngDimensions(r.body);
    if(size.width!==width||size.height!==height)throw Error(`${path} has unexpected dimensions ${size.width}x${size.height}`);
  }
  const apple=await get('/icons/apple-touch-icon.png');
  if(apple.response.status!==200||!apple.type.includes('image/png')||apple.body.length<1000)throw Error('apple touch icon is not a valid deployed PNG');

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