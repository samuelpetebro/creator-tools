const assert=require('node:assert/strict'),F=require('../js/tools/subtitle-format.js');
const srt='\uFEFF1\r\n00:00:00,200 --> 00:00:01,000\r\nHola, canción ñ\r\n\r\n2\r\n00:00:01,100 --> 00:00:01,800\r\nSegunda línea';
const cues=F.parse(srt);assert.equal(cues.length,2);assert.equal(cues[0].start,.2);assert.equal(cues[0].text,'Hola, canción ñ');
assert.throws(()=>F.parse('not an SRT'));assert.throws(()=>F.parse('1\n00:99:00,000 --> 00:00:01,000\na'));assert.throws(()=>F.validate([{start:1,end:2,text:'a'},{start:1.5,end:3,text:'b'}],4));assert.throws(()=>F.validate(cues,1));assert.throws(()=>F.validate([{start:0,end:1,text:''}],2));
assert.equal(F.stamp(59.999),'0:01:00.00');const ass=F.ass(cues,360,640,'outline','bottom','medium');assert(ass.includes('Hola, canción ñ'));assert(!F.ass([{start:0,end:1,text:'{\\an8} hi'}],360,640,'outline','bottom','medium').includes('{\\an8}'));
if(process.argv[2]){
 const {execFileSync}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'droop-sub-'));fs.writeFileSync(path.join(dir,'captions.ass'),ass);
 try{execFileSync('ffmpeg',['-v','error','-i',path.resolve(process.argv[2]),'-vf',`scale=360:640,ass=captions.ass:fontsdir=${path.resolve('assets/fonts')}`,'-c:v','libx264','-preset','ultrafast','-c:a','aac','-y','output.mp4'],{cwd:dir});const data=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json','output.mp4'],{cwd:dir}));assert(data.streams.some(s=>s.codec_type==='audio'));assert(data.streams.some(s=>s.width===360&&s.height===640));
 if(process.argv[3])fs.copyFileSync(path.join(dir,'output.mp4'),path.resolve(process.argv[3]));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
console.log('PASS SRT BOM/CRLF/Unicode, timing validation, overlap rejection, ASS injection neutralization'+(process.argv[2]?', native encode and retained audio.':'.'));
