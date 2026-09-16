/* Loader for new video tools. Job owns its worker and abort signal. */
(()=>{
'use strict';
async function load(job,isCurrent){
 function check(){if(!isCurrent()||job.controller.signal.aborted)throw Error('CANCELED');}
 let mod;try{mod=await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');}catch(e){check(job);mod=await import('https://esm.sh/@ffmpeg/ffmpeg@0.12.10');}check(job);
 const worker=new URL('js/vendor/ffmpeg-worker.js',document.baseURI).href;
 let error;
 for(const base of ['https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm','https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm']){
  check(job);const engine=new mod.FFmpeg();job.engine=engine;const urls=[];
  try{for(const name of ['ffmpeg-core.js','ffmpeg-core.wasm']){const response=await fetch(`${base}/${name}`,{signal:job.controller.signal});if(!response.ok)throw Error('LOAD_FAILED');const data=await response.arrayBuffer();check(job);urls.push(URL.createObjectURL(new Blob([data],{type:name.endsWith('.js')?'text/javascript':'application/wasm'})));}
   await engine.load({classWorkerURL:worker,coreURL:urls[0],wasmURL:urls[1]});check(job);return engine;
  }catch(e){engine.terminate();check(job);error=e;}finally{urls.forEach(u=>URL.revokeObjectURL(u));}
 }
 throw error;
}
window.DroopVideoEngine={load};
})();
