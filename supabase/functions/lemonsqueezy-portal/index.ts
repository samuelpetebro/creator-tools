const json=(body:Record<string,unknown>,status=200,origin?:string)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json',...(origin?{'access-control-allow-origin':origin,'vary':'Origin'}:{})}});
function requiredEnv(name:string){const value=Deno.env.get(name)?.trim();if(!value)throw new Error(`Missing required environment variable: ${name}`);return value;}
function supabasePublishableKey(){
  const modern=Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if(modern){try{const parsed=JSON.parse(modern);if(parsed?.default)return String(parsed.default);}catch{}}
  const legacy=Deno.env.get('SUPABASE_ANON_KEY');if(legacy)return legacy;
  throw new Error('Supabase publishable key is missing');
}
function supabaseSecretKey(){
  const modern=Deno.env.get('SUPABASE_SECRET_KEYS');
  if(modern){try{const parsed=JSON.parse(modern);if(parsed?.default)return String(parsed.default);}catch{}}
  const legacy=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(legacy)return legacy;
  throw new Error('Supabase secret key is missing');
}
Deno.serve(async request=>{
  let appUrl:string,allowedOrigin:string;
  try{appUrl=requiredEnv('DROOP_APP_URL');allowedOrigin=new URL(appUrl).origin;}catch(error){console.error(error);return json({error:'Portal is not configured'},500);}
  const origin=request.headers.get('origin')||'';
  if(origin&&origin!==allowedOrigin)return json({error:'Origin not allowed'},403,allowedOrigin);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':allowedOrigin,'access-control-allow-headers':'authorization, content-type, apikey','access-control-allow-methods':'POST, OPTIONS','vary':'Origin'}});
  if(request.method!=='POST')return json({error:'Method not allowed'},405,allowedOrigin);

  const authHeader=request.headers.get('authorization')||'';
  if(!authHeader.toLowerCase().startsWith('bearer '))return json({error:'Sign in required'},401,allowedOrigin);

  let supabaseUrl:string,anonKey:string,serviceKey:string;
  try{supabaseUrl=requiredEnv('SUPABASE_URL');anonKey=supabasePublishableKey();serviceKey=supabaseSecretKey();}catch(error){console.error(error);return json({error:'Server configuration is missing'},500,allowedOrigin);}
  const authResponse=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:{apikey:anonKey,Authorization:authHeader}});
  if(!authResponse.ok)return json({error:'Invalid session'},401,allowedOrigin);
  const user=await authResponse.json();
  if(!user?.id)return json({error:'Invalid session user'},401,allowedOrigin);

  let apiKey:string,storeId:string,variantId:string,expectedMode:string,checkoutMode:string;
  try{
    apiKey=requiredEnv('LEMON_SQUEEZY_API_KEY');
    storeId=requiredEnv('LEMON_SQUEEZY_STORE_ID');
    variantId=requiredEnv('LEMON_SQUEEZY_PRO_VARIANT_ID');
    expectedMode=requiredEnv('LEMON_SQUEEZY_EXPECT_TEST_MODE');
    checkoutMode=requiredEnv('LEMON_SQUEEZY_CHECKOUT_TEST_MODE');
  }catch(error){console.error(error);return json({error:'Billing is not configured'},500,allowedOrigin);}
  if(expectedMode!==checkoutMode||!['true','false'].includes(expectedMode))return json({error:'Billing mode mismatch'},500,allowedOrigin);
  const testMode=expectedMode==='true';

  const params=new URLSearchParams({
    select:'lemon_subscription_id,status,test_mode,renews_at,ends_at,updated_at',
    user_id:`eq.${user.id}`,
    test_mode:`eq.${testMode}`,
    status:'in.(on_trial,active,paused,past_due,cancelled)',
    order:'updated_at.desc',
    limit:'1'
  });
  const billingResponse=await fetch(`${supabaseUrl}/rest/v1/billing_subscriptions?${params}`,{headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`}});
  if(!billingResponse.ok){console.error('billing lookup failed',billingResponse.status,(await billingResponse.text()).slice(0,300));return json({error:'Could not load subscription'},500,allowedOrigin);}
  const rows=await billingResponse.json();
  if(!Array.isArray(rows)||!rows.length)return json({error:'No manageable subscription'},404,allowedOrigin);
  const local=rows[0];

  const lemon=await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${encodeURIComponent(local.lemon_subscription_id)}`,{headers:{Accept:'application/vnd.api+json','Content-Type':'application/vnd.api+json',Authorization:`Bearer ${apiKey}`}});
  if(!lemon.ok){console.error('Lemon subscription lookup failed',lemon.status,(await lemon.text()).slice(0,300));return json({error:'Could not load billing portal'},502,allowedOrigin);}
  const payload=await lemon.json();
  const attrs=payload?.data?.attributes||{};
  if(String(attrs.store_id)!==String(storeId)||String(attrs.variant_id)!==String(variantId)||Boolean(attrs.test_mode)!==testMode)return json({error:'Subscription configuration mismatch'},409,allowedOrigin);
  const url=attrs?.urls?.customer_portal;
  if(typeof url!=='string'||!url.startsWith('https://'))return json({error:'Customer portal URL missing'},502,allowedOrigin);

  return json({url,status:String(attrs.status||local.status),cancelled:Boolean(attrs.cancelled),renews_at:attrs.renews_at||local.renews_at||null,ends_at:attrs.ends_at||local.ends_at||null,test_mode:Boolean(attrs.test_mode)},200,allowedOrigin);
});