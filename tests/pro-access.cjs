const fs=require('fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const code=fs.readFileSync('js/pro-access.js','utf8');

async function boot(plan,{signed=true}={}){
  const client={
    auth:{getSession:async()=>({data:{session:signed?{user:{id:'user-1'}}:null},error:null})},
    from(table){
      assert.equal(table,'profiles');
      const q={select(){return q;},eq(){return q;},single:async()=>({data:{plan},error:null})};
      return q;
    }
  };
  const context={
    window:{
      DroopSupabaseConfig:{url:'https://example.supabase.co',anonKey:'public-test-key'},
      supabase:{createClient:()=>client}
    },
    document:{scripts:[],head:{appendChild(){}}},
    navigator:{language:'en'},
    localStorage:{getItem:()=>null},
    console
  };
  vm.runInNewContext(code,context);
  return context.window.DroopProAccess.ready;
}

(async()=>{
  const guest=await boot('pro',{signed:false});
  assert.equal(guest.authenticated,false);
  assert.equal(guest.isPro,false,'a missing session must never inherit Pro');

  const free=await boot('free');
  assert.equal(free.authenticated,true);
  assert.equal(free.plan,'free');
  assert.equal(free.isPro,false);

  const pro=await boot('pro');
  assert.equal(pro.authenticated,true);
  assert.equal(pro.plan,'pro');
  assert.equal(pro.isPro,true);

  console.log('pro access checks: ok');
})().catch(error=>{console.error(error);process.exit(1);});
