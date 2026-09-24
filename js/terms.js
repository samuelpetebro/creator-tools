(()=>{'use strict';
const copy={
en:{
  title:'Terms',
  updated:'Effective: September 24, 2026.',
  scope:'Using Droop',
  scopeText:'These terms apply to droopweb.lat, Droop accounts, the free browser tools and Droop Pro. By using Droop, you agree to these terms. If you are not legally able to enter into this agreement in your jurisdiction, use Droop only with the permission of a parent or legal guardian.',
  tools:'Free tools and your media',
  toolsText:'Droop is designed around browser-based processing where supported. You keep ownership of the files and content you process. Droop does not claim ownership of your media merely because you use a tool.',
  accounts:'Accounts',
  accountsText:"You are responsible for keeping access to your account secure and for activity performed through it. Do not misuse authentication, attempt to access another user's data, interfere with security controls, or intentionally overload the service.",
  pro:'Droop Pro subscriptions',
  proText:'Droop Pro is a recurring subscription. The price and billing interval shown at checkout apply to the purchase. Unless cancelled, the subscription renews automatically at the end of each billing period. Pro access depends on the subscription status reported by our billing provider.',
  billing:'Payments and billing provider',
  billingText:'When paid checkout is enabled, PayPal processes recurring Droop Pro payments. PayPal receives the payment and account information required to complete the transaction. Droop does not receive or store your full card number. Droop remains responsible for its own pricing, subscription terms, refunds and applicable tax obligations.',
  cancel:'Cancellation',
  cancelText:'You can cancel future renewals using the subscription-management option provided by Droop or PayPal when available. After cancellation, Pro access normally continues until the end of the period you already paid for, unless a refund, chargeback or applicable law requires a different result.',
  refunds:'Refunds',
  refundsText:'Refund requests are reviewed case by case and, when approved, may be processed through PayPal. PayPal may also apply its own payment-dispute and chargeback procedures. Nothing in these terms limits consumer rights that cannot legally be waived.',
  availability:'Availability and changes',
  availabilityText:'Droop may add, change or remove tools, limits and Pro features as the product evolves. We aim to keep the service available, but we do not promise uninterrupted or error-free operation. Material subscription changes will be reflected in the product or checkout where appropriate.',
  acceptable:'Acceptable use',
  acceptableText:'Do not use Droop to violate the law, distribute malware, bypass security controls, attack infrastructure, impersonate others, or process content in a way that infringes rights you do not have permission to use.',
  privacy:'Privacy',
  privacyText:'How account, analytics, email, anti-abuse and billing data are handled is described in our',
  privacyLink:'Privacy page',
  liability:'Service responsibility',
  liabilityText:'To the extent permitted by law, Droop is provided on an “as available” basis and we are not responsible for indirect or consequential losses caused by use of the service. Nothing in these terms excludes liability or rights that applicable law does not allow us to exclude.',
  changes:'Changes to these terms',
  changesText:'We may update these terms as Droop evolves. The effective date at the top of this page will be updated when the terms change. Continued use after an update means the revised terms apply, subject to any notice or consent required by law.',
  questions:'Questions',
  questionsText:'For account or billing questions, use the support or subscription-management options shown inside Droop or your PayPal account when paid subscriptions are live.',
  footer:'Private browser-based tools.',
  privacyFooter:'Privacy'
},
es:{
  title:'Términos',
  updated:'Vigentes desde: 24 de septiembre de 2026.',
  scope:'Uso de Droop',
  scopeText:'Estos términos se aplican a droopweb.lat, las cuentas de Droop, las herramientas gratuitas del navegador y Droop Pro. Al usar Droop, aceptás estos términos. Si en tu jurisdicción no tenés capacidad legal para aceptar este acuerdo, usá Droop únicamente con autorización de tu madre, padre o tutor legal.',
  tools:'Herramientas gratis y tus archivos',
  toolsText:'Droop está diseñado alrededor del procesamiento en el navegador cuando es compatible. Conservás la propiedad de los archivos y contenidos que procesás. Droop no reclama propiedad sobre tu media por el solo hecho de usar una herramienta.',
  accounts:'Cuentas',
  accountsText:'Sos responsable de mantener seguro el acceso a tu cuenta y de la actividad realizada desde ella. No uses indebidamente la autenticación, no intentes acceder a datos de otros usuarios, no interfieras con controles de seguridad ni sobrecargues intencionalmente el servicio.',
  pro:'Suscripciones de Droop Pro',
  proText:'Droop Pro es una suscripción recurrente. Se aplica el precio y período de facturación mostrado en el checkout. Salvo que la canceles, la suscripción se renueva automáticamente al finalizar cada período. El acceso Pro depende del estado de suscripción informado por nuestro proveedor de facturación.',
  billing:'Pagos y proveedor de facturación',
  billingText:'Cuando el checkout pago esté habilitado, PayPal procesa los pagos recurrentes de Droop Pro. PayPal recibe la información de pago y de cuenta necesaria para completar la transacción. Droop no recibe ni guarda el número completo de tu tarjeta. Droop sigue siendo responsable por sus precios, condiciones de suscripción, reembolsos y obligaciones fiscales aplicables.',
  cancel:'Cancelación',
  cancelText:'Podés cancelar futuras renovaciones usando la opción de administración de suscripción disponible en Droop o PayPal. Después de cancelar, el acceso Pro normalmente continúa hasta el final del período que ya pagaste, salvo que un reembolso, contracargo o la ley aplicable requiera otro resultado.',
  refunds:'Reembolsos',
  refundsText:'Las solicitudes de reembolso se revisan caso por caso y, cuando correspondan, pueden procesarse mediante PayPal. PayPal también puede aplicar sus propios procedimientos de disputas y contracargos. Nada de estos términos limita derechos del consumidor que legalmente no puedan renunciarse.',
  availability:'Disponibilidad y cambios',
  availabilityText:'Droop puede agregar, modificar o eliminar herramientas, límites y funciones Pro a medida que evoluciona el producto. Intentamos mantener el servicio disponible, pero no prometemos funcionamiento ininterrumpido ni libre de errores. Los cambios materiales de suscripción se reflejarán en el producto o checkout cuando corresponda.',
  acceptable:'Uso aceptable',
  acceptableText:'No uses Droop para infringir la ley, distribuir malware, evadir controles de seguridad, atacar infraestructura, suplantar a otras personas o procesar contenido de una forma que infrinja derechos para los que no tenés permiso.',
  privacy:'Privacidad',
  privacyText:'El tratamiento de datos de cuenta, analytics, correo, protección antiabuso y facturación se describe en nuestra',
  privacyLink:'página de Privacidad',
  liability:'Responsabilidad del servicio',
  liabilityText:'En la medida permitida por la ley, Droop se ofrece “según disponibilidad” y no somos responsables por pérdidas indirectas o consecuentes derivadas del uso del servicio. Nada de estos términos excluye responsabilidades o derechos que la ley aplicable no permita excluir.',
  changes:'Cambios a estos términos',
  changesText:'Podemos actualizar estos términos a medida que Droop evoluciona. La fecha de vigencia al comienzo de esta página se actualizará cuando cambien. El uso continuado después de una actualización implica que se aplican los términos revisados, sujeto a cualquier aviso o consentimiento exigido por ley.',
  questions:'Preguntas',
  questionsText:'Para consultas de cuenta o facturación, usá las opciones de soporte o administración de suscripción que aparezcan dentro de Droop o en tu cuenta de PayPal cuando las suscripciones pagas estén activas.',
  footer:'Herramientas privadas desde tu navegador.',
  privacyFooter:'Privacidad'
}};
let lang=(navigator.language||'').toLowerCase().startsWith('es')?'es':'en';
try{const saved=localStorage.getItem('droop-language');if(Object.hasOwn(copy,saved))lang=saved;}catch(_){}
function render(){
  const t=copy[lang];document.documentElement.lang=lang;document.title=t.title+' — droop';
  document.querySelectorAll('[data-t]').forEach(el=>{const key=el.dataset.t;if(t[key]!=null)el.textContent=t[key];});
  const button=document.getElementById('termsLang');button.textContent=lang==='es'?'EN':'ES';button.setAttribute('aria-label',lang==='es'?'Switch to English':'Cambiar a español');
}
document.getElementById('termsLang').addEventListener('click',()=>{lang=lang==='es'?'en':'es';try{localStorage.setItem('droop-language',lang);}catch(_){}render();});
render();
})();