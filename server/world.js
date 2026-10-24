// Private entry points called only by the Node room worker.
globalThis.Sim=(()=>{
  let members=[],events=[],eventId=0,tick=0,seenVisuals=new WeakSet();
  const template={...player};
  const arrays=['zombies','pellets','pickups','grenades','explosions','airdrops','rockets','flameParticles','fireZones','decals'];
  globalThis.serverEvent=(type,data)=>{events.push({n:++eventId,type,data});if(events.length>600)events.shift();};
  function init(list,seed){
    resetGame(seed);state.loading=false;state.loadDone=true;state.devMode=false;
    members=list.map((m,i)=>({...template,...PlayerSkins.normalize(m),id:m.id,name:m.name,accountId:m.accountId||null,avatarId:AccountRules.validAvatar(m.avatarId)?m.avatarId:'guest',level:m.accountId?Math.max(1,Math.min(100,m.level||1)):null,score:0,kills:0,connected:true,dead:false,downed:false,downRemaining:0,reviveProgress:0,reviverId:null,x:WORLD.w/2+(i%2?24:-24),y:WORLD.h/2+(i<2?-24:24),aimX:WORLD.w/2+200,aimY:WORLD.h/2,input:{keys:new Set(),fire:false,actions:[]},ui:{}}));
    Coop.setRoster(members);player={...template};events=[];eventId=0;tick=0;seenVisuals=new WeakSet();
  }
  function input(id,data){
    const p=members.find(p=>p.id===id);if(!p||p.dead||!p.connected)return;
    p.input={keys:new Set(data.keys),fire:!p.downed&&data.fire,actions:p.downed?[]:[...(p.input.actions||[]),...(data.actions||[])].slice(0,5)};
    p.inputSeq=data.seq??p.inputSeq??0;p.aimX=data.aimX;p.aimY=data.aimY;p.inputTick=tick;
  }
  function identity(id,data){const p=members.find(p=>p.id===id);if(p){p.name=AccountRules.guestName(data.name);p.accountId=data.accountId||null;p.avatarId=AccountRules.validAvatar(data.avatarId)?data.avatarId:'guest';p.level=p.accountId?Math.max(1,Math.min(100,data.level||1)):null;}}
  function disconnect(id){const p=members.find(p=>p.id===id);if(!p)return;p.connected=false;Coop.finishDeath(p);}
  function step(dt){
    tick++;
    const anchor=Coop.living()[tick%Math.max(1,Coop.living().length)];if(anchor){player.x=anchor.x;player.y=anchor.y;}
    for(const p of members){if(tick-(p.inputTick??0)>15)p.input={keys:new Set(),fire:false,actions:[]};}
    if(state.running){
      update(dt);
      for(const p of members){if(p.ackSeq!==p.inputSeq){p.ackSeq=p.inputSeq;p.ackAge=0;}p.ackAge=(p.ackAge||0)+dt;}
    }
    // Visual-only buffers are bounded independently from gameplay entities.
    if(state.particles.length>600)state.particles.splice(0,state.particles.length-600);
    if(state.damageTexts.length>100)state.damageTexts.splice(0,state.damageTexts.length-100);
  }
  function frame(performanceStats=null){
    const births={time:state.time,particles:[],damageTexts:[]};
    for(const key of ['particles','damageTexts'])for(const p of state[key])if(!seenVisuals.has(p)){seenVisuals.add(p);births[key].push(p);}
    if(births.particles.length||births.damageTexts.length)serverEvent('visuals',births);
    const data={tick,seed:Town.seed,version:GAME_VERSION,players:members.map(({input,inputTick,inputSeq,ui,...p})=>({...p,ui})),world:{},arsenal:Arsenal.snapshot(),weather:Weather.snapshot(),bossImpacts:BossAttack.impacts,events:events.splice(0)};
    if(performanceStats)data.performance=performanceStats;
    for(const key of arrays)data.world[key]=state[key];
    for(const key of ['time','surviveTime','wave','kills','score','running','gameOver','bossAnnouncement','airdropAnnouncement','airdropAnnouncementType'])data.world[key]=state[key];
    // Rounding cuts bandwidth without changing authoritative physics.
    const internal=new Set(['navX','navY','navUntil','navRevision','artX','artY','skin','shirt','rescueX','rescueY']);
    const payload=JSON.stringify({type:'snapshot',snapshot:data},(k,v)=>internal.has(k)?undefined:typeof v==='number'&&Number.isFinite(v)?k==='ackAge'?Math.round(v*1000)/1000:Math.round(v*100)/100:v);
    return {payload,gameOver:state.gameOver,score:state.score,kills:state.kills,time:state.surviveTime,ranking:members.map(({id,name,score,kills,skinId,colorId,connected,accountId,avatarId,level})=>({id,name,score,kills,skinId,colorId,connected,accountId,avatarId,level})).sort((a,b)=>b.score-a.score||b.kills-a.kills||a.id.localeCompare(b.id))};
  }
  function snapshot(){return JSON.parse(frame().payload).snapshot;}
  return {init,input,disconnect,identity,step,snapshot,frame};
})();
