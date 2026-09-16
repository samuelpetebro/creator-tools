(function(root){
'use strict';
function time(value){const m=/^(\d{2,}):([0-5]\d):([0-5]\d)[,.](\d{3})$/.exec(value);if(!m)throw Error('format');return +m[1]*3600 + +m[2]*60 + +m[3] + +m[4]/1000;}
function parse(text){
 if(text.length>100000)throw Error('limit');if(!text.trim())throw Error('empty');
 const blocks=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim().split(/\n\s*\n/);
 return validate(blocks.map(block=>{const lines=block.split('\n');if(/^\d+$/.test(lines[0].trim()))lines.shift();const m=/^\s*(\S+)\s+-->\s+(\S+)\s*$/.exec(lines.shift()||'');if(!m)throw Error('format');
 return {start:time(m[1]),end:time(m[2]),text:lines.join('\n').replace(/<\/?(?:b|i|u|font)\b[^>]*>/gi,'')};}),Infinity);
}
function validate(cues,duration){
 if(!cues.length)throw Error('empty');if(cues.length>200)throw Error('limit');
 const sorted=cues.map(c=>({start:Number(c.start),end:Number(c.end),text:String(c.text).trim()})).sort((a,b)=>a.start-b.start);let end=0;
 for(const c of sorted){if(!c.text)throw Error('empty');if(c.text.length>500)throw Error('limit');if(!Number.isFinite(c.start)||!Number.isFinite(c.end)||c.start<0||c.end-c.start<.02||c.end>duration+.001)throw Error('range');if(c.start<end-.001)throw Error('overlap');end=c.end;}
 return sorted;
}
function stamp(seconds){const n=Math.round(seconds*100);return `${Math.floor(n/360000)}:${String(Math.floor(n/6000)%60).padStart(2,'0')}:${String(Math.floor(n/100)%60).padStart(2,'0')}.${String(n%100).padStart(2,'0')}`;}
function size(w,h){const k=Math.min(1,1280/Math.max(w,h));return {w:Math.max(2,Math.floor(w*k/2)*2),h:Math.max(2,Math.floor(h*k/2)*2)};}
function fontSize(w,h,scale){return Math.max(12,Math.round(Math.min(w,h)*({small:.04,medium:.055,large:.075}[scale]||.055)));}
function ass(cues,w,h,style,position,scale){
 const font=fontSize(w,h,scale),margin=Math.round(h*.08),color=style==='yellow'?'&H0000FFFF':'&H00FFFFFF',box=style==='box'?3:1;
 const header=`[Script Info]\nScriptType: v4.00+\nPlayResX: ${w}\nPlayResY: ${h}\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,DejaVu Sans,${font},${color},${color},&H00000000,&H80000000,-1,0,0,0,100,100,0,0,${box},${Math.max(1,Math.round(font*.08))},0,${position==='top'?8:2},${Math.round(w*.05)},${Math.round(w*.05)},${margin},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
 // Fullwidth equivalents neutralize ASS override syntax in user-provided text.
 const plain=text=>text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/\\/g,'＼').replace(/{/g,'｛').replace(/}/g,'｝').replace(/\r\n?/g,'\n').replace(/\n/g,'\\N');
 return header+cues.map(c=>`Dialogue: 0,${stamp(c.start)},${stamp(c.end)},Default,,0,0,0,,${plain(c.text)}`).join('\n')+'\n';
}
const api={parse,validate,stamp,size,fontSize,ass};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SubtitleFormat=api;
})(typeof window==='undefined'?this:window);
