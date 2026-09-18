(()=>{'use strict';

const table=(()=>{
  const out=new Uint32Array(256);
  for(let n=0;n<256;n++){
    let c=n;
    for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);
    out[n]=c>>>0;
  }
  return out;
})();

const crc32=bytes=>{
  let c=0xffffffff;
  for(const b of bytes)c=table[(c^b)&255]^(c>>>8);
  return (c^0xffffffff)>>>0;
};

const u16=n=>new Uint8Array([n&255,(n>>>8)&255]);
const u32=n=>new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);
const concat=parts=>{
  const size=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(size);
  let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length;}return out;
};
const dosDateTime=date=>{
  const d=date||new Date(),year=Math.max(1980,d.getFullYear());
  const time=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1);
  const day=((year-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
  return {time,day};
};
const encoder=new TextEncoder();

async function create(entries){
  const locals=[],central=[];
  let offset=0;
  for(const entry of entries){
    const name=encoder.encode(String(entry.name||'file.bin'));
    const data=new Uint8Array(await entry.blob.arrayBuffer());
    const crc=crc32(data),stamp=dosDateTime(entry.date);
    const local=concat([
      u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(stamp.time),u16(stamp.day),
      u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data
    ]);
    locals.push(local);
    central.push(concat([
      u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(stamp.time),u16(stamp.day),
      u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),
      u32(0),u32(offset),name
    ]));
    offset+=local.length;
  }
  const centralBytes=concat(central);
  const end=concat([
    u32(0x06054b50),u16(0),u16(0),u16(entries.length),u16(entries.length),
    u32(centralBytes.length),u32(offset),u16(0)
  ]);
  return new Blob([...locals,centralBytes,end],{type:'application/zip'});
}

window.DroopZip=Object.freeze({create});
})();