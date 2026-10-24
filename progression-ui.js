// Presentation of server-issued XP receipts. Never awards account XP locally.
const ProgressUI=(()=>{
  const tr=(zh,en)=>lang==='zh'?zh:en;
  let current=null,frame=0;
  const number=n=>Math.floor(n||0).toLocaleString(lang==='zh'?'zh-CN':'en-US');
  const own=()=>!!current?.accountId&&Accounts.user?.id===current.accountId;
  function levelTag(level){return level?`<span class="accountLevel">LV. ${Math.max(1,Math.min(100,Math.floor(level)))}</span>`:'';}
  function compact(user){
    const p=AccountProgress.info(user.totalXp);
    return `<div class="accountGrowth">${levelTag(p.level)}<div class="accountGrowthTrack" role="progressbar" aria-label="${tr('账号经验','Account XP')}" aria-valuemin="0" aria-valuemax="${p.nextLevelXp||1}" aria-valuenow="${p.maxed?1:p.levelXp}"><i style="width:${p.progress*100}%"></i></div><small>${p.maxed?'MAX':`${number(p.levelXp)} / ${number(p.nextLevelXp)} XP`}</small></div>`;
  }
  function begin(mode,accountId,matchId=null){current={mode,accountId,matchId,status:state.devMode?'developer':accountId?'playing':'guest',beforeXp:Accounts.user?.totalXp||0,reward:null,animationAt:null};}
  function pending(matchId){if(!current)return;current.matchId=matchId||current.matchId;if(current.accountId&&current.status!=='developer')current.status='pending';refresh();}
  function unavailable(reason='unavailable'){if(current?.accountId&&current.status!=='developer'){current.status=reason;refresh();}}
  function receive(reward,user){
    if(user&&user.id===Accounts.user?.id)Accounts.mergeUser(user);
    if(!reward||!own()||reward.accountId!==current.accountId||reward.id!==current.matchId||reward.mode!==current.mode)return;
    if(current.reward?.id===reward.id)return;
    current.reward=reward;current.status='saved';current.animationAt=null;refresh();
  }
  function coop(room){
    if(!room?.result||current?.mode!=='coop'||room.result.matchId!==current.matchId)return;
    const reward=room.result.rewards?.find(r=>r.accountId===current.accountId);
    if(reward)receive(reward);
    else if(current.accountId&&room.result.rewardState==='pending'){current.status='pending';refresh();}
    else if(current.accountId&&current.status!=='saved'){current.status='ineligible';refresh();}
  }
  function markup(){return '<div data-xp-report>'+content()+'</div>';}
  function content(){
    const status=current?.status||'guest',r=own()?current.reward:null;
    const p=AccountProgress.info(r?r.beforeXp:own()?Accounts.user.totalXp:0);
    let note=tr('开局前登录账号，完整结束对局即可获得经验。','Sign in before a match and finish it to earn account XP.');
    if(status==='developer')note=tr('开发者模式不获得账号经验。','Developer sessions do not earn account XP.');
    else if(own()&&!r)note=status==='untracked'?tr('开局时未能建立账号对局记录，本局无法发放经验。请恢复连接后开启下一局。','No account match record could be started. Reconnect before your next match to earn XP.'):status==='ineligible'?tr('本局未满足完整对局条件，不发放账号经验。','This session was not eligible for account XP.'):status==='unavailable'?tr('经验尚未保存。连接恢复后会与本局成绩一起重试。','XP is not saved yet. Your completed score will retry when the connection returns.'):tr('正在保存本局经验…','Saving match XP…');
    else if(r)note=tr('账号经验已保存','Account XP saved')+' · '+tr('每 10 分 = 1 XP','10 points = 1 XP');
    return `<section class="xpReport ${r&&r.afterLevel>r.beforeLevel?'xpLevelUp':''}" aria-label="${tr('本局账号经验','Match account XP')}"><div class="xpReportHead"><span class="eyebrow">${tr('幸存者成长','SURVIVOR PROGRESSION')}</span><strong data-xp-gain>${r?'+'+number(r.gainedXp)+' XP':'— XP'}</strong></div><div class="xpReportLevels"><strong data-xp-level>${own()?'LV. '+p.level:tr('游客','GUEST')}</strong><span data-xp-promotion>${r&&r.afterLevel>r.beforeLevel?`LV. ${r.beforeLevel} → LV. ${r.afterLevel}`:r&&r.afterLevel===100?tr('已达等级上限','LEVEL CAP REACHED'):tr('等级上限 100','LEVEL CAP 100')}</span></div><div class="xpTrack" role="progressbar" aria-label="${tr('升级进度','Level progress')}" aria-valuemin="0" aria-valuemax="${p.nextLevelXp||1}" aria-valuenow="${p.maxed?1:p.levelXp}"><i data-xp-fill style="width:${own()?p.progress*100:0}%"></i></div><div class="xpReportDetail"><span data-xp-count>${own()?(p.maxed?'MAX LEVEL':`${number(p.levelXp)} / ${number(p.nextLevelXp)} XP`):'—'}</span><span data-xp-remaining>${own()&&!p.maxed?tr(`距下一级 ${number(p.nextLevelXp-p.levelXp)} XP`,`${number(p.nextLevelXp-p.levelXp)} XP TO NEXT LEVEL`):''}</span></div><p class="xpNote" role="status">${note}</p>${own()&&!r&&current.mode==='solo'&&status==='unavailable'?`<button class="quiet" data-xp-retry>${tr('重试保存','Retry save')}</button>`:''}</section>${typeof EconomyUI!=='undefined'?EconomyUI.report(r):''}`;
  }
  function refresh(){for(const node of document.querySelectorAll('[data-xp-report]'))node.innerHTML=content();mount();}
  function mount(){
    if(typeof cancelAnimationFrame==='function')cancelAnimationFrame(frame);
    for(const button of document.querySelectorAll('[data-xp-retry]'))button.onclick=()=>Rankings.retry();
    const nodes=[...document.querySelectorAll('[data-xp-report]')],reward=own()?current.reward:null;if(!nodes.length||!reward)return;
    if(current.animationAt===null)current.animationAt=performance.now();
    const duration=Math.min(4500,1600+Math.max(0,reward.afterLevel-reward.beforeLevel)*350),started=current.animationAt;
    const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    function animate(){
      if(!own()||current.reward!==reward)return;
      const t=reduced||document.hidden?1:Math.min(1,(performance.now()-started)/duration),eased=1-Math.pow(1-t,3);
      const p=AccountProgress.info(reward.beforeXp+Math.floor(reward.gainedXp*eased));let connected=false;
      for(const node of nodes){if(!node.isConnected)continue;connected=true;
        node.querySelector('[data-xp-level]').textContent='LV. '+p.level;
        node.querySelector('[data-xp-fill]').style.width=p.progress*100+'%';
        node.querySelector('[data-xp-count]').textContent=p.maxed?'MAX LEVEL':`${number(p.levelXp)} / ${number(p.nextLevelXp)} XP`;
        node.querySelector('[data-xp-remaining]').textContent=p.maxed?'':tr(`距下一级 ${number(p.nextLevelXp-p.levelXp)} XP`,`${number(p.nextLevelXp-p.levelXp)} XP TO NEXT LEVEL`);
        const track=node.querySelector('.xpTrack');track.setAttribute('aria-valuemax',String(p.nextLevelXp||1));track.setAttribute('aria-valuenow',String(p.maxed?1:p.levelXp));
      }
      if(t<1&&connected)frame=requestAnimationFrame(animate);
    }animate();
  }
  return {begin,pending,unavailable,receive,coop,markup,mount,refresh,compact,levelTag,get current(){return current;}};
})();
