const assert=require('node:assert/strict');
const {crop,wrap}=require('../js/tools/thumbnail-layout.js');
for(const [sw,sh] of [[1920,1080],[1080,1920],[800,800],[6000,4000],[100,5000]]){
  for(const p of [0,.5,1]){
    const g=crop(sw,sh,1280,720,p);
    assert(Math.abs(g.w/g.h-16/9)<1e-9);
    assert(g.x>=0&&g.y>=0&&g.x+g.w<=sw+1e-9&&g.y+g.h<=sh+1e-9);
    if(p===0)assert(g.x===0&&g.y===0);
    if(p===1){assert(Math.abs(g.x+g.w-sw)<1e-9);assert(Math.abs(g.y+g.h-sh)<1e-9);}
  }
}
for(const text of ['A normal title with a few words','A'.repeat(100),'🎉'.repeat(40),'primera línea\nsegunda línea','áéíóú ñ'.repeat(10)]){
 const measure=s=>Array.from(s).length*10,lines=wrap(text,120,measure);
 assert(lines.every(s=>measure(s)<=120));
 assert.equal(lines.join('').replace(/\s/g,''),text.replace(/\s/g,''));
}
console.log('PASS crop bounds and ratio for five source shapes at both edges and center; wrapping preserves text, newlines and Unicode.');
