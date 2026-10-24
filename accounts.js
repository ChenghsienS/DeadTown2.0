// Credentials go only to the same-origin server. Sessions use an HttpOnly cookie.
const Accounts=(()=>{
  let user=null,initialized=false,pending=null,epoch=0,submitting=false;
  const tr=(zh,en)=>lang==='zh'?zh:en;
  const messages={
    username_rule:['用户名只能包含英文字母和数字，长度为 10–25 个字符。','Username must contain 10–25 English letters or digits.'],
    password_rule:['密码须为 8–64 位英文字母或数字，至少包含一个大写字母。','Password must be 8–64 English letters or digits, including an uppercase letter.'],
    display_name_rule:['游戏名称为 1–20 个字符，支持各语言；不能包含换行或控制符。','Display name must be 1–20 characters in any language, without line breaks or control characters.'],
    avatar_rule:['请选择一个头像。','Choose an avatar.'],username_taken:['这个用户名已被注册，请换一个。','That username is taken. Choose another.'],
    invalid_credentials:['用户名或密码不正确。','Incorrect username or password.'],auth_required:['登录已过期，请重新登录。','Your session expired. Please sign in again.'],
    slow_down:['尝试次数过多，请稍后再试。','Too many attempts. Please try again later.'],busy:['登录服务繁忙，请稍后重试。','The account service is busy. Please retry shortly.'],
    network:['无法连接账号服务，请检查网络后重试。','Cannot reach the account service. Check your connection and retry.'],
    service_unavailable:['账号服务暂时不可用，请稍后重试。','The account service is unavailable. Please try again later.'],
    offline:['请通过游戏网站登录或注册；离线文件仍可游玩单人模式。','Open the hosted game to sign in or register. Offline solo play is still available.'],
    https_required:['请使用 https:// 游戏网址登录或注册。','Use the HTTPS game address to sign in or register.'],
    run_invalid:['这局成绩已失效，下一局会重新记录。','This run is no longer eligible. Start a new run to rank.'],
    invalid_score:['这局成绩无法计入排行榜。','This run cannot be added to the leaderboard.'],origin:['登录请求来源不匹配，请刷新游戏网页。','Request origin mismatch. Please reload the game.']
  };
  messages.run_incomplete=['这局尚未完整结算，不能领取经验。','Complete this match before claiming XP.'];
  messages.account_changed=['账号已切换；请登录原账号后重试上传成绩。','Account changed. Sign in to the original account to upload this score.'];
  function errorText(error){const pair=messages[error?.code]||messages.service_unavailable;return pair[lang==='zh'?0:1];}
  async function request(path,method='GET',body){
    if(location.protocol==='file:')throw {code:'offline'};
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    try{
      let response;try{response=await fetch('/api/'+path,{method,credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(typeof Net!=='undefined'&&Net.binding?{'X-DeadTown-Connection':Net.binding}:{})},body:body===undefined?undefined:JSON.stringify(body)});}catch{throw {code:'network'};}
      let data;try{data=await response.json();}catch{throw {code:'service_unavailable'};}
      if(!response.ok)throw {code:data.error||'service_unavailable',status:response.status,availableAt:data.availableAt,serverTime:data.serverTime};return data;
    }finally{clearTimeout(timer);}
  }
  messages.tokens_insufficient=['代币不足，请完成任务或升级。','Not enough tokens. Complete tasks or level up.'];
  messages.skin_invalid=['此皮肤不存在。','This skin does not exist.'];
  messages.developer_forbidden=['当前账号没有开发者权限。','This account does not have developer access.'];
  messages.developer_invalid=['测试数值无效，请刷新后重试。','Invalid test adjustment. Reload and retry.'];
  messages.developer_conflict=['此操作已处理，请刷新查看最新数值。','This operation was already processed. Reload to see current values.'];
  messages.skin_locked=['请先购买这套皮肤。','Purchase this skin before equipping it.'];
  function bestKey(id=user?.id){return id?'dead_town_account_best:'+id:'dead_town_supply_v2_best';}
  let clockOffset=0;
  function mergeUser(next){
    if(!next||next.id!==user?.id)return;
    const older=(next.economyRevision||0)<(user.economyRevision||0)||((next.economyRevision||0)===(user.economyRevision||0)&&(next.serverTime||0)<(user.serverTime||0));
    const totalXp=older?user.totalXp:next.totalXp;
    const keep=older?Object.fromEntries(['tokens','ownedSkins','equippedSkin','economyRevision','daily','serverTime'].map(k=>[k,user[k]])):{};
    user={...user,...next,...keep,...AccountProgress.info(totalXp)};
    if(typeof DeveloperUI!=='undefined')DeveloperUI.accountChanged();
    if(!state.running||state.gameOver)Object.assign(player,PlayerSkins.load());
    if(!older&&Number.isFinite(next.serverTime))clockOffset=next.serverTime-Date.now();epoch++;
    state.best=Math.max(state.best,user.bestScore||0);savePersonalBest();
    if(state.overlayScreen==='main'&&!state.loading)renderMainMenu();
    if(typeof EconomyUI!=='undefined')EconomyUI.refresh();
  }
  function nameWait(){return Math.max(0,(user?.nameChangeAvailableAt||0)-(Date.now()+clockOffset));}
  function nameHint(){const left=nameWait();if(!left)return tr('每次改名后需等待 72 小时；修改头像不受限制。','After changing your name, wait 72 hours. Portrait changes are unrestricted.');const hours=Math.ceil(left/3600000),days=Math.floor(hours/24),rest=hours%24;return tr(`还需 ${days} 天 ${rest} 小时才能改名，头像仍可修改。`,`Name change available in ${days}d ${rest}h. You can still change your portrait.`);}
  function updateNameLock(){const input=$('accountDisplayName'),hint=$('accountRenameHint');if(!hint||!input||!user)return;input.readOnly=nameWait()>0;hint.textContent=nameHint();}
  function setUser(next,announce=false){
    const changed=user?.id!==next?.id;user=next||null;initialized=true;epoch++;if(Number.isFinite(user?.serverTime))clockOffset=user.serverTime-Date.now();
    if(changed&&typeof Rankings!=='undefined')Rankings.cancelRun();
    if(typeof DeveloperUI!=='undefined')DeveloperUI.accountChanged(changed);
    state.playerName=user?.displayName||AccountRules.guestName(localStorage.getItem('dead_town_player_name')||'Player');
    if(!state.running||state.gameOver)Object.assign(player,PlayerSkins.load());
    if(changed&&typeof EconomyUI!=='undefined')EconomyUI.accountChanged();
    player.avatarId=user?.avatarId||'guest';player.accountId=user?.id||null;
    let saved=0;try{saved=Number(localStorage.getItem(bestKey()))||0;}catch{}
    state.best=Math.max(saved,user?.bestScore||0);
    if(announce)try{localStorage.setItem('dead_town_account_signal',String(Date.now())+Math.random());}catch{}
    if(!state.loading){
      if(Coop.client&&!state.running)Net.localize();
      else if(state.overlayScreen==='main')renderMainMenu();
      else if(state.overlayScreen==='default-name-warning'&&user)renderMainMenu();
      else if(state.overlayScreen==='gameover')renderGameOverMenu();
      updateHUD();if(typeof EconomyUI!=='undefined')EconomyUI.refresh();
    }
  }
  function refresh(){
    if(pending)return pending;const started=epoch;
    pending=request('account').then(data=>{if(epoch===started)setUser(data.user);return user;}).catch(()=>{if(epoch===started)initialized=true;return user;}).finally(()=>{pending=null;});return pending;
  }
  function badge(){
    if(user)return `<section class="accountBar" aria-label="${tr('当前账号','Current account')}">${AccountPortraits.markup(user.avatarId)}<div class="accountIdentity"><span class="label"><i class="signalDot"></i>${tr('已登录','SIGNED IN')}</span><strong>${escapeHtml(user.displayName)}</strong><small>@${escapeHtml(user.username)}</small>${ProgressUI.compact(user)}${EconomyUI.balance(user.tokens,'accountWallet')}</div><div class="accountActions"><button type="button" data-account-action="profile">${tr('账号','Account')}</button><button type="button" class="quiet" data-account-action="logout">${tr('退出','Sign out')}</button></div></section>`;
    return `<section class="accountBar guestBar">${AccountPortraits.markup('guest')}<div class="accountIdentity"><span class="label">${tr('游客身份','GUEST ACCESS')}</span><strong>${escapeHtml(state.playerName)}</strong><small>${tr('登录后可获得全球排名','Sign in to enter the global rankings')}</small>${state.overlayScreen==='main'?`<button type="button" class="guestRename quiet" data-guest-rename>${tr('修改名字','Change Name')}</button>`:''}</div><div class="accountActions"><button type="button" data-account-action="login">${tr('登录','Sign in')}</button><button type="button" class="quiet" data-account-action="register">${tr('注册','Register')}</button></div></section>`;
  }
  function bind(root=document){for(const b of root.querySelectorAll('[data-guest-rename]'))b.onclick=promptPlayerName;for(const b of root.querySelectorAll('[data-account-action]'))b.onclick=()=>b.dataset.accountAction==='logout'?logout():open(b.dataset.accountAction);}
  function open(mode='login',after){
    if(mode==='profile'&&!user)mode='login';const profile=mode==='profile',register=mode==='register';
    menuDialog={kind:'account',previous:document.activeElement};submitting=false;
    const name=profile?user.displayName:'',avatar=profile?user.avatarId:AccountRules.avatars[0];
    const title=profile?tr('幸存者档案','Survivor profile'):register?tr('建立幸存者账号','Create an account'):tr('欢迎归队','Welcome back');
    const field=(id,label,type,value,max,complete)=>`<label for="${id}">${label}</label><input id="${id}" name="${id}" type="${type}" value="${escapeHtml(value)}" maxlength="${max}" autocomplete="${complete}" required ${type==='password'?'':'spellcheck="false"'} aria-describedby="accountError">`;
    $('dialogOverlay').innerHTML=`<section class="dialogCard accountDialog" role="dialog" aria-modal="true" aria-labelledby="accountTitle"><div class="accountDialogTop"><span class="eyebrow">DEAD TOWN / SURVIVOR ID</span><button type="button" id="accountClose" class="quiet" aria-label="${tr('关闭','Close')}">×</button></div><h2 id="accountTitle">${title}</h2>${!profile?`<nav class="accountTabs" aria-label="${tr('账号操作','Account actions')}"><button type="button" id="accountLoginTab" aria-pressed="${!register}">${tr('登录','Sign in')}</button><button type="button" id="accountRegisterTab" aria-pressed="${register}">${tr('注册账号','Register')}</button></nav>`:`<p class="accountLoginName">@${escapeHtml(user.username)}</p>`}<form id="accountForm">${!profile?field('accountUsername',tr('登录用户名','Username'),'text','',25,'username')+(register?`<p class="fieldHint">${tr('10–25 位英文字母或数字 · 登录时不区分大小写','10–25 letters or digits · Sign-in is case-insensitive')}</p>`:'')+field('accountPassword',tr('密码','Password'),'password','',64,register?'new-password':'current-password')+`<label class="passwordVisibility"><input type="checkbox" id="accountShowPassword">${tr('显示密码','Show password')}</label>`+(register?`<p class="fieldHint">${tr('8–64 位英文字母或数字，至少一个大写字母','8–64 letters or digits, including an uppercase letter')}</p>`+field('accountConfirm',tr('确认密码','Confirm password'),'password','',64,'new-password'):''):''}${register||profile?field('accountDisplayName',tr('游戏内名称','Display name'),'text',name,512,'nickname')+`<p class="fieldHint"><span>${tr('支持各语言 · 最多 20 个字符','Any language · Up to 20 characters')}</span><span id="accountNameCount">${AccountRules.characters(name).length}/20</span></p>${profile?'<p id="accountRenameHint" class="fieldHint renameHint"></p>':''}<fieldset class="avatarPicker"><legend>${tr('选择你的头像','Choose your portrait')}</legend><input type="hidden" id="accountAvatar" value="${avatar}"><div class="avatarOptions">${AccountRules.avatars.map(id=>`<button type="button" data-avatar-choice="${id}" aria-pressed="${id===avatar}" title="${AccountPortraits.label(id)}">${AccountPortraits.markup(id)}<span>${AccountPortraits.label(id)}</span></button>`).join('')}</div></fieldset>`:''}<p id="accountError" class="dialogError" role="alert"></p><button id="accountSubmit" class="primary accountSubmit" type="submit">${profile?tr('保存档案','Save profile'):register?tr('注册并登录','Create account & sign in'):tr('登录','Sign in')} →</button><p class="fieldHint">${profile?tr('游戏名与头像会同步到你的账号、房间与排行榜。','Your name and portrait follow your account, squad and rankings.'):tr('无需邮箱。请保存好用户名和密码。','No email required. Keep your username and password safe.')}</p></form></section>`;
    $('dialogOverlay').classList.remove('hidden');$('accountClose').onclick=closeMenuDialog;
    if(!profile){$('accountLoginTab').onclick=()=>{if(!submitting)open('login',after);};$('accountRegisterTab').onclick=()=>{if(!submitting)open('register',after);};$('accountShowPassword').onchange=()=>{for(const id of ['accountPassword','accountConfirm'])if($(id))$(id).type=$('accountShowPassword').checked?'text':'password';};}
    if(register||profile){
      for(const button of $('dialogOverlay').querySelectorAll('[data-avatar-choice]'))button.onclick=()=>{if(submitting)return;$('accountAvatar').value=button.dataset.avatarChoice;for(const b of $('dialogOverlay').querySelectorAll('[data-avatar-choice]'))b.setAttribute('aria-pressed',String(b===button));};
      $('accountDisplayName').oninput=()=>{const n=AccountRules.characters(AccountRules.displayName($('accountDisplayName').value)).length;$('accountNameCount').textContent=n+'/20';$('accountNameCount').classList.toggle('invalid',n>20);};
    }
    if(profile)updateNameLock();
    const form=$('accountForm'),error=$('accountError'),submit=$('accountSubmit');
    form.addEventListener('input',()=>{if(!submitting)error.textContent='';});
    form.onsubmit=async e=>{
      e.preventDefault();if(submitting)return;
      const fields=profile?{}:{username:$('accountUsername').value.trim(),password:$('accountPassword').value};
      if(register||profile){fields.displayName=$('accountDisplayName').value;fields.avatarId=$('accountAvatar').value;const problem=AccountRules.validate(fields,!profile);if(problem){error.textContent=errorText({code:problem});return;}}
      if(register&&fields.password!==$('accountConfirm').value){error.textContent=tr('两次输入的密码不一致。','The passwords do not match.');return;}
      submitting=true;submit.disabled=true;error.textContent=tr('正在连接…','Connecting…');
      try{
        const data=await request(profile?'profile':register?'register':'login',profile?'PATCH':'POST',fields);
        setUser(data.user,true);if($('accountForm')===form)closeMenuDialog();Rankings.accountChanged();if(after)after();
      }catch(e){if($('accountForm')===form){if(e.code==='name_cooldown'){if(user&&Number.isFinite(e.availableAt))user.nameChangeAvailableAt=e.availableAt;if(Number.isFinite(e.serverTime))clockOffset=e.serverTime-Date.now();updateNameLock();error.textContent=nameHint();}else error.textContent=errorText(e);}}
      finally{submitting=false;submit.disabled=false;}
    };
    if(location.protocol==='file:')error.textContent=errorText({code:'offline'});
    (profile?$('accountDisplayName'):$('accountUsername')).focus();
  }
  async function logout(){
    try{await request('logout','POST',{});setUser(null,true);Rankings.accountChanged();}
    catch(e){open('profile');$('accountError').textContent=errorText(e);}
  }
  addEventListener('storage',e=>{if(e.key==='dead_town_account_signal')refresh();});
  addEventListener('focus',()=>{if(initialized&&!state.running)refresh();});
  setInterval(updateNameLock,1000);
  return {mergeUser,request,refresh,badge,bind,open,logout,errorText,bestKey,setUser,get user(){return user;},get initialized(){return initialized;}};
})();
