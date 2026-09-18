const base='https://qbzqiiinugidkdxcpdln.supabase.co/functions/v1';

const webhook=await fetch(base+'/lemonsqueezy-webhook',{
  method:'POST',
  headers:{'content-type':'application/json','x-event-name':'subscription_created'},
  body:'{}'
});
const webhookBody=await webhook.text();
if(webhook.status!==401||!webhookBody.includes('Invalid signature')){
  throw new Error(`Webhook endpoint/config check failed: ${webhook.status} ${webhookBody.slice(0,200)}`);
}

const checkout=await fetch(base+'/lemonsqueezy-checkout',{
  method:'POST',
  headers:{'content-type':'application/json','origin':'https://droopweb.lat'},
  body:'{}'
});
const checkoutBody=await checkout.text();
if(checkout.status!==401){
  throw new Error(`Checkout auth gate check failed: ${checkout.status} ${checkoutBody.slice(0,200)}`);
}

const portal=await fetch(base+'/lemonsqueezy-portal',{method:'POST',headers:{'content-type':'application/json','origin':'https://droopweb.lat'},body:'{}'});
if(portal.status!==401){throw new Error(`Portal auth gate check failed: ${portal.status} ${(await portal.text()).slice(0,200)}`);}

console.log('billing endpoint smoke: ok');
console.log('webhook rejected unsigned request after loading its required configuration');
console.log('checkout rejected unauthenticated request');
console.log('customer portal rejected unauthenticated request');
