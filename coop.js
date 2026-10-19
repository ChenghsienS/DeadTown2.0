// Shared actor context. The server runs one world tick, then each survivor once.
// Single player uses the same functions with an implicit one-person roster.
const Coop = (() => {
  let roster=[],client=false;
  const server=globalThis.DEAD_TOWN_SERVER===true;
  const uiKeys=['buffAnnouncement','buffAnnouncementType','buffAnnouncementTimer','cameraShake','screenFlash','deathAnim'];
  const all=()=>server||client?roster:[player];
  const living=()=>all().filter(p=>p.hp>0&&p.connected!==false);
  function withPlayer(p,fn){
    if(!p)return;
    if(p===player)return fn(p);
    const previous=player,oldName=state.playerName,keys=state.keys,mouse=state.mouse,down=mouseDown,ui={};
    for(const k of uiKeys)ui[k]=state[k];
    player=p;state.playerName=p.name||oldName;
    if(server){state.keys=p.input?.keys||new Set();state.mouse={x:0,y:0};mouseDown=!!p.input?.fire;}
    if(server)for(const k of uiKeys)state[k]=p.ui?.[k]??(k==='buffAnnouncement'?'':k==='buffAnnouncementType'?'upgrade':0);
    try{return fn(p);}finally{
      if(server){p.ui={};for(const k of uiKeys){p.ui[k]=state[k];state[k]=ui[k];}}
      player=previous;state.playerName=oldName;state.keys=keys;state.mouse=mouse;mouseDown=down;
    }
  }
  function each(fn){for(const p of living().slice())withPlayer(p,fn);}
  function nearest(o,filter=()=>true){let best=null,d=Infinity;for(const p of living())if(filter(p)){const n=(p.x-o.x)**2+(p.y-o.y)**2;if(n<d){best=p;d=n;}}return best;}
  function target(z,fn){
    if(!server)return fn();
    let p=roster.find(p=>p.id===z.targetPlayerId&&p.hp>0&&p.connected!==false);
    const locked=z.carrying||['windup','charge'].includes(z.state)||['charge','airborne'].includes(z.bossPhase);
    if(!p||!locked)p=nearest(z);
    if(!p)return;z.targetPlayerId=p.id;return withPlayer(p,fn);
  }
  function emit(type,data){if(server)globalThis.serverEvent(type,data);}
  function die(){
    if(!server)return false;
    if(!player.dead){player.dead=true;player.hp=0;Burning.clear(player);emit('playerDeath',{...player,input:undefined,ui:undefined});}
    player.input={keys:new Set(),fire:false};
    if(!living().length){state.running=false;state.gameOver=true;Arsenal.stop();}
    return true;
  }
  function aim(o=player,cam=camera()){
    if(server||client&&o!==player)return {x:o.aimX??o.x+100,y:o.aimY??o.y};
    return {x:cam.x+state.mouse.x,y:cam.y+state.mouse.y};
  }
  return {server,all,living,each,withPlayer,nearest,target,die,emit,aim,
    isPlayer:o=>all().includes(o),byId:id=>all().find(p=>p.id===id),
    get active(){return server||client;},get client(){return client;},
    setRoster(value){roster=value;},setClient(value){client=value;if(!value)roster=[];}};
})();
