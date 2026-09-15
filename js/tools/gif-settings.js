(function(root){
  'use strict';
  function selection(duration,start,length){
    if(!Number.isFinite(duration)||duration<.1||!Number.isFinite(start)||!Number.isFinite(length)||start<0||length<.1||length>10||start+length>duration+.001)throw Error('INVALID_RANGE');
    return {start,length};
  }
  function size(w,h,edge){const scale=Math.min(1,edge/Math.max(w,h));return {w:Math.max(2,Math.floor(w*scale/2)*2),h:Math.max(2,Math.floor(h*scale/2)*2)};}
  function commands(start,length,w,h,fps){
    const input=['-ss',String(start),'-t',String(length),'-i','input'];
    const filter=`fps=${fps},scale=${w}:${h}:flags=lanczos,setsar=1`;
    return [
      [...input,'-vf',`${filter},palettegen=stats_mode=diff`,'-frames:v','1','-y','palette.png'],
      [...input,'-i','palette.png','-filter_complex',`[0:v]${filter}[v];[v][1:v]paletteuse=dither=bayer:bayer_scale=3`,'-an','-loop','0','-y','output.gif']
    ];
  }
  const api={selection,size,commands};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GifSettings=api;
})(typeof window==='undefined'?this:window);
