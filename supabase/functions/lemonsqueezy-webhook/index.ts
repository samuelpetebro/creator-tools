import {parseSubscriptionPayload} from '../_shared/lemon-billing.mjs';

const encoder=new TextEncoder();
const json=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{'content-type':'application/json'}
});

function requiredEnv(name:string){
  const value=Deno.env.get(name)?.trim();
  if(!value)throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function supabaseSecretKey(){
  const modern=Deno.env.get('SUPABASE_SECRET_KEYS');
  if(modern){
    try{const parsed=JSON.parse(modern);if(parsed?.default)return String(parsed.default);}catch{}
  }
  const legacy=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(legacy)return legacy;
  throw new Error('Supabase secret key is missing');
}

function toHex(bytes:ArrayBuffer){
  return [...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

function constantTimeEqual(a:string,b:string){
  if(a.length!==b.length)return false;
  let diff=0;
  for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}

async function hmacHex(body:string,secret:string){
  const key=await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {name:'HMAC',hash:'SHA-256'},
    false,
    ['sign']
  );
  return toHex(await crypto.subtle.sign('HMAC',key,encoder.encode(body)));
}

async function sha256Hex(body:string){
  return toHex(await crypto.subtle.digest('SHA-256',encoder.encode(body)));
}

Deno.serve(async request=>{
  if(request.method!=='POST')return json({error:'Method not allowed'},405);

  let secret:string,expectedStore:number,expectedVariant:number,expectedTestMode:boolean;
  try{
    secret=requiredEnv('LEMON_SQUEEZY_WEBHOOK_SECRET');
    expectedStore=Number(requiredEnv('LEMON_SQUEEZY_STORE_ID'));
    expectedVariant=Number(requiredEnv('LEMON_SQUEEZY_PRO_VARIANT_ID'));
    const mode=requiredEnv('LEMON_SQUEEZY_EXPECT_TEST_MODE');
    if(!Number.isSafeInteger(expectedStore)||expectedStore<=0)throw new Error('Invalid LEMON_SQUEEZY_STORE_ID');
    if(!Number.isSafeInteger(expectedVariant)||expectedVariant<=0)throw new Error('Invalid LEMON_SQUEEZY_PRO_VARIANT_ID');
    if(mode!=='true'&&mode!=='false')throw new Error('LEMON_SQUEEZY_EXPECT_TEST_MODE must be true or false');
    expectedTestMode=mode==='true';
  }catch(error){
    console.error(error);
    return json({error:'Webhook is not configured'},500);
  }

  const rawBody=await request.text();
  const signature=request.headers.get('x-signature')||'';
  const expectedSignature=await hmacHex(rawBody,secret);
  if(!signature||!constantTimeEqual(expectedSignature,signature)){
    return json({error:'Invalid signature'},401);
  }

  let payload:Record<string,unknown>;
  try{
    payload=JSON.parse(rawBody);
  }catch{
    return json({error:'Invalid JSON'},400);
  }

  let sub;
  try{
    sub=parseSubscriptionPayload(payload);
  }catch(error){
    return json({error:error instanceof Error?error.message:'Invalid subscription payload'},400);
  }

  const headerEvent=request.headers.get('x-event-name')||'';
  if(headerEvent&&headerEvent!==sub.event)return json({error:'Event header mismatch'},400);
  if(sub.storeId!==expectedStore)return json({error:'Unexpected store'},400);
  if(sub.variantId!==expectedVariant)return json({error:'Unexpected variant'},400);
  if(sub.testMode!==expectedTestMode)return json({error:'Unexpected test mode'},400);

  const supabaseUrl=Deno.env.get('SUPABASE_URL');
  let serviceKey:string;
  try{serviceKey=supabaseSecretKey();}catch(error){console.error(error);return json({error:'Supabase server configuration is missing'},500);}
  if(!supabaseUrl)return json({error:'Supabase server configuration is missing'},500);

  const eventHash=await sha256Hex(rawBody);
  const rpc=await fetch(`${supabaseUrl}/rest/v1/rpc/apply_lemon_subscription_event`,{
    method:'POST',
    headers:{
      apikey:serviceKey,
      Authorization:`Bearer ${serviceKey}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      p_event_hash:eventHash,
      p_subscription_id:sub.subscriptionId,
      p_user_id:sub.userId,
      p_store_id:sub.storeId,
      p_variant_id:sub.variantId,
      p_status:sub.status,
      p_test_mode:sub.testMode,
      p_renews_at:sub.renewsAt,
      p_ends_at:sub.endsAt,
      p_lemon_updated_at:sub.updatedAt,
      p_event_name:sub.event
    })
  });

  if(!rpc.ok){
    const detail=(await rpc.text()).slice(0,500);
    console.error('billing RPC failed',rpc.status,detail);
    return json({error:'Billing update failed'},500);
  }

  const result=await rpc.json();
  return json({ok:true,result});
});
