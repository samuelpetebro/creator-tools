const fs=require('fs');
const assert=require('assert');

const manifest=JSON.parse(fs.readFileSync('site.webmanifest','utf8'));
assert.equal(manifest.id,'/','manifest should have a stable app id');
assert.equal(manifest.start_url,'/','manifest should launch at the homepage');
assert.equal(manifest.scope,'/','manifest should cover the whole site');
assert.equal(manifest.display,'standalone','manifest should use standalone display mode');
assert.equal(manifest.prefer_related_applications,false,'web install should not redirect to an app store');

const icons=manifest.icons||[];
assert(icons.some(x=>x.sizes==='192x192'&&x.type==='image/png'),'manifest needs a 192px PNG');
assert(icons.some(x=>x.sizes==='512x512'&&x.type==='image/png'&&x.purpose==='any'),'manifest needs a 512px PNG');
assert(icons.some(x=>x.sizes==='512x512'&&x.type==='image/png'&&String(x.purpose).includes('maskable')),'manifest needs a maskable 512px PNG');

for(const file of ['icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png']){
  assert(fs.existsSync(file),`${file} must exist`);
  assert(fs.statSync(file).size>1000,`${file} should not be an empty placeholder`);
}

const htmlFiles=fs.readdirSync('.').filter(x=>x.endsWith('.html')).concat(['extract-audio/index.html']);
for(const file of htmlFiles){
  const html=fs.readFileSync(file,'utf8');
  assert(html.includes('viewport-fit=cover'),`${file} must support mobile safe areas`);
  assert(html.includes('rel="apple-touch-icon" href="/icons/apple-touch-icon.png"'),`${file} must expose the iOS home-screen icon`);
}

console.log('pwa/mobile static checks: ok');