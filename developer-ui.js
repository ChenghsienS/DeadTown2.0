// The entry is account-specific; the server independently authorizes every write.
const DeveloperUI=(()=>{
  const OWNER='a3f337f5-dd2d-4cf9-9d17-3cab03af0329',tr=(zh,en)=>lang==='zh'?zh:en;
  let busy=false,pending=null,message='';
  const allowed=()=>Accounts.user?.id===OWNER&&Accounts.user?.canDevelop===true;
  function entry(){return allowed()?`<button type="button" id="devUnlockBtn" class="developerEntry ${state.devMode?'isActive':''}" aria-pressed="${state.devMode}" title="${tr('切换开发者模式','Toggle developer mode')}">${UIIcons.markup('tools')}<span>DEV</span><i class="developerIndicator"></i></button>`:'';}
  function markup(){
    if(!allowed()||!state.devMode)return '';
    const row=(kind,label,icon,steps)=>`<div class="developerRow"><span>${icon}${label}</span><div>${steps.map(n=>`<button type="button" data-dev-adjust="${kind}" data-delta="${n}" ${busy||pending?'disabled':''} aria-label="${label} ${n>0?'+':''}${n}">${n>0?'+':'−'}${Math.abs(n).toLocaleString('en-US')}</button>`).join('')}</div></div>`;
    return `<section class="developerAccountPanel" aria-label="${tr('开发者账号测试','Developer account tests')}"><div class="developerPanelHeading"><span class="eyebrow">${tr('开发者 / 账号测试','DEVELOPER / ACCOUNT TESTS')}</span><span class="developerLive">ON</span></div>${row('xp',tr('经验','XP'),'',[-1000,-100,100,1000])}${row('tokens',tr('代币','TOKENS'),UIIcons.markup('coin'),[-100,100])}<p class="developerHint">${tr('仅调整当前账号，立即保存。测试经验不触发升级奖励或每日任务。','Changes save to your account. Test XP does not grant level rewards or daily progress.')}</p><p class="developerMessage" role="status">${escapeHtml(message||tr('经验最低为 0，等级最高为 100；代币不会扣成负数。','XP starts at 0 and caps at level 100. Tokens cannot fall below 0.'))}</p>${pending&&!busy?`<button type="button" data-dev-retry>${tr('重试保存','Retry save')}</button>`:''}<div class="developerFooter"><button type="button" data-dev-art>${tr('美术工作台','Art Studio')} ↗</button><button type="button" class="quiet" data-dev-off>${tr('关闭测试模式','Disable tests')}</button></div></section>`;
  }
  function toggle(){if(!allowed()||busy||pending)return;state.devMode=!state.devMode;message='';Weather.arm(false);updateDevPanel();renderMainMenu();$('devUnlockBtn')?.focus();}
  function bind(root){
    const entry=root.querySelector('#devUnlockBtn');if(entry){entry.onclick=toggle;entry.disabled=busy||!!pending;}
    for(const b of root.querySelectorAll('[data-dev-adjust]'))b.onclick=()=>adjust(b.dataset.devAdjust,Number(b.dataset.delta));
    for(const b of root.querySelectorAll('[data-dev-retry]'))b.onclick=()=>adjust();
    for(const b of root.querySelectorAll('[data-dev-off]')){b.onclick=toggle;b.disabled=busy||!!pending;}
    for(const b of root.querySelectorAll('[data-dev-art]'))b.onclick=()=>{if(allowed()&&state.devMode)ArtStudio.open();};
  }
  function redraw(){if(state.overlayScreen!=='main')return;const top=$('overlayCard').scrollTop;renderMainMenu();$('overlayCard').scrollTop=top;}
  async function adjust(kind,delta){
    if(busy||!allowed()||!state.devMode||state.running)return;
    if(!pending)pending={kind,delta,requestId:crypto.randomUUID()};
    const operation=pending,accountId=Accounts.user.id;busy=true;message=tr('正在保存…','Saving…');redraw();
    try{
      const data=await Accounts.request('developer/adjust','POST',operation);
      if(Accounts.user?.id!==accountId||pending!==operation)return;
      pending=null;Accounts.mergeUser(data.user);
      message=tr('已保存。经验、等级和代币已同步。','Saved. XP, level and tokens are up to date.');
      try{localStorage.setItem('dead_town_account_signal',String(Date.now())+Math.random());}catch{}
    }catch(e){
      if(pending!==operation)return;
      message=Accounts.errorText(e);
      if(e.status&&e.status<500&&e.status!==429)pending=null;
      if(e.status===401||e.status===403)await Accounts.refresh();
    }finally{busy=false;redraw();}
  }
  function accountChanged(identityChanged=false){
    if(identityChanged||!allowed()){
      state.devMode=false;pending=null;message='';
      if(typeof Weather!=='undefined')Weather.arm(false);
      if(typeof ArtStudio!=='undefined'&&ArtStudio.isOpen)ArtStudio.close();
      if(typeof updateDevPanel==='function')updateDevPanel();
    }
  }
  return {allowed,entry,markup,bind,toggle,accountChanged};
})();
