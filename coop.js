// Shared actor context. The server runs one world tick, then each survivor once.
// Single player uses the same functions with an implicit one-person roster.
const Coop = (() => {
  let roster=[],client=false;
  const server=globalThis.DEAD_TOWN_SERVER===true;
  const uiKeys=['buffAnnouncement','buffAnnouncementType','buffAnnouncementTimer','cameraShake','screenFlash','deathAnim'];
  const all=()=>server||client?roster:[player];
  const living=()=>all().filter(p=>p.hp>0&&p.connected!==false);
  const survivors=()=>all().filter(p=>(p.hp>0||p.downed)&&!p.dead&&p.connected!==false);
  const rescue={window:30,duration:5,radius:64,crawlSpeed:43};
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
    if(!p&&z.carrying){z.carrying=false;z.state='recover';z.chargeTimer=.55;}
    const locked=z.carrying||['windup','charge'].includes(z.state)||['charge','airborne'].includes(z.bossPhase);
    if(!p||!locked)p=nearest(z);
    if(!p)return;z.targetPlayerId=p.id;return withPlayer(p,fn);
  }
  function emit(type,data){if(server)globalThis.serverEvent(type,data);}
  function die(){
    if(!server)return false;
    if(player.dead||player.downed)return true;
    player.hp=0;player.downed=true;player.downRemaining=rescue.window;player.reviveProgress=0;player.reviverId=null;
    for(const key of ['dashTime','rocketJumpTime','knockbackTime','reloadTimer','shootCooldown'])player[key]=0;
    player.wasReloading=false;player.artShotUntil=0;Burning.clear(player);
    player.input={keys:new Set(),fire:false};
    emit('playerDown',{id:player.id,name:player.name,x:player.x,y:player.y});
    return true;
  }
  function finishDeath(p){
    if(p.dead)return;p.dead=true;p.downed=false;p.hp=0;p.downRemaining=0;p.reviveProgress=0;p.reviverId=null;
    p.input={keys:new Set(),fire:false,actions:[]};Burning.clear(p);
    emit('playerDeath',{id:p.id,name:p.name,x:p.x,y:p.y});
    if(!survivors().length){state.running=false;state.gameOver=true;Arsenal.stop();}
  }
  function updateRescue(dt){
    if(!server)return;
    const helpers=living().filter(p=>!p.dashTime&&!p.rocketJumpTime&&!p.knockbackTime&&Math.hypot(p.x-(p.rescueX??p.x),p.y-(p.rescueY??p.y))<=Math.max(.12,dt*4));
    const occupied=new Set();
    for(const p of survivors().filter(p=>p.downed)){
      p.downRemaining=Math.max(0,p.downRemaining-dt);
      const nearby=helpers.filter(h=>!occupied.has(h.id)&&Math.hypot(h.x-p.x,h.y-p.y)<=rescue.radius&&Town.lineClear(p.x,p.y,h.x,h.y,3));
      const helper=nearby.find(h=>h.id===p.reviverId)||nearby.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
      if(helper){occupied.add(helper.id);if(p.reviverId!==helper.id)p.reviveProgress=0;p.reviverId=helper.id;p.reviveProgress=Math.min(rescue.duration,p.reviveProgress+dt);}
      else{p.reviverId=null;p.reviveProgress=0;}
      if(p.downRemaining>1e-8&&p.reviveProgress+1e-8>=rescue.duration){
        p.downed=false;p.hp=Math.max(1,p.maxHp*.2);p.downRemaining=0;p.reviveProgress=0;p.reviverId=null;p.reviveShield=1.5;p.hurtTimer=1.5;
        Burning.clear(p);
        p.input={keys:new Set(),fire:false,actions:[]};emit('playerRevive',{id:p.id,name:p.name,helperId:helper.id});
      }else if(p.downRemaining<=1e-8)finishDeath(p);
    }
    for(const p of all()){p.rescueX=p.x;p.rescueY=p.y;}
  }
  function award(score,owner){state.score+=score;state.kills++;if(server){const p=roster.find(p=>p.id===owner);if(p){p.score=(p.score||0)+score;p.kills=(p.kills||0)+1;}}}
  function aim(o=player,cam=camera()){
    if(server||client&&o!==player)return {x:o.aimX??o.x+100,y:o.aimY??o.y};
    return {x:cam.x+state.mouse.x,y:cam.y+state.mouse.y};
  }
  return {server,all,living,survivors,rescue,each,withPlayer,nearest,target,die,finishDeath,updateRescue,award,emit,aim,
    isPlayer:o=>all().includes(o),byId:id=>all().find(p=>p.id===id),
    get active(){return server||client;},get client(){return client;},
    setRoster(value){roster=value;},setClient(value){client=value;if(!value)roster=[];}};
})();
