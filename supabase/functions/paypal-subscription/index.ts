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

Deno.serve(async request=>{
  let appUrl:string,originAllowed:string;
  try{appUrl=requiredEnv('DROOP_APP_URL');originAllowed=new URL(appUrl).origin;}
  catch(error){console.error(error);return json({error:'Billing status is not configured'},500);}
  const origin=request.headers.get('origin')||'';
  if(origin&&origin!==originAllowed)return json({error:'Origin not allowed'},403,originAllowed);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{
    'access-control-allow-origin':originAllowed,
    'access-control-allow-headers':'authorization, content-type, apikey',
    'access-control-allow-methods':'POST, OPTIONS','vary':'Origin'
  }});
  if(request.method!=='POST')return json({error:'Method not allowed'},405,originAllowed);

  const authHeader=request.headers.get('authorization')||'';
  if(!authHeader.toLowerCase().startsWith('bearer '))return json({error:'Sign in required'},401,originAllowed);

  let supabaseUrl:string,anonKey:string,serviceKey:string,sandbox:boolean;
  try{
    supabaseUrl=requiredEnv('SUPABASE_URL');
    anonKey=supabasePublishableKey();
    serviceKey=supabaseSecretKey();
    const mode=requiredEnv('PAYPAL_SANDBOX');
    if(mode!=='true'&&mode!=='false')throw new Error('Invalid PAYPAL_SANDBOX');
    sandbox=mode==='true';
  }catch(error){console.error(error);return json({error:'Server configuration is missing'},500,originAllowed);}

  const auth=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:{apikey:anonKey,Authorization:authHeader}});
  if(!auth.ok)return json({error:'Invalid session'},401,originAllowed);
  const user=await auth.json();
  if(!user?.id)return json({error:'Invalid session user'},401,originAllowed);

  const params=new URLSearchParams({
    select:'paypal_subscription_id,status,sandbox,next_billing_at,paypal_updated_at,updated_at',
    user_id:`eq.${user.id}`,
    sandbox:`eq.${sandbox}`,
    order:'updated_at.desc',
    limit:'1'
  });
  const response=await fetch(`${supabaseUrl}/rest/v1/paypal_billing_subscriptions?${params}`,{headers:serviceHeaders(serviceKey)});
  if(!response.ok){console.error('PayPal billing lookup failed',response.status,(await response.text()).slice(0,300));return json({error:'Could not load subscription'},500,originAllowed);}
  const rows=await response.json();
  if(!Array.isArray(rows)||!rows.length)return json({error:'No PayPal subscription'},404,originAllowed);
  const row=rows[0];
  return json({
    status:row.status,
    sandbox:Boolean(row.sandbox),
    next_billing_at:row.next_billing_at||null,
    subscription_id:row.paypal_subscription_id
  },200,originAllowed);
});
