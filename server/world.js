// Private entry points called only by the Node room worker.
globalThis.Sim=(()=>{
  let members=[],events=[],eventId=0,tick=0;
  const template={...player};
  const arrays=['zombies','pellets','pickups','grenades','explosions','airdrops','rockets','flameParticles','fireZones','particles','decals','damageTexts'];
  globalThis.serverEvent=(type,data)=>{events.push({n:++eventId,type,data});if(events.length>600)events.shift();};
  function init(list,seed){
    resetGame(seed);state.loading=false;state.loadDone=true;state.devMode=false;
    members=list.map((m,i)=>({...template,id:m.id,name:m.name,connected:true,dead:false,x:WORLD.w/2+(i%2?24:-24),y:WORLD.h/2+(i<2?-24:24),aimX:WORLD.w/2+200,aimY:WORLD.h/2,input:{keys:new Set(),fire:false,actions:[]},ui:{}}));
    Coop.setRoster(members);player={...template};events=[];eventId=0;tick=0;
  }
  function input(id,data){
    const p=members.find(p=>p.id===id);if(!p||p.hp<=0||!p.connected)return;
    p.input={keys:new Set(data.keys),fire:data.fire,actions:[...(p.input.actions||[]),...(data.actions||[])].slice(0,5)};
    p.inputSeq=data.seq??p.inputSeq??0;p.aimX=data.aimX;p.aimY=data.aimY;p.inputTick=tick;
  }
  function disconnect(id){const p=members.find(p=>p.id===id);if(!p)return;p.connected=false;Coop.withPlayer(p,()=>{p.hp=0;endGame();});}
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
  function frame(){
    const data={tick,seed:Town.seed,version:GAME_VERSION,players:members.map(({input,inputTick,inputSeq,ui,...p})=>({...p,ui})),world:{},arsenal:Arsenal.snapshot(),weather:Weather.snapshot(),bossImpacts:BossAttack.impacts,events:events.splice(0)};
    for(const key of arrays)data.world[key]=state[key];
    for(const key of ['time','surviveTime','wave','kills','score','running','gameOver','bossAnnouncement','airdropAnnouncement','airdropAnnouncementType'])data.world[key]=state[key];
    // Rounding cuts bandwidth without changing authoritative physics.
    const internal=new Set(['navX','navY','navUntil','navRevision','artX','artY','skin','shirt']);
    const payload=JSON.stringify({type:'snapshot',snapshot:data},(k,v)=>internal.has(k)?undefined:typeof v==='number'&&Number.isFinite(v)?k==='ackAge'?Math.round(v*1000)/1000:Math.round(v*100)/100:v);
    return {payload,gameOver:state.gameOver,score:state.score,kills:state.kills,time:state.surviveTime};
  }
  function snapshot(){return JSON.parse(frame().payload).snapshot;}
  return {init,input,disconnect,step,snapshot,frame};
})();
