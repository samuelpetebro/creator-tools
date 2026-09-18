const json=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});

const encoder=new TextEncoder();

function toHex(bytes:ArrayBuffer){return [...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,'0')).join('');}

function constantTimeEqual(a:string,b:string){
  if(a.length!==b.length)return false;
  let diff=0;
  for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}

async function signatureFor(body:string,secret:string){
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return toHex(await crypto.subtle.sign('HMAC',key,encoder.encode(body)));
}

function isUuid(value:unknown):value is string{
  return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isProVariant(payload:Record<string,any>){
  const expected=Deno.env.get('LEMON_SQUEEZY_PRO_VARIANT_ID');
  if(!expected)return true;
  const actual=String(payload?.data?.attributes?.variant_id??'');
  return actual===expected;
}

async function updatePlan(userId:string,plan:'free'|'pro'){
  const supabaseUrl=Deno.env.get('SUPABASE_URL');
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!supabaseUrl||!serviceKey)throw new Error('Supabase server configuration is missing.');
  const response=await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,{
    method:'PATCH',
    headers:{
      apikey:serviceKey,
      Authorization:`Bearer ${serviceKey}`,
      'Content-Type':'application/json',
      Prefer:'return=minimal'
    },
    body:JSON.stringify({plan})
  });
  if(!response.ok)throw new Error(`Supabase profile update failed: ${response.status}`);
}

Deno.serve(async(request)=>{
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  const secret=Deno.env.get('LEMON_SQUEEZY_WEBHOOK_SECRET');
  if(!secret)return json({error:'Webhook is not configured'},500);
  const signature=request.headers.get('x-signature')||'';
  const rawBody=await request.text();
  const expected=await signatureFor(rawBody,secret);
  if(!signature||!constantTimeEqual(expected,signature))return json({error:'Invalid signature'},401);

  let payload:Record<string,any>;
  try{payload=JSON.parse(rawBody);}catch(_){return json({error:'Invalid JSON'},400);}
  if(!isProVariant(payload))return json({error:'Unexpected variant'},400);

  const event=String(payload?.meta?.event_name||'');
  const userId=payload?.meta?.custom_data?.user_id;
  if(!isUuid(userId))return json({ok:true,ignored:'missing_user_id'});
  const activate=new Set(['subscription_created','subscription_updated','subscription_resumed','subscription_payment_success','subscription_payment_recovered']);
  const downgrade=new Set(['subscription_expired']);
  if(!activate.has(event)&&!downgrade.has(event))return json({ok:true,ignored:'event_not_used'});
  await updatePlan(userId,activate.has(event)?'pro':'free');
  return json({ok:true});
});
