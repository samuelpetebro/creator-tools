(()=>{'use strict';

const cfg=window.DroopSupabaseConfig||{};
const ui={
  form:document.querySelector('#auth-form'),
  email:document.querySelector('#auth-email'),
  password:document.querySelector('#auth-password'),
  submit:document.querySelector('#auth-submit'),
  switcher:document.querySelector('#auth-switch'),
  forgot:document.querySelector('#forgot-password'),
  mode:document.querySelector('#auth-mode'),
  status:document.querySelector('#auth-status'),
  signed:document.querySelector('#signed-in'),
  identity:document.querySelector('#account-email'),
  plan:document.querySelector('#account-plan'),
  usage:document.querySelector('#account-usage'),
  presets:document.querySelector('#account-presets'),
  accountStatus:document.querySelector('#account-status'),
  signout:document.querySelector('#signout'),
  guest:document.querySelector('#guest-view'),
  recovery:document.querySelector('#recovery-view'),
  recoveryForm:document.querySelector('#recovery-form'),
  recoveryPassword:document.querySelector('#recovery-password'),
  recoveryStatus:document.querySelector('#recovery-status'),
  profileForm:document.querySelector('#profile-form'),
  displayName:document.querySelector('#display-name'),
  profileStatus:document.querySelector('#profile-status'),
  passwordForm:document.querySelector('#password-form'),
  newPassword:document.querySelector('#new-password'),
  passwordStatus:document.querySelector('#password-status')
};

if(!ui.form||!window.supabase||!cfg.url||!cfg.anonKey){
  if(ui.status)ui.status.textContent='Account setup is unavailable right now.';
  return;
}

const client=window.supabase.createClient(cfg.url,cfg.anonKey);
let signup=false;
let recoveryMode=false;
const LIMITS={free:5,pro:100};

const say=(msg,error=false)=>{
  ui.status.textContent=msg||'';
  ui.status.dataset.state=error?'error':'ok';
};
const accountSay=(msg,error=false)=>{
  ui.accountStatus.textContent=msg||'';
  ui.accountStatus.dataset.state=error?'error':'ok';
};
const profileSay=(msg,error=false)=>{ui.profileStatus.textContent=msg||'';ui.profileStatus.dataset.state=error?'error':'ok';};
const passwordSay=(msg,error=false)=>{ui.passwordStatus.textContent=msg||'';ui.passwordStatus.dataset.state=error?'error':'ok';};
const recoverySay=(msg,error=false)=>{
  ui.recoveryStatus.textContent=msg||'';
  ui.recoveryStatus.dataset.state=error?'error':'ok';
};
const escapeHtml=value=>String(value).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const toolHref=slug=>slug==='extract-audio'?'/extract-audio/':`/${encodeURIComponent(slug)}.html`;
const toolLabel=slug=>String(slug||'tool').split('-').map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(' ');

async function loadAccount(session){
  if(!session)return;
  ui.identity.textContent=session.user.email||'Droop creator';
  accountSay('Loading your workspace…');

  const [{data:profile,error:profileError},{data:presets,error:presetError}]=await Promise.all([
    client.from('profiles').select('plan,email,display_name').eq('id',session.user.id).single(),
    client.from('presets').select('id,tool_slug,name,updated_at').eq('user_id',session.user.id).order('updated_at',{ascending:false})
  ]);

  if(profileError){accountSay(profileError.message,true);return;}
  if(presetError){accountSay(presetError.message,true);return;}

  const plan=profile?.plan==='pro'?'pro':'free';
  ui.displayName.value=profile?.display_name||'';
  const items=presets||[];
  ui.plan.textContent=plan.toUpperCase();
  ui.usage.textContent=`${items.length} / ${LIMITS[plan]}`;

  if(!items.length){
    ui.presets.innerHTML='<p class="account-empty">No presets saved yet. Open a tool, choose your settings and save one.</p>';
  }else{
    ui.presets.innerHTML=items.map(p=>`
      <div class="account-preset-row" data-id="${p.id}">
        <div><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(toolLabel(p.tool_slug))}</small></div>
        <a href="${toolHref(p.tool_slug)}">Open tool</a>
        <button type="button" data-delete="${p.id}" aria-label="Delete ${escapeHtml(p.name)}">Delete</button>
      </div>`).join('');
  }
  accountSay('');
}

async function render(session){
  const on=!!session;
  ui.guest.hidden=on||recoveryMode;
  ui.signed.hidden=!on||recoveryMode;
  ui.recovery.hidden=!recoveryMode;
  if(on&&!recoveryMode)await loadAccount(session);
}

ui.switcher.addEventListener('click',()=>{
  signup=!signup;
  ui.mode.textContent=signup?'Create account':'Sign in';
  ui.submit.textContent=signup?'Create account':'Sign in';
  ui.password.autocomplete=signup?'new-password':'current-password';
  ui.switcher.textContent=signup?'Already have an account? Sign in':'New to Droop? Create an account';
  ui.forgot.hidden=signup;
  say('');
});

ui.form.addEventListener('submit',async e=>{
  e.preventDefault();
  ui.submit.disabled=true;
  say('Working…');

  const email=ui.email.value.trim();
  const password=ui.password.value;
  if(password.length<8){
    say('Use at least 8 characters for your password.',true);
    ui.submit.disabled=false;
    return;
  }

  const result=signup
    ? await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/account.html'}})
    : await client.auth.signInWithPassword({email,password});

  if(result.error){
    say(result.error.message,true);
  }else if(signup&&!result.data.session){
    window.DroopAnalytics?.track?.('signup_success');
    say('Check your email to confirm your Droop account.');
  }else{
    window.DroopAnalytics?.track?.(signup?'signup_success':'login_success');
    say('You are signed in.');
    await render(result.data.session);
  }
  ui.submit.disabled=false;
});

ui.profileForm.addEventListener('submit',async e=>{e.preventDefault();const name=ui.displayName.value.trim();if(name.length>60){profileSay('Use at most 60 characters.',true);return;}const button=ui.profileForm.querySelector('button');button.disabled=true;profileSay('Saving…');const {error}=await client.from('profiles').update({display_name:name}).eq('id',(await client.auth.getUser()).data.user.id);if(error)profileSay(error.message,true);else profileSay('Account name saved.');button.disabled=false;});
ui.passwordForm.addEventListener('submit',async e=>{e.preventDefault();const password=ui.newPassword.value;if(password.length<8){passwordSay('Use at least 8 characters.',true);return;}const button=ui.passwordForm.querySelector('button');button.disabled=true;passwordSay('Updating…');const {error}=await client.auth.updateUser({password});if(error)passwordSay(error.message,true);else{ui.newPassword.value='';passwordSay('Password updated.');}button.disabled=false;});
ui.forgot.addEventListener('click',async()=>{
  const email=ui.email.value.trim();
  if(!email){say('Enter your email first, then choose Forgot password.',true);return;}
  ui.forgot.disabled=true;
  say('Sending password reset email…');
  const {error}=await client.auth.resetPasswordForEmail(email,{
    redirectTo:location.origin+'/account.html'
  });
  if(error)say(error.message,true);
  else say('Password reset email sent. Check your inbox.');
  ui.forgot.disabled=false;
});

ui.recoveryForm.addEventListener('submit',async e=>{
  e.preventDefault();
  const password=ui.recoveryPassword.value;
  if(password.length<8){recoverySay('Use at least 8 characters.',true);return;}
  const button=ui.recoveryForm.querySelector('button');
  button.disabled=true;
  recoverySay('Updating…');
  const {error}=await client.auth.updateUser({password});
  if(error){
    recoverySay(error.message,true);
  }else{
    recoveryMode=false;
    history.replaceState({},'',location.pathname);
    recoverySay('');
    const {data}=await client.auth.getSession();
    await render(data.session);
    accountSay('Password updated.');
  }
  button.disabled=false;
});

ui.presets.addEventListener('click',async e=>{
  const button=e.target.closest('[data-delete]');
  if(!button)return;
  const id=button.dataset.delete;
  if(!confirm('Delete this preset?'))return;
  button.disabled=true;
  accountSay('Deleting preset…');
  const {error}=await client.from('presets').delete().eq('id',id);
  if(error){
    accountSay(error.message,true);
    button.disabled=false;
    return;
  }
  const {data}=await client.auth.getSession();
  await loadAccount(data.session);
  accountSay('Preset deleted.');
});

ui.signout.addEventListener('click',async()=>{
  await client.auth.signOut();
  say('Signed out.');
  await render(null);
});

client.auth.onAuthStateChange((event,session)=>{
  if(event==='PASSWORD_RECOVERY'){
    recoveryMode=true;
    render(session);
    return;
  }
  if(!recoveryMode)render(session);
});

(async()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('recovery')==='1')recoveryMode=true;
  const {data,error}=await client.auth.getSession();
  if(error){say(error.message,true);return;}
  await render(data.session);
})();
})();