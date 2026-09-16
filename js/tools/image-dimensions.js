/* Check compressed image dimensions before allocating a decoded bitmap. */
(function(root){
function dimensions(buffer){
 const b=new Uint8Array(buffer),v=new DataView(buffer),ascii=(i,n)=>String.fromCharCode(...b.slice(i,i+n)),u24=i=>b[i]+b[i+1]*256+b[i+2]*65536;
 if(b.length>=24&&ascii(1,3)==='PNG'&&v.getUint32(0)===0x89504e47)return {width:v.getUint32(16),height:v.getUint32(20)};
 if(b.length>=12&&ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP'){
  for(let i=12;i+8<=b.length;){const kind=ascii(i,4),len=v.getUint32(i+4,true),p=i+8;if(p+len>b.length)break;
   if(kind==='VP8X'&&len>=10)return {width:1+u24(p+4),height:1+u24(p+7)};
   if(kind==='VP8 '&&len>=10&&ascii(p+3,3)==='\x9d\x01\x2a')return {width:v.getUint16(p+6,true)&16383,height:v.getUint16(p+8,true)&16383};
   if(kind==='VP8L'&&len>=5&&b[p]===47){const n=v.getUint32(p+1,true);return {width:(n&16383)+1,height:((n>>>14)&16383)+1};}i=p+len+(len%2);
  }
 }
 if(b.length>4&&b[0]===255&&b[1]===216){let i=2;while(i+3<b.length){if(b[i++]!==255)break;while(b[i]===255)i++;const marker=b[i++];if(marker===217||marker===218)break;if(marker===1||(marker>=208&&marker<=215))continue;const len=v.getUint16(i);if(len<2||i+len>b.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&len>=7)return {width:v.getUint16(i+5),height:v.getUint16(i+3)};i+=len;}}
 throw Error('invalid');
}
if(typeof module!=='undefined')module.exports=dimensions;else root.DroopImageDimensions=dimensions;
})(typeof window==='undefined'?this:window);
