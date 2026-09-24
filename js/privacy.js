(()=>{'use strict';
const copy={
en:{
  title:'Privacy',
  files:'Your files stay on your device',
  fileText:'The current tools process media locally. Processing packages may be downloaded from external providers. File names, images, audio, videos and captions are not sent by our analytics integration.',
  accounts:'Accounts and saved presets',
  accountText:'If you create an account, Supabase stores authentication data, your email address, optional display name, plan and saved settings. Presets, Pro Creator Profiles, Brand Kits and Workflow Recipes contain reusable settings only, not your media files. Pro preset backups are downloaded locally; restoring a backup sends only preset settings back to your account. Workflow Recent Runs are optional local browser history containing recipe settings, time and aggregate counts; they do not include filenames or media.',
  providers:'Account and sign-in services',
  providerText:'Droop uses Supabase for authentication and account data. Optional Google sign-in shares the basic account information approved in the Google consent flow. Browser clients use a public publishable key with Row Level Security; administrative credentials are not included in the public site.',
  email:'Account email delivery',
  emailText:'Droop uses Resend as the SMTP provider for account emails such as confirmation and password recovery. Resend receives the recipient address, message content and ordinary delivery metadata needed to send those emails.',
  abuse:'Bot and abuse protection',
  abuseText:'Droop uses Cloudflare Turnstile on selected authentication flows. Cloudflare receives browser and network information needed to evaluate whether a request is likely to come from a person or an automated system.',
  billing:'Pro billing',
  billingText:'When paid Droop Pro checkout is enabled, PayPal processes recurring payments. PayPal receives the payment and account information needed to complete the transaction. Droop stores subscription identifiers and status needed to grant Pro access, but does not receive or store your full card number.',
  usage:'Usage measurement',
  usageText:'When enabled, we use Umami to measure page visits and selected processing events. We send the tool name, interface language and referring website origin. Search text, URL parameters and referring page paths are excluded. The analytics provider receives ordinary network information such as IP address and browser headers. A download click does not tell us whether the file was saved.',
  optText:'This choice is saved in this browser. Do Not Track and Global Privacy Control are also respected. Your media tools work either way.',
  provider:'Umami privacy information',
  footer:'Private browser-based tools.',
  termsFooter:'Terms',
  off:'Usage measurement is not configured yet.',
  blocked:'Usage measurement is disabled in this browser.',
  on:'Usage measurement is configured. Delivery may be blocked by your browser or network.',
  allow:'Allow usage measurement',
  disable:'Disable usage measurement',
  error:'This browser could not save your choice. Analytics stays disabled when storage is unavailable.'
},
es:{
  title:'Privacidad',
  files:'Tus archivos se quedan en tu dispositivo',
  fileText:'Las herramientas actuales procesan los archivos localmente. Pueden descargar paquetes de procesamiento de proveedores externos. Nuestra integración de analytics no envía nombres de archivo, imágenes, audio, videos ni subtítulos.',
  accounts:'Cuentas y presets guardados',
  accountText:'Si creás una cuenta, Supabase guarda datos de autenticación, tu correo electrónico, nombre visible opcional, plan y configuraciones guardadas. Los presets, Perfiles de creador Pro, Kits de marca y Workflow Recipes guardan solo ajustes reutilizables, no tus archivos multimedia. Los backups Pro se descargan localmente; al restaurarlos solo se vuelven a enviar los ajustes de presets a tu cuenta. Las ejecuciones recientes de Workflow son historial local opcional del navegador con ajustes de receta, hora y conteos agregados; no incluyen nombres de archivo ni media.',
  providers:'Servicios de cuenta e inicio de sesión',
  providerText:'Droop usa Supabase para autenticación y datos de cuenta. El inicio opcional con Google comparte la información básica aprobada en la pantalla de consentimiento de Google. El navegador usa una clave pública con Row Level Security; las credenciales administrativas no forman parte del sitio público.',
  email:'Entrega de correos de cuenta',
  emailText:'Droop usa Resend como proveedor SMTP para correos de cuenta, como confirmación y recuperación de contraseña. Resend recibe la dirección de destino, el contenido del mensaje y los metadatos normales de entrega necesarios para enviar esos correos.',
  abuse:'Protección contra bots y abuso',
  abuseText:'Droop usa Cloudflare Turnstile en determinados flujos de autenticación. Cloudflare recibe información del navegador y la red necesaria para evaluar si una solicitud probablemente viene de una persona o de un sistema automatizado.',
  billing:'Facturación de Pro',
  billingText:'Cuando el checkout pago de Droop Pro esté habilitado, PayPal procesa los pagos recurrentes. PayPal recibe la información de pago y de cuenta necesaria para completar la transacción. Droop guarda identificadores y estado de suscripción necesarios para habilitar Pro, pero no recibe ni guarda el número completo de tu tarjeta.',
  usage:'Medición de uso',
  usageText:'Cuando está habilitada, usamos Umami para medir visitas y algunos eventos de procesamiento. Enviamos el nombre de la herramienta, el idioma y el sitio de origen de la visita. Excluimos búsquedas, parámetros de URL y rutas de páginas de origen. El proveedor recibe información habitual de conexión, como la dirección IP y las cabeceras del navegador. Un clic en descargar no confirma que hayas guardado el archivo.',
  optText:'La elección se guarda en este navegador. También respetamos Do Not Track y Global Privacy Control. Las herramientas funcionan en ambos casos.',
  provider:'Información de privacidad de Umami',
  footer:'Herramientas privadas desde tu navegador.',
  termsFooter:'Términos',
  off:'La medición de uso todavía no está configurada.',
  blocked:'La medición de uso está desactivada en este navegador.',
  on:'La medición de uso está configurada. El navegador o la red pueden bloquear su envío.',
  allow:'Permitir medición de uso',
  disable:'Desactivar medición de uso',
  error:'Este navegador no pudo guardar la elección. Analytics queda desactivado cuando el almacenamiento no está disponible.'
}};
let lang=(navigator.language||'').startsWith('es')?'es':'en',disabled=false,unavailable=false;
try{const saved=localStorage.getItem('droop-language');if(Object.hasOwn(copy,saved))lang=saved;disabled=localStorage.getItem('droop-analytics-disabled')==='1';}catch(_){unavailable=true;}
const $=id=>document.getElementById(id);
function render(){
  const t=copy[lang];document.documentElement.lang=lang;document.title=t.title+' — droop';
  document.querySelectorAll('[data-p]').forEach(el=>{if(t[el.dataset.p]!=null)el.textContent=t[el.dataset.p];});
  $('privacyLang').textContent=lang==='es'?'EN':'ES';
  $('privacyLang').setAttribute('aria-label',lang==='es'?'Switch to English':'Cambiar a español');
  const configured=window.DroopAnalyticsConfig?.websiteId&&window.DroopAnalyticsConfig?.scriptUrl;
  $('privacyState').textContent=t[unavailable?'error':!configured?'off':disabled||navigator.doNotTrack==='1'||navigator.globalPrivacyControl?'blocked':'on'];
  $('privacyOpt').textContent=t[disabled?'allow':'disable'];
}
$('privacyLang').onclick=()=>{lang=lang==='es'?'en':'es';try{localStorage.setItem('droop-language',lang);}catch(_){}render();};
$('privacyOpt').onclick=()=>{try{if(disabled)localStorage.removeItem('droop-analytics-disabled');else localStorage.setItem('droop-analytics-disabled','1');disabled=!disabled;unavailable=false;}catch(_){unavailable=true;}render();};
render();
})();