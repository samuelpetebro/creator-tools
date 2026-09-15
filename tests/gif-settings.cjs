const assert=require('node:assert/strict');const {selection,size,commands}=require('../js/tools/gif-settings.js');
for(const args of [[NaN,0,1],[2,1,2],[20,0,11],[2,-1,1],[2,0,0]])assert.throws(()=>selection(...args));
assert.deepEqual(selection(2,.5,1.5),{start:.5,length:1.5});
for(const [w,h] of [[1920,1080],[1080,1920],[800,800]]){const s=size(w,h,480);assert(Math.max(s.w,s.h)<=480);assert(Math.abs(s.w/s.h-w/h)<.02);}
const cmds=commands(.5,1,270,480,10);assert(cmds[1].includes('0'));assert(cmds[1].includes('-loop'));
if(process.argv[2]){
 const {execFileSync}=require('node:child_process');const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'droop-gif-'));fs.copyFileSync(process.argv[2],path.join(dir,'input'));
 try{for(const cmd of cmds)execFileSync('ffmpeg',['-v','error',...cmd],{cwd:dir});
 const data=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json','output.gif'],{cwd:dir}));
 assert.equal(data.streams[0].width,270);assert.equal(data.streams[0].height,480);assert.equal(+data.streams[0].nb_read_frames,10);assert(Math.abs(+data.format.duration-1)<.11);
 const bytes=fs.readFileSync(path.join(dir,'output.gif'));assert(bytes.includes(Buffer.from('NETSCAPE2.0')));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
console.log('PASS selection bounds, output sizes, GIF filter arguments'+(process.argv[2]?', native encoding, frame count, duration and looping.':'.'));
