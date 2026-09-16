/* Pinned small 2x model; one worker per job so cancel releases the entire engine. */
'use strict';
self.onmessage=async({data})=>{
 try{
  const started=performance.now();
  const {width,height,rgb}=data;
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>512||height>512||rgb.length!==width*height*3)throw Error('INPUT');
  importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.11.0/dist/tf.min.js','https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.11.0/dist/tf-backend-wasm.min.js','https://cdn.jsdelivr.net/npm/upscaler@1.0.0/dist/browser/umd/upscaler.min.js');
  tf.wasm.setWasmPaths('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.11.0/dist/');
  tf.wasm.setThreadsCount(1);
  await tf.setBackend('wasm');await tf.ready();
  const engine=new Upscaler({model:{path:'https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-slim@1.0.0/models/x2/model.json',scale:2,modelType:'layers',inputRange:[0,255],outputRange:[0,255]}});
  const input=tf.tensor3d(rgb,[height,width,3],'int32');
  const result=await engine.upscale(input,{output:'tensor',patchSize:32,padding:4,progress:p=>self.postMessage({type:'progress',value:Math.round(p*100)})});
  const values=await result.data();const pixels=new Uint8ClampedArray(width*height*16);
  for(let i=0,j=0;i<values.length;i+=3,j+=4){pixels[j]=values[i];pixels[j+1]=values[i+1];pixels[j+2]=values[i+2];pixels[j+3]=255;}
  console.info("[droop upscale]",JSON.stringify({width,height,elapsedMs:Math.round(performance.now()-started),tensorBytes:tf.memory().numBytes}));
  input.dispose();result.dispose();await engine.dispose();self.postMessage({type:'done',pixels,width:width*2,height:height*2},[pixels.buffer]);
 }catch(error){console.error('[droop upscale]',error);self.postMessage({type:'error'});}
};
