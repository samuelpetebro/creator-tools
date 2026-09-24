const encoder=new TextEncoder();
const json=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});

function requiredEnv(name:string){
  const value=Deno.env.get(name)?.trim();
  if(!value)throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
function supabaseSecretKey(){
  const modern=Deno.env.get('SUPABASE_SECRET_KEYS');
  if(modern){try{const parsed=JSON.parse(modern);if(parsed?.default)return String(parsed.default);}catch{}}
  const legacy=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(legacy)return legacy;
  throw new Error('Supabase secret key is missing');
}
function serviceHeaders(key:string){
  return {
    apikey:key,
    ...(key.startsWith('sb_secret_')?{}:{Authorization:`Bearer ${key}`}),
    'Content-Type':'application/json'
  };
}
function paypalBase(){
  const sandbox=requiredEnv('PAYPAL_SANDBOX');
  if(sandbox!=='true'&&sandbox!=='false')throw new Error('PAYPAL_SANDBOX must be true or false');
  return sandbox==='true'?'https://api-m.sandbox.paypal.com':'https://api-m.paypal.com';
}
async function accessToken(){
  const clientId=requiredEnv('PAYPAL_CLIENT_ID'),secret=requiredEnv('PAYPAL_CLIENT_SECRET');
  const response=await fetch(`${paypalBase()}/v1/oauth2/token`,{
    method:'POST',
    headers:{Authorization:'Basic '+btoa(`${clientId}:${secret}`),'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},
    body:'grant_type=client_credentials'
  });
  if(!response.ok)throw new Error(`PayPal token failed: ${response.status}`);
  const payload=await response.json();
  if(typeof payload?.access_token!=='string')throw new Error('PayPal access token missing');
  return payload.access_token as string;
}
function toHex(bytes:ArrayBuffer){
  return [...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
async function sha256Hex(value:string){
  return toHex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
}
function subscriptionIdFromEvent(payload:any){
  const resource=payload?.resource||{};
  if(String(payload?.event_type||'').startsWith('BILLING.SUBSCRIPTION.'))return typeof resource.id==='string'?resource.id:'';
  return typeof resource.billing_agreement_id==='string'?resource.billing_agreement_id:'';
}
function normalizedStatus(value:unknown){
  const status=String(value||'').toLowerCase();
  if(['approval_pending','approved','active','suspended','cancelled','expired'].includes(status))return status;
  throw new Error(`Unexpected PayPal status: ${status||'missing'}`);
}
function validUuid(value:string){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async request=>{
  if(request.method!=='POST')return json({error:'Method not allowed'},405);

  const transmissionId=request.headers.get('paypal-transmission-id')||'';
  const transmissionTime=request.headers.get('paypal-transmission-time')||'';
  const certUrl=request.headers.get('paypal-cert-url')||'';
  const authAlgo=request.headers.get('paypal-auth-algo')||'';
  const transmissionSig=request.headers.get('paypal-transmission-sig')||'';
  if(!transmissionId||!transmissionTime||!certUrl||!authAlgo||!transmissionSig)return json({error:'Invalid signature'},401);

  let rawBody:string,payload:any;
  try{rawBody=await request.text();payload=JSON.parse(rawBody);}
  catch{return json({error:'Invalid JSON'},400);}

  const acceptedEvents=new Set([
    'BILLING.SUBSCRIPTION.CREATED',
    'BILLING.SUBSCRIPTION.ACTIVATED',
    'BILLING.SUBSCRIPTION.UPDATED',
    'BILLING.SUBSCRIPTION.CANCELLED',
    'BILLING.SUBSCRIPTION.SUSPENDED',
    'BILLING.SUBSCRIPTION.EXPIRED',
    'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
    'PAYMENT.SALE.COMPLETED',
    'PAYMENT.SALE.REFUNDED',
    'PAYMENT.SALE.REVERSED'
  ]);
  const eventType=String(payload?.event_type||'');
  if(!acceptedEvents.has(eventType))return json({ok:true,ignored:true});

  let token:string,webhookId:string,planId:string,sandbox:boolean;
  try{
    token=await accessToken();
    webhookId=requiredEnv('PAYPAL_WEBHOOK_ID');
    planId=requiredEnv('PAYPAL_PLAN_ID');
    sandbox=requiredEnv('PAYPAL_SANDBOX')==='true';
  }catch(error){console.error(error);return json({error:'Webhook is not configured'},500);}

  const verify=await fetch(`${paypalBase()}/v1/notifications/verify-webhook-signature`,{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({
      transmission_id:transmissionId,
      transmission_time:transmissionTime,
      cert_url:certUrl,
      auth_algo:authAlgo,
      transmission_sig:transmissionSig,
      webhook_id:webhookId,
      webhook_event:payload
    })
  });
  if(!verify.ok){console.error('PayPal webhook verification failed',verify.status,(await verify.text()).slice(0,300));return json({error:'Signature verification failed'},401);}
  const verified=await verify.json();
  if(String(verified?.verification_status)!=='SUCCESS')return json({error:'Invalid signature'},401);

  const subscriptionId=subscriptionIdFromEvent(payload);
  if(!subscriptionId)return json({error:'Subscription id missing'},400);

  const detailResponse=await fetch(`${paypalBase()}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,{
    headers:{Authorization:`Bearer ${token}`,Accept:'application/json'}
  });
  if(!detailResponse.ok){
    console.error('PayPal subscription lookup failed',detailResponse.status,(await detailResponse.text()).slice(0,400));
    return json({error:'Could not load PayPal subscription'},502);
  }
  const detail=await detailResponse.json();
  if(String(detail?.id||'')!==subscriptionId)return json({error:'Subscription mismatch'},409);
  if(String(detail?.plan_id||'')!==planId)return json({error:'Unexpected PayPal plan'},400);

  const userId=String(detail?.custom_id||'');
  if(!validUuid(userId))return json({error:'Droop user id missing'},400);

  let status:string;
  try{status=normalizedStatus(detail?.status);}catch(error){return json({error:error instanceof Error?error.message:'Invalid subscription status'},400);}
  const updatedAt=String(detail?.status_update_time||detail?.update_time||detail?.create_time||payload?.create_time||'');
  if(!updatedAt||Number.isNaN(Date.parse(updatedAt)))return json({error:'PayPal updated time missing'},400);
  const nextBilling=detail?.billing_info?.next_billing_time;
  const nextBillingAt=typeof nextBilling==='string'&&!Number.isNaN(Date.parse(nextBilling))?nextBilling:null;
  const eventHash=await sha256Hex(`${transmissionId}:${rawBody}`);

  let supabaseUrl:string,serviceKey:string;
  try{supabaseUrl=requiredEnv('SUPABASE_URL');serviceKey=supabaseSecretKey();}
  catch(error){console.error(error);return json({error:'Supabase server configuration is missing'},500);}

  const rpc=await fetch(`${supabaseUrl}/rest/v1/rpc/apply_paypal_subscription_event`,{
    method:'POST',
    headers:serviceHeaders(serviceKey),
    body:JSON.stringify({
      p_event_hash:eventHash,
      p_subscription_id:subscriptionId,
      p_user_id:userId,
      p_plan_id:planId,
      p_status:status,
      p_sandbox:sandbox,
      p_next_billing_at:nextBillingAt,
      p_paypal_updated_at:updatedAt,
      p_event_name:eventType
    })
  });
  if(!rpc.ok){
    console.error('PayPal billing RPC failed',rpc.status,(await rpc.text()).slice(0,500));
    return json({error:'Billing update failed'},500);
  }
  const result=await rpc.json();
  return json({ok:true,result});
});
