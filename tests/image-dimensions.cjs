const assert=require('node:assert/strict'),dimensions=require('../js/tools/image-dimensions.js'),fs=require('node:fs');
function read(b){return dimensions(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));}
const png=Buffer.alloc(24);png.writeUInt32BE(0x89504e47);png.writeUInt32BE(513,16);png.writeUInt32BE(100,20);assert.deepEqual(read(png),{width:513,height:100});
const jpeg=Buffer.from([255,216,255,192,0,7,8,0,32,0,64]);assert.deepEqual(read(jpeg),{width:64,height:32});
const webp=Buffer.alloc(30);webp.write('RIFF');webp.write('WEBP',8);webp.write('VP8X',12);webp.writeUInt32LE(10,16);webp[24]=127;webp[27]=63;assert.deepEqual(read(webp),{width:128,height:64});
for(const b of [Buffer.alloc(0),jpeg.subarray(0,8),webp.subarray(0,20),Buffer.from('not an image')])assert.throws(()=>read(b));
for(const path of process.argv.slice(2)){const d=read(fs.readFileSync(path));assert(d.width>0&&d.height>0);console.log(path,d);}
console.log('PASS compressed dimensions and truncated-file rejection');
