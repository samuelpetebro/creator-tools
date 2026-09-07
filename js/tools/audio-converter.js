// Legacy entry kept for compatibility with older cached pages.
// The standalone Droop audio converter is the canonical implementation.
(()=>{
  'use strict';
  if(document.getElementById('audioConvertFileInput')){
    const script=document.createElement('script');
    script.src='js/tools/audio-converter-standalone.js?v=2';
    document.body.appendChild(script);
  }
})();