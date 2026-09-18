const json=(body:Record<string,unknown>,status=200,origin='')=>new Response(JSON.stringify(body),{
  status,
  headers:{
    'content-type':'application/json',
    ...(origin?{'access-control-allow-origin':origin,'vary':'Origin'}:{})
  }
});

function requiredEnv(name:string){
  const value=Deno.env.get(name)?.trim();
  if(!value)throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

Deno.serve(async request=>{
  const appUrl=requiredEnv('DROOP_APP_URL');
  const allowedOrigin=new URL(appUrl).origin;
  const origin=request.headers.get('origin')||'';

  if(origin&&origin!==allowedOrigin)return json({error:'Origin not allowed'},403);
  if(request.method==='OPTIONS'){
    return new Response(null,{status:204,headers:{
      'access-control-allow-origin':allowedOrigin,
      'access-control-allow-headers':'authorization, content-type, apikey',
      'access-control-allow-methods':'POST, OPTIONS',
      'vary':'Origin'
    }});
  }
  if(request.method!=='POST')return json({error:'Method not allowed'},405,allowedOrigin);

  const authHeader=request.headers.get('authorization')||'';
  if(!authHeader.toLowerCase().startsWith('bearer '))return json({error:'Sign in required'},401,allowedOrigin);

  const supabaseUrl=requiredEnv('SUPABASE_URL');
  const anonKey=requiredEnv('SUPABASE_ANON_KEY');
  const authResponse=await fetch(`${supabaseUrl}/auth/v1/user`,{
    headers:{apikey:anonKey,Authorization:authHeader}
  });
  if(!authResponse.ok)return json({error:'Invalid session'},401,allowedOrigin);
  const user=await authResponse.json();
  if(!user?.id||!user?.email)return json({error:'Invalid session user'},401,allowedOrigin);

  const apiKey=requiredEnv('LEMON_SQUEEZY_API_KEY');
  const storeId=requiredEnv('LEMON_SQUEEZY_STORE_ID');
  const variantId=requiredEnv('LEMON_SQUEEZY_PRO_VARIANT_ID');
  const mode=requiredEnv('LEMON_SQUEEZY_CHECKOUT_TEST_MODE');
  if(!/^\d+$/.test(storeId)||!/^\d+$/.test(variantId))return json({error:'Billing IDs are invalid'},500,allowedOrigin);
  if(mode!=='true'&&mode!=='false')return json({error:'Billing mode is invalid'},500,allowedOrigin);

  const lemon=await fetch('https://api.lemonsqueezy.com/v1/checkouts',{
    method:'POST',
    headers:{
      Accept:'application/vnd.api+json',
      'Content-Type':'application/vnd.api+json',
      Authorization:`Bearer ${apiKey}`
    },
    body:JSON.stringify({
      data:{
        type:'checkouts',
        attributes:{
          test_mode:mode==='true',
          product_options:{
            enabled_variants:[Number(variantId)],
            redirect_url:`${allowedOrigin}/account.html?billing=success`,
            receipt_button_text:'Back to Droop'
          },
          checkout_options:{
            embed:false,
            media:false,
            logo:true
          },
          checkout_data:{
            email:user.email,
            custom:{user_id:user.id}
          }
        },
        relationships:{
          store:{data:{type:'stores',id:String(storeId)}},
          variant:{data:{type:'variants',id:String(variantId)}}
        }
      }
    })
  });

  if(!lemon.ok){
    const detail=(await lemon.text()).slice(0,500);
    console.error('Lemon checkout creation failed',lemon.status,detail);
    return json({error:'Could not create checkout'},502,allowedOrigin);
  }

  const payload=await lemon.json();
  const url=payload?.data?.attributes?.url;
  if(typeof url!=='string'||!url.startsWith('https://'))return json({error:'Checkout URL missing'},502,allowedOrigin);

  return json({url},200,allowedOrigin);
});
