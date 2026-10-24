// Account cosmetics and daily objectives. All mutations use authenticated APIs.
const EconomyUI=(()=>{
  const tr=(zh,en)=>lang==='zh'?zh:en,number=n=>Math.floor(n||0).toLocaleString(lang==='zh'?'zh-CN':'en-US');
  let tab='wardrobe',busy=false,message='',offset=0,resetRetryAt=0;
  const owned=id=>!!Accounts.user?.ownedSkins?.includes(id);
  const equipped=()=>PlayerSkins.key(Accounts.user?.equippedSkin);
  function tokenText(value){return `${number(value)} ${tr('代币','TOKENS')}`;}
  function profile(){
    const u=Accounts.user;if(!u)return '';
    return `<section class="survivorDossier"><button type="button" class="survivorPreview" data-wardrobe aria-label="${tr('打开更换皮肤界面','Open wardrobe')}"><canvas width="108" height="126" data-outfit="${equipped()}" aria-hidden="true"></canvas><span><small class="eyebrow">${tr('个人形象','SURVIVOR DOSSIER')}</small><strong>${escapeHtml(u.displayName)}</strong><small>${PlayerSkins.label(u.equippedSkin,lang)}</small><b>${tr('更换皮肤','CHANGE SKIN')} ↗</b></span></button><div class="dossierBottom"><strong class="tokenBalance" data-token-balance>${tokenText(u.tokens)}</strong><button type="button" data-shop>${tr('商店','Shop')} →</button></div></section>`;
  }
  function paint(root=document){
    for(const canvas of root.querySelectorAll('[data-outfit]')){
      const item=AccountEconomy.get(canvas.dataset.outfit);if(!item)continue;
      const g=canvas.getContext('2d');g.clearRect(0,0,canvas.width,canvas.height);g.imageSmoothingEnabled=false;
      g.drawImage(PixelArt.sprite('player','idle',0,0,0,false,item),0,0,canvas.width,canvas.height);
    }
  }
  function bind(root=document){
    paint(root);
    for(const b of root.querySelectorAll('[data-wardrobe]'))b.onclick=()=>open('wardrobe');
    for(const b of root.querySelectorAll('[data-shop]'))b.onclick=()=>open('shop');
  }
  function difficulty(value){return {easy:tr('简单','EASY'),medium:tr('中等','MEDIUM'),hard:tr('困难','HARD')}[value];}
  function taskLabel(t){
    if(t.metric==='matches')return tr(`完整结束 ${t.target} 局`,`Finish ${t.target} match`);
    if(t.metric==='kills')return tr(`累计击杀 ${t.target} 只丧尸`,`Defeat ${t.target} zombies in total`);
    if(t.metric==='seconds')return tr(`累计完成对局 ${t.target} 秒`,`Complete ${t.target} seconds of match time`);
    if(t.metric==='score')return tr(`累计获得 ${number(t.target)} 个人分数`,`Earn ${number(t.target)} personal points in total`);
    return tr(`单局获得 ${number(t.target)} 个人分数`,`Earn ${number(t.target)} personal points in one match`);
  }
  function taskRows(daily,before){return daily.tasks.map(t=>{
    const old=before?.tasks.find(x=>x.id===t.id),delta=old?Math.max(0,t.progress-old.progress):0;
    return `<li class="dailyTask ${t.claimed?'taskComplete':''}" data-task-id="${t.id}"><div class="taskTitle"><span class="taskDifficulty ${t.difficulty}">${difficulty(t.difficulty)}</span><strong>${taskLabel(t)}</strong><span class="taskPrize">+${t.reward}</span></div><div class="taskTrack" role="progressbar" aria-label="${taskLabel(t)}" aria-valuemin="0" aria-valuemax="${t.target}" aria-valuenow="${t.progress}"><i style="width:${100*t.progress/t.target}%"></i></div><div class="taskDetail"><span>${number(t.progress)} / ${number(t.target)}${delta?` <b>+${number(delta)}</b>`:''}</span><span>${t.claimed?tr('已发放代币','TOKENS RECEIVED'):tr('完成自动领取','AUTO REWARD')}</span></div></li>`;
  }).join('');}
  function dailyContent(){
    const d=Accounts.user?.daily;if(!d)return '';
    const count=d.tasks.filter(t=>t.claimed).length;
    return `<div class="dailyHeader"><div><span class="eyebrow">${tr('每日行动','DAILY OPERATIONS')}</span><h3>${tr('今日任务','Daily tasks')}</h3></div><strong>${count} / 6</strong></div><p class="dailyReset">${tr('纽约时间 08:00 刷新','Resets at 08:00 New York time')} · <span data-daily-countdown></span></p><ul class="dailyList">${taskRows(d)}</ul><p class="boardNote">${tr('单人 / 多人共用进度 · 正常结束对局后结算个人数据 · 全部完成可得 155 代币','Shared solo / co-op progress · Personal stats from completed matches · 155 tokens per day')}</p>`;
  }
  function dailyMarkup(){return Accounts.user?`<section class="dailyPanel" data-daily-panel>${dailyContent()}</section>`:'';}
  function report(reward){
    if(!Accounts.user)return '';
    const d=reward?.daily?.after||Accounts.user.daily;if(!d)return '';
    return `<section class="economyReport" aria-label="${tr('代币与任务结算','Tokens and daily progress')}"><div class="rewardLine"><span>${tr('本局代币','MATCH TOKENS')}</span><strong>${reward?'+'+number(reward.gainedTokens):'—'}</strong></div><p class="rewardBreakdown">${reward?tr(`升级奖励 +${reward.levelTokens||0} · 任务奖励 +${reward.taskTokens||0}`,`Level rewards +${reward.levelTokens||0} · Task rewards +${reward.taskTokens||0}`):tr('等待有效对局结算；开发者模式和中途退出不计入任务。','Awaiting an eligible completed match. Developer mode and early exits do not count.')}</p><div class="dailyHeader"><h3>${tr('每日任务进度','Daily task progress')}</h3><small>${d.key}</small></div><ul class="dailyList">${taskRows(d,reward?.daily?.before)}</ul><p class="boardNote">${tr('纽约时间每天 08:00 刷新 · 跨日对局按服务器结算时间归属','Resets daily at 08:00 New York time · Matches count on server completion')}</p></section>`;
  }
  function open(mode='wardrobe'){
    if(!Accounts.user)return;if(state.running&&!state.gameOver)return;
    if(menuDialog?.kind!=='cosmetics')menuDialog={kind:'cosmetics',previous:document.activeElement};
    tab=mode;message='';renderDialog();$('cosmeticsClose')?.focus();
    Accounts.refresh().then(()=>{if(menuDialog?.kind==='cosmetics'&&!busy)renderDialog();});
  }
  function renderDialog(){
    const u=Accounts.user;if(!u){if(menuDialog?.kind==='cosmetics')closeMenuDialog();return;}
    const overlay=$('dialogOverlay'),oldScroll=overlay.querySelector('.cosmeticGrid')?.scrollTop||0;
    const items=tab==='shop'?AccountEconomy.catalog.filter(s=>s.price>0):AccountEconomy.catalog.filter(s=>owned(s.id));
    overlay.innerHTML=`<section class="dialogCard cosmeticDialog" role="dialog" aria-modal="true" aria-labelledby="cosmeticsTitle"><div class="accountDialogTop"><span class="eyebrow">DEAD TOWN / QUARTERMASTER</span><button type="button" id="cosmeticsClose" class="quiet" aria-label="${tr('关闭','Close')}">×</button></div><div class="cosmeticHeading"><h2 id="cosmeticsTitle">${tab==='shop'?tr('补给商店','Supply shop'):tr('更换皮肤','Your wardrobe')}</h2><strong class="tokenBalance" data-token-balance>${tokenText(u.tokens)}</strong></div><p class="cosmeticIntro">${tr('每套配色都是独立皮肤。蓝色品质 100 代币；每升一级获得 150 代币。','Each color is a separate skin. Blue rarity costs 100 tokens; every level-up grants 150 tokens.')}</p><nav class="accountTabs"><button type="button" data-cosmetic-tab="wardrobe" aria-pressed="${tab==='wardrobe'}">${tr('已拥有','Owned')} (${u.ownedSkins.length})</button><button type="button" data-cosmetic-tab="shop" aria-pressed="${tab==='shop'}">${tr('商店','Shop')} (15)</button></nav><p class="cosmeticMessage" id="cosmeticMessage" role="status">${escapeHtml(message||tr('外观与代币跟随账号保存，单人 / 多人通用。','Your account saves skins and tokens across solo and co-op.'))}</p><div class="cosmeticGrid">${items.map(s=>{
      const isOwned=owned(s.id),active=equipped()===s.id;
      return `<article class="cosmeticItem ${s.rarity==='blue'?'rarityBlue':'rarityStarter'} ${active?'isEquipped':''}" data-cosmetic-item="${s.id}"><div class="cosmeticArt"><span class="rarityLabel">${s.price?tr('蓝色品质','BLUE RARITY'):tr('初始皮肤','STARTER')}</span><canvas width="108" height="126" data-outfit="${s.id}" aria-hidden="true"></canvas></div><strong>${PlayerSkins.label(s,lang)}</strong><button type="button" data-cosmetic-action="${isOwned?'equip':'buy'}" data-item="${s.id}" ${busy||active||(!isOwned&&u.tokens<s.price)?'disabled':''}>${active?tr('已装备','EQUIPPED'):isOwned?tr('装备','EQUIP'):tr('购买 · 100 代币','BUY · 100 TOKENS')}</button>${!isOwned&&u.tokens<s.price?`<small>${tr('代币不足','Not enough tokens')}</small>`:''}</article>`;
    }).join('')}</div></section>`;
    overlay.classList.remove('hidden');paint(overlay);
    $('cosmeticsClose').onclick=closeMenuDialog;
    for(const b of overlay.querySelectorAll('[data-cosmetic-tab]'))b.onclick=()=>{if(!busy){tab=b.dataset.cosmeticTab;message='';renderDialog();}};
    for(const b of overlay.querySelectorAll('[data-cosmetic-action]'))b.onclick=()=>mutate(b.dataset.cosmeticAction,b.dataset.item);
    overlay.querySelector('.cosmeticGrid').scrollTop=oldScroll;
  }
  async function mutate(action,id){
    if(busy||!Accounts.user)return;const accountId=Accounts.user.id;busy=true;message=tr('正在保存…','Saving…');renderDialog();
    try{
      const data=await Accounts.request(action==='buy'?'shop/purchase':'appearance',action==='buy'?'POST':'PATCH',{skin:id});
      if(Accounts.user?.id!==accountId)return;
      Accounts.mergeUser(data.user);message=action==='buy'?tr('购买成功，点击“装备”即可使用。','Purchased. Select EQUIP to use this skin.'):tr('皮肤已装备并保存。','Skin equipped and saved.');
      if(Coop.client&&!state.running)Net.localize();else if(state.overlayScreen==='gameover')renderGameOverMenu();
      try{localStorage.setItem('dead_town_account_signal',String(Date.now())+Math.random());}catch{}
    }catch(e){message=Accounts.errorText(e);}
    finally{busy=false;if(menuDialog?.kind==='cosmetics')renderDialog();}
  }
  function countdown(){
    const d=Accounts.user?.daily;if(!d)return;
    const left=Math.max(0,d.nextResetAt-(Date.now()+offset)),seconds=Math.ceil(left/1000),h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60);
    for(const el of document.querySelectorAll('[data-daily-countdown]'))el.textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
    if(!left&&!document.hidden&&!state.running&&Date.now()>resetRetryAt){resetRetryAt=Date.now()+30000;Accounts.refresh().then(refresh);}
  }
  function refresh(){
    const u=Accounts.user;if(!u)return;if(Number.isFinite(u.serverTime))offset=u.serverTime-Date.now();
    for(const el of document.querySelectorAll('[data-daily-panel]'))el.innerHTML=dailyContent();
    for(const el of document.querySelectorAll('[data-token-balance]'))el.textContent=tokenText(u.tokens);
    if(menuDialog?.kind==='cosmetics'&&!busy)renderDialog();countdown();
  }
  function accountChanged(){if(typeof menuDialog!=='undefined'&&menuDialog?.kind==='cosmetics')closeMenuDialog();resetRetryAt=0;}
  setInterval(countdown,1000);
  addEventListener('focus',()=>{if(typeof Accounts!=='undefined'&&Accounts.user&&!state.running)Accounts.refresh().then(refresh);});
  return {profile,paint,bind,dailyMarkup,report,open,refresh,accountChanged};
})();
