// New rankings are bound to account IDs. The previous Supabase board is read-only.
const Rankings=(()=>{
  const LEGACY_URL='https://yluretxiufiiwyggpuvo.supabase.co/rest/v1/leaderboard?select=player_name,best_score,updated_at&order=best_score.desc,updated_at.asc&limit=10';
  const LEGACY_KEY='sb_publishable_LU-09j2m_Qa6c07nCuGyBQ_XWbcCBE6';
  const CACHE='dead_town_account_ranking_v1',PENDING='dead_town_account_scores_v1';
  let historical=false,loading=null,flushing=null,queue=[],run=null,error='',pendingError='',generation=0,showingCache=false;
  const tr=(zh,en)=>lang==='zh'?zh:en;
  function normalizeRows(rows){return Array.isArray(rows)?rows.filter(r=>r&&typeof r.player_name==='string'&&r.player_name.trim()&&r.player_name.length<=512&&Number.isSafeInteger(Number(r.best_score))&&Number(r.best_score)>=0).slice(0,10).map(r=>({accountId:typeof r.accountId==='string'?r.accountId:null,player_name:r.player_name,avatarId:AccountRules.validAvatar(r.avatarId)?r.avatarId:'guest',best_score:Number(r.best_score),updated_at:typeof r.updated_at==='string'?r.updated_at:''})):[];}
  function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}}
  function save(){try{localStorage.setItem(PENDING,JSON.stringify(queue));}catch{pendingError=tr('成绩暂存于当前页面，请保持页面打开以重试。','Score is waiting in this tab. Keep it open to retry.');}}
  function restore(){state.leaderboard=normalizeRows(read(CACHE,[]));showingCache=state.leaderboard.length>0;const saved=read(PENDING,[]);if(Array.isArray(saved))queue=saved.filter(r=>r&&typeof r.accountId==='string'&&typeof r.runId==='string'&&Number.isSafeInteger(r.score)&&r.score>=0&&Number.isFinite(r.duration)&&r.duration>=0&&r.developer===false&&r.created>Date.now()-86400000).slice(-30);}
  function refreshPanels(){if(state.loading)return;for(const panel of document.querySelectorAll('[data-leaderboard-panel]'))panel.innerHTML=markup();bind();}
  async function load(){
    if(loading)return loading;const mode=historical,serial=++generation;state.leaderboardLoading=true;error='';refreshPanels();
    loading=(async()=>{
      try{
        let rows;
        if(mode){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const r=await fetch(LEGACY_URL,{signal:controller.signal,credentials:'omit',headers:{apikey:LEGACY_KEY}});if(!r.ok)throw {code:'service_unavailable'};rows=await r.json();}finally{clearTimeout(timer);}}
        else rows=(await Accounts.request('leaderboard')).rows;
        if(!Array.isArray(rows))throw {code:'service_unavailable'};
        rows=normalizeRows(rows);
        if(serial===generation){state.leaderboard=rows;state.leaderboardLoaded=true;showingCache=false;if(!mode)try{localStorage.setItem(CACHE,JSON.stringify(rows));}catch{}}
      }catch(e){if(serial===generation)error=Accounts.errorText(e);}
      finally{state.leaderboardLoading=false;loading=null;refreshPanels();}
    })();return loading;
  }
  function markup(){
    const own=Accounts.user?.id,notes=[];
    if(historical)notes.push(tr('旧版历史成绩，仅供查看，不与新账号合并。','Legacy scores are read-only and are not linked to new accounts.'));
    if(showingCache)notes.push(tr('上次下载的榜单 · 正在等待刷新','Previously downloaded standings · Awaiting refresh'));
    if(error)notes.push(error);if(pendingError)notes.push(pendingError);
    if(queue.some(r=>r.accountId===own))notes.push(tr('成绩等待上传，连接恢复后会自动重试。','A score is waiting to upload and will retry automatically.'));
    const rows=state.leaderboard||[];
    return `<section><div class="leaderboardHead"><h3>${historical?tr('旧版历史榜','Legacy rankings'):tr('全球前十排行榜','Global Top 10')}</h3><button id="refreshLeaderboardBtn" class="quiet" ${state.leaderboardLoading?'disabled':''}>${state.leaderboardLoading?tr('加载中…','Loading…'):tr('刷新','Refresh')}</button></div><div class="rankingTabs"><button id="accountBoardTab" aria-pressed="${!historical}">${tr('账号排行','Account ranks')}</button><button id="legacyBoardTab" aria-pressed="${historical}">${tr('历史榜','Legacy')}</button></div>${rows.length?`<ol class="leaderboardList">${rows.map((r,i)=>`<li class="leaderboardRow accountRankRow ${!historical&&r.accountId===own?'active':''}"><span class="rank">${String(i+1).padStart(2,'0')}</span>${AccountPortraits.markup(historical?'guest':r.avatarId)}<span class="leaderName">${escapeHtml(r.player_name)}${!historical&&r.accountId===own?`<span class="youTag">${tr('当前','YOU')}</span>`:''}</span><span class="leaderScore">${Math.floor(r.best_score)}</span></li>`).join('')}</ol>`:`<div class="emptyBoard"><span class="signalGlyph">· · ·</span><p>${state.leaderboardLoading?tr('正在加载排行榜…','Loading rankings…'):error?escapeHtml(error):tr('尚无成绩，下一位幸存者就是你。','No scores yet. Be the first survivor.')}</p></div>`}${!Accounts.user?`<div class="rankLoginPrompt"><p>${tr('登录或注册后，单人成绩才能计入全球排行。','Sign in or register to enter your solo scores in the global rankings.')}</p><button data-account-action="login">${tr('登录','Sign in')}</button><button data-account-action="register" class="quiet">${tr('注册','Register')}</button></div>`:''}${notes.map(n=>`<p class="boardNote" role="status">${escapeHtml(n)}</p>`).join('')}</section>`;
  }
  function select(mode){if(historical===mode||loading)return;historical=mode;state.leaderboard=[];state.leaderboardLoaded=false;showingCache=false;load();}
  function bind(){if($('refreshLeaderboardBtn'))$('refreshLeaderboardBtn').onclick=retry;if($('accountBoardTab'))$('accountBoardTab').onclick=()=>select(false);if($('legacyBoardTab'))$('legacyBoardTab').onclick=()=>select(true);Accounts.bind();}
  function cancelRun(){run=null;}
  function begin(){
    cancelRun();if(!Accounts.user||state.devMode||Coop.client)return;
    const current=run={accountId:Accounts.user.id,promise:null};
    current.promise=Accounts.request('runs','POST',{accountId:current.accountId}).then(r=>{if(r.accountId===current.accountId)return r;return null;}).catch(e=>{pendingError=Accounts.errorText(e);return null;});
  }
  async function submit(score){
    const current=run;run=null;
    if(!current||!Accounts.user||current.accountId!==Accounts.user.id||state.devMode||Coop.client)return false;
    const duration=state.surviveTime,started=await current.promise;
    if(!started||Accounts.user?.id!==current.accountId)return false;
    queue.push({accountId:current.accountId,runId:started.runId,score:Math.floor(score),duration,developer:false,created:Date.now()});save();return flush();
  }
  function flush(){
    if(flushing)return flushing;if(!Accounts.user)return Promise.resolve(false);
    const accountId=Accounts.user.id;if(!queue.some(r=>r.accountId===accountId))return Promise.resolve(true);
    pendingError='';state.leaderboardSyncing=true;
    const operation=(async()=>{
      try{
        for(const item of queue.filter(r=>r.accountId===accountId)){
          if(Accounts.user?.id!==accountId)break;
          try{const data=await Accounts.request('scores','POST',item);if(Accounts.user?.id===accountId){Accounts.user.bestScore=data.user.bestScore;state.best=Math.max(state.best,data.user.bestScore);savePersonalBest();}}
          catch(e){if(['run_invalid','invalid_score'].includes(e.code)){queue=queue.filter(r=>r!==item);save();}throw e;}
          queue=queue.filter(r=>r!==item);save();
        }return true;
      }catch(e){pendingError=Accounts.errorText(e);return false;}
      finally{state.leaderboardSyncing=false;refreshPanels();}
    })();
    // A completed empty/changed-account loop must not leave a resolved promise
    // latched as "in flight". Cleanup always runs after assignment.
    flushing=operation.finally(()=>{flushing=null;if(!pendingError)load();});return flushing;
  }
  async function retry(){await flush();return load();}
  function accountChanged(){pendingError='';refreshPanels();retry();}
  addEventListener('online',retry);
  setInterval(()=>{if(!document.hidden&&!state.running&&(error||queue.some(r=>r.accountId===Accounts.user?.id)))retry();},30000);
  return {restore,markup,bind,refreshPanels,load,begin,submit,flush,retry,cancelRun,accountChanged};
})();
