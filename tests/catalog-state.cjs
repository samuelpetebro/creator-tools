const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function boot(storage){
 const nodes=new Map();const node=key=>{if(!nodes.has(key))nodes.set(key,{value:'',dataset:{},attrs:{},listeners:{},classList:{toggle(){}},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,fn){this.listeners[k]=fn},querySelector:s=>node(s)});return nodes.get(key)};
 const tabs=['all','image','video','audio','social'].map(filter=>Object.assign(node(filter),{dataset:{filter}}));const old=node('#tool-catalog');old.querySelectorAll=()=>tabs;
 const doc={readyState:'complete',documentElement:{},querySelector:s=>s==='#tool-catalog'?old:s==='.lang-switch'?node(s):null,querySelectorAll:()=>[]};
 vm.runInNewContext(fs.readFileSync('js/home-catalog.js','utf8'),{document:doc,navigator:{language:'es-AR'},localStorage:storage,setTimeout:fn=>fn()});return {node,tabs,doc};
}
for(const storage of [{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}},{getItem:()=> 'garbage',setItem(){}},{getItem:()=> 'toString',setItem(){}}]){
 const {node,tabs,doc}=boot(storage);assert.equal(doc.documentElement.lang,'es');assert.equal((node('#catalogGrid').innerHTML.match(/class="catalog-card /g)||[]).length,17);
 node('#catalogSearch').value='subtitulos';node('#catalogSearch').listeners.input();assert(node('#catalogGrid').innerHTML.includes('subtitle-burner.html'));
 node('.lang-switch').listeners.click();assert.equal(doc.documentElement.lang,'en');assert(node('#catalogGrid').innerHTML.includes('subtitle-burner.html'));assert.equal(node('#catalogSearch').attrs['aria-label'],'Search tools…');
 tabs[1].listeners.click();assert.equal(tabs[1].attrs['aria-pressed'],'true');assert.equal(tabs[0].attrs['aria-pressed'],'false');assert.equal(node('#catalogGrid').innerHTML,'');
}
console.log('PASS blocked/invalid storage, bilingual accent-insensitive search, filter state');
