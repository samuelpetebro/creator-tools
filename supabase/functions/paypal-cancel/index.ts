const json=(body:Record<string,unknown>,status=200,origin='')=>new Response(JSON.stringify(body),{
  status,headers:{'content-type':'application/json',...(origin?{'access-control-allow-origin':origin,'vary':'Origin'}:{})}
});
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
function serviceHeaders(key:string){return {apikey:key,...(key.startsWith('sb_secret_')?{}:{Authorization:`Bearer ${key}`})};}
function paypalBase(){
  const sandbox=requiredEnv('PAYPAL_SANDBOX');
  if(sandbox!=='true'&&sandbox!=='false')throw new Error('PAYPAL_SANDBOX must be true or false');
  return sandbox==='true'?'https://api-m.sandbox.paypal.com':'https://api-m.paypal.com';
}
async function paypalAccessToken(){
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

Deno.serve(async request=>{
  let allowedOrigin:string;
  try{allowedOrigin=new URL(requiredEnv('DROOP_APP_URL')).origin;}
  catch(error){console.error(error);return json({error:'Cancellation is not configured'},500);}
  const origin=request.headers.get('origin')||'';
  if(origin&&origin!==allowedOrigin)return json({error:'Origin not allowed'},403,allowedOrigin);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{
    'access-control-allow-origin':allowedOrigin,
    'access-control-allow-headers':'authorization, content-type, apikey',
    'access-control-allow-methods':'POST, OPTIONS','vary':'Origin'
  }});
  if(request.method!=='POST')return json({error:'Method not allowed'},405,allowedOrigin);

  const authHeader=request.headers.get('authorization')||'';
  if(!authHeader.toLowerCase().startsWith('bearer '))return json({error:'Sign in required'},401,allowedOrigin);

  let supabaseUrl:string,anonKey:string,serviceKey:string,sandbox:boolean;
  try{
    supabaseUrl=requiredEnv('SUPABASE_URL');
    anonKey=supabasePublishableKey();
    serviceKey=supabaseSecretKey();
    const mode=requiredEnv('PAYPAL_SANDBOX');
    if(mode!=='true'&&mode!=='false')throw new Error('Invalid PAYPAL_SANDBOX');
    sandbox=mode==='true';
  }catch(error){console.error(error);return json({error:'Server configuration is missing'},500,allowedOrigin);}

  const auth=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:{apikey:anonKey,Authorization:authHeader}});
  if(!auth.ok)return json({error:'Invalid session'},401,allowedOrigin);
  const user=await auth.json();
  if(!user?.id)return json({error:'Invalid session user'},401,allowedOrigin);

  const planId=requiredEnv('PAYPAL_PLAN_ID');
  const params=new URLSearchParams({
    select:'paypal_subscription_id,plan_id,status,sandbox',
    user_id:`eq.${user.id}`,
    sandbox:`eq.${sandbox}`,
    status:'in.(approved,active,suspended)',
    order:'updated_at.desc',
    limit:'1'
  });
  const lookup=await fetch(`${supabaseUrl}/rest/v1/paypal_billing_subscriptions?${params}`,{headers:serviceHeaders(serviceKey)});
  if(!lookup.ok){console.error('PayPal cancel lookup failed',lookup.status,(await lookup.text()).slice(0,300));return json({error:'Could not load subscription'},500,allowedOrigin);}
  const rows=await lookup.json();
  if(!Array.isArray(rows)||!rows.length)return json({error:'No cancellable subscription'},404,allowedOrigin);
  const row=rows[0];
  if(String(row.plan_id)!==planId)return json({error:'Subscription plan mismatch'},409,allowedOrigin);

  let token:string;
  try{token=await paypalAccessToken();}catch(error){console.error(error);return json({error:'PayPal billing is not configured'},500,allowedOrigin);}
  const response=await fetch(`${paypalBase()}/v1/billing/subscriptions/${encodeURIComponent(row.paypal_subscription_id)}/cancel`,{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({reason:'Cancelled by the subscriber from Droop'})
  });
  if(response.status!==204){
    console.error('PayPal cancellation failed',response.status,(await response.text()).slice(0,400));
    return json({error:'Could not cancel PayPal subscription'},502,allowedOrigin);
  }
  return json({ok:true,pending_webhook:true},200,allowedOrigin);
});
