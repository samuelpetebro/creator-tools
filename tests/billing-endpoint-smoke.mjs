const base='https://qbzqiiinugidkdxcpdln.supabase.co/functions/v1';

async function expectStatus(path,status,label,options={}){
  const response=await fetch(base+'/'+path,{method:'POST',headers:{'content-type':'application/json','origin':'https://droopweb.lat',...(options.headers||{})},body:options.body??'{}'});
  const body=await response.text();
  if(response.status!==status)throw new Error(`${label}: expected ${status}, got ${response.status} ${body.slice(0,200)}`);
  return body;
}

const paypalWebhook=await fetch(base+'/paypal-webhook',{
  method:'POST',
  headers:{'content-type':'application/json'},
  body:'{}'
});
const paypalWebhookBody=await paypalWebhook.text();
if(paypalWebhook.status!==401||!paypalWebhookBody.includes('Invalid signature')){
  throw new Error(`PayPal webhook signature gate failed: ${paypalWebhook.status} ${paypalWebhookBody.slice(0,200)}`);
}

await expectStatus('paypal-checkout',401,'PayPal checkout auth gate');
await expectStatus('paypal-subscription',401,'PayPal subscription auth gate');
await expectStatus('paypal-cancel',401,'PayPal cancellation auth gate');

// Temporary rollback coverage while Lemon endpoints remain deployed.
const lemonWebhook=await fetch(base+'/lemonsqueezy-webhook',{
  method:'POST',
  headers:{'content-type':'application/json','x-event-name':'subscription_created'},
  body:'{}'
});
const lemonWebhookBody=await lemonWebhook.text();
if(lemonWebhook.status!==401||!lemonWebhookBody.includes('Invalid signature')){
  throw new Error(`Legacy Lemon webhook gate failed: ${lemonWebhook.status} ${lemonWebhookBody.slice(0,200)}`);
}
await expectStatus('lemonsqueezy-checkout',401,'Legacy Lemon checkout auth gate');
await expectStatus('lemonsqueezy-portal',401,'Legacy Lemon portal auth gate');

console.log('billing endpoint smoke: ok');
console.log('PayPal webhook rejects unsigned requests');
console.log('PayPal checkout, subscription and cancellation endpoints reject unauthenticated requests');
console.log('Legacy Lemon endpoints remain locked during rollback window');
