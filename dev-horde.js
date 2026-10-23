// Developer-only, reachable spawn points and a bounded batch per simulation frame.
const DevHorde=(()=>{
  const maxRequest=1000,maxActive=2000,batch=20;
  let queue=[],uiTime=0,lastRequested=0,lastSpawned=0;
  const active=()=>state.zombies.reduce((n,z)=>n+(z.stressTest?1:0),0);
  const allowed=()=>state.devMode&&state.running&&!state.gameOver&&!state.paused&&!ArtStudio.isOpen;
  function refresh(){
    const el=$('devHordeStatus');if(!el)return;
    const live=active();
    const text=lang==='zh'?`测试 ${live} / 全部 ${state.zombies.length} · 待生成 ${queue.length} · 本批 ${lastSpawned}/${lastRequested}`:`Test ${live} / All ${state.zombies.length} · Queued ${queue.length} · Batch ${lastSpawned}/${lastRequested}`;
    if(el.textContent!==text)el.textContent=text;
    const spawn=$('devHordeSpawnBtn');if(spawn)spawn.disabled=queue.length>0||live>=maxActive;
  }
  function request(value){
    if(!allowed()||queue.length)return 0;
    const raw=Number(value),requested=Math.max(25,Math.min(maxRequest,Math.round(Number.isFinite(raw)&&raw>0?raw:100)));
    if($('devHordeCount'))$('devHordeCount').value=String(requested);
    lastRequested=Math.min(requested,maxActive-active());lastSpawned=0;
    const g=Town.gridFor(20),goal=Town.nearestCell(g,player.x,player.y,true);
    Town.flood(g,goal);const candidates=[];
    for(let i=0;i<g.open.length;i++)if(g.open[i]&&g.distance[i]>=0){
      const p=Town.cellPoint(g,i),d=dist(p.x,p.y,player.x,player.y);
      if(d>=260)candidates.push({...p,d});
    }
    // Randomize within distance bands so small tests start near the player.
    for(const p of candidates)p.rank=Math.floor(p.d/300)+Math.random();
    candidates.sort((a,b)=>a.rank-b.rank);
    const occupied=new Map(),cell=48,key=(x,y)=>x+','+y;
    function add(o){const k=key(Math.floor(o.x/cell),Math.floor(o.y/cell));if(!occupied.has(k))occupied.set(k,[]);occupied.get(k).push(o);}
    const fits=o=>{const x=Math.floor(o.x/cell),y=Math.floor(o.y/cell);for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++)for(const n of occupied.get(key(xx,yy))||[])if(dist(o.x,o.y,n.x,n.y)<o.radius+n.radius+3)return false;return true;};
    state.zombies.forEach(add);
    for(const p of candidates){
      if(queue.length>=lastRequested)break;
      const roll=Math.random(),type=roll<.46?'walker':roll<.70?'runner':roll<.84?'crawler':roll<.93?'bloater':roll<.985?'pouncer':'charger';
      const z={type,x:p.x,y:p.y,...zombieBase(type),stressTest:true};
      if(!Town.blocked(z.x,z.y,z.radius+2)&&fits(z)){queue.push(z);add(z);}
    }
    refresh();return queue.length;
  }
  function update(dt){
    if(!allowed())return;
    for(let n=0;n<batch&&queue.length;n++){
      const z=queue.shift();
      if(dist(z.x,z.y,player.x,player.y)<120||Town.blocked(z.x,z.y,z.radius+2)||state.zombies.some(o=>dist(z.x,z.y,o.x,o.y)<z.radius+o.radius+2))continue;
      z.id=state.nextEntityId++;state.zombies.push(z);lastSpawned++;
    }
    uiTime-=dt;if(uiTime<=0){uiTime=.25;refresh();}
  }
  function clear(){if(!allowed())return;queue=[];state.zombies=state.zombies.filter(z=>!z.stressTest);lastRequested=lastSpawned=0;refresh();}
  function reset(){queue=[];lastRequested=lastSpawned=0;uiTime=0;}
  return {request,update,clear,reset,refresh,get stats(){return {active:active(),queued:queue.length,requested:lastRequested,spawned:lastSpawned};}};
})();
