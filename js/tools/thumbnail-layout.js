/* Pure layout helpers shared by the renderer and regression tests. */
(function(root){
  'use strict';
  function crop(sw,sh,w,h,position){
    const ratio=w/h, source=sw/sh, p=Math.max(0,Math.min(1,position));
    const cw=source>ratio?sh*ratio:sw, ch=source>ratio?sh:sw/ratio;
    return {x:(sw-cw)*p,y:(sh-ch)*p,w:cw,h:ch};
  }
  function wrap(text,width,measure){
    const lines=[];
    for(const paragraph of text.split('\n')){
      let line='';
      for(const word of paragraph.trim().split(/\s+/)){
        if(!word)continue;
        const candidate=line?line+' '+word:word;
        if(measure(candidate)<=width){line=candidate;continue;}
        if(line){lines.push(line);line='';}
        // Split long unbroken words by Unicode code point, never by UTF-16 unit.
        for(const char of Array.from(word)){
          if(line&&measure(line+char)>width){lines.push(line);line='';}
          line+=char;
        }
      }
      lines.push(line);
    }
    return lines;
  }
  const api={crop,wrap};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.ThumbnailLayout=api;
})(typeof window==='undefined'?this:window);
