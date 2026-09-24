const json=(body:Record<string,unknown>,status=200,origin='')=>new Response(JSON.stringify(body),{
  status,
  headers:{'content-type':'application/json',...(origin?{'access-control-allow-origin':origin,'vary':'Origin'}:{})}
});

function requiredEnv(name:string){
  const value=Deno.env.get(name)?.trim();
  if(!value)throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function supabasePublishableKey(){
  const modern=Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if(modern){try{const parsed=JSON.parse(modern);if(parsed?.default)return String(parsed.default);}catch{}}
  const legacy=Deno.env.get('SUPABASE_ANON_KEY');
  if(legacy)return legacy;
  throw new Error('Supabase publishable key is missing');
}

function paypalBase(){
  const sandbox=requiredEnv('PAYPAL_SANDBOX');
  if(sandbox!=='true'&&sandbox!=='false')throw new Error('PAYPAL_SANDBOX must be true or false');
  return sandbox==='true'?'https://api-m.sandbox.paypal.com':'https://api-m.paypal.com';
}

async function paypalAccessToken(){
  const clientId=requiredEnv('PAYPAL_CLIENT_ID');
  const secret=requiredEnv('PAYPAL_CLIENT_SECRET');
  const response=await fetch(`${paypalBase()}/v1/oauth2/token`,{
    method:'POST',
    headers:{
      Authorization:'Basic '+btoa(`${clientId}:${secret}`),
      'Content-Type':'application/x-www-form-urlencoded',
      Accept:'application/json'
    },
    body:'grant_type=client_credentials'
  });
  if(!response.ok){
    console.error('PayPal token failed',response.status,(await response.text()).slice(0,300));
    throw new Error('Could not authenticate with PayPal');
  }
  const payload=await response.json();
  if(typeof payload?.access_token!=='string')throw new Error('PayPal access token missing');
  return payload.access_token as string;
}

Deno.serve(async request=>{
  let appUrl:string,allowedOrigin:string;
  try{appUrl=requiredEnv('DROOP_APP_URL');allowedOrigin=new URL(appUrl).origin;}
  catch(error){console.error(error);return json({error:'Checkout is not configured'},500);}

  const origin=request.headers.get('origin')||'';
  if(origin&&origin!==allowedOrigin)return json({error:'Origin not allowed'},403,allowedOrigin);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{
    'access-control-allow-origin':allowedOrigin,
    'access-control-allow-headers':'authorization, content-type, apikey',
    'access-control-allow-methods':'POST, OPTIONS',
    'vary':'Origin'
  }});
  if(request.method!=='POST')return json({error:'Method not allowed'},405,allowedOrigin);

  const authHeader=request.headers.get('authorization')||'';
  if(!authHeader.toLowerCase().startsWith('bearer '))return json({error:'Sign in required'},401,allowedOrigin);

  let supabaseUrl:string,anonKey:string;
  try{supabaseUrl=requiredEnv('SUPABASE_URL');anonKey=supabasePublishableKey();}
  catch(error){console.error(error);return json({error:'Server configuration is missing'},500,allowedOrigin);}

  const authResponse=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:{apikey:anonKey,Authorization:authHeader}});
  if(!authResponse.ok)return json({error:'Invalid session'},401,allowedOrigin);
  const user=await authResponse.json();
  if(!user?.id||!user?.email)return json({error:'Invalid session user'},401,allowedOrigin);

  let planId:string,accessToken:string;
  try{
    planId=requiredEnv('PAYPAL_PLAN_ID');
    accessToken=await paypalAccessToken();
  }catch(error){
    console.error(error);
    return json({error:'PayPal billing is not configured'},500,allowedOrigin);
  }

  const response=await fetch(`${paypalBase()}/v1/billing/subscriptions`,{
    method:'POST',
    headers:{
      Authorization:`Bearer ${accessToken}`,
      'Content-Type':'application/json',
      Accept:'application/json',
      'PayPal-Request-Id':crypto.randomUUID()
    },
    body:JSON.stringify({
      plan_id:planId,
      custom_id:String(user.id),
      subscriber:{email_address:String(user.email)},
      application_context:{
        brand_name:'Droop',
        locale:'en-US',
        shipping_preference:'NO_SHIPPING',
        user_action:'SUBSCRIBE_NOW',
        return_url:`${allowedOrigin}/account.html?billing=success&provider=paypal`,
        cancel_url:`${allowedOrigin}/pro.html?billing=cancelled&provider=paypal`
      }
    })
  });

  if(!response.ok){
    const detail=(await response.text()).slice(0,600);
    console.error('PayPal subscription creation failed',response.status,detail);
    return json({error:'Could not create PayPal checkout'},502,allowedOrigin);
  }

  const payload=await response.json();
  if(String(payload?.plan_id||'')!==planId)return json({error:'PayPal plan mismatch'},502,allowedOrigin);
  const approval=Array.isArray(payload?.links)?payload.links.find((link:any)=>link?.rel==='approve'&&typeof link?.href==='string'):null;
  if(!approval?.href||!String(approval.href).startsWith('https://'))return json({error:'PayPal approval URL missing'},502,allowedOrigin);

  return json({url:String(approval.href),subscription_id:String(payload?.id||'')},200,allowedOrigin);
});
