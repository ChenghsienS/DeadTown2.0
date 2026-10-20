// Local presentation only. Authority supplies health, inventory, damage and results.
const NetPrediction=(()=>{
  let motion=null,history=[],sent=new Map(),offsetX=0,offsetY=0,pendingDash=false;
  let shots=new Map(),nextShotAt=0,lastSnapshotAt=0,lastDashAt=-Infinity,confirmed=0;
  const now=()=>performance.now();
  function reset(){motion=null;history=[];sent.clear();shots.clear();offsetX=offsetY=0;pendingDash=false;nextShotAt=0;lastSnapshotAt=0;lastDashAt=-Infinity;confirmed=0;}
  function input(keys,active){return {keys:new Set(active?keys:[]),dash:active&&pendingDash,aimX:Coop.aim(player,camera()).x};}
  function remember(seq){sent.set(seq,now());while(sent.size>180)sent.delete(sent.keys().next().value);}
  function reconcile(authority,p,initial=false){
    const time=now(),oldX=p.x,oldY=p.y;
    const acknowledged=sent.get(authority.ackSeq);
    motion=SurvivorMotion.copy(authority);
    // Link the server's consumed input to the local input timeline, without trusting
    // a client-supplied duration or requiring synchronized wall clocks.
    const boundary=acknowledged===undefined?time:Math.min(time,acknowledged+(authority.ackAge||0)*1000);
    if(!initial&&(authority.hp>0||authority.downed)&&acknowledged!==undefined){
      for(const frame of history){
        const begin=Math.max(boundary,frame.start),end=Math.min(time,frame.end);
        if(end>begin)SurvivorMotion.step(motion,(end-begin)/1000,{...frame.input,dash:frame.input.dash&&begin===frame.start});
      }
    }
    const force=initial||(authority.hp<=0&&!authority.downed)||!!p.downed!==!!authority.downed||Math.hypot(oldX-motion.x,oldY-motion.y)>120;
    offsetX=force?0:oldX-motion.x;offsetY=force?0:oldY-motion.y;
    lastSnapshotAt=time;confirmed=authority.shotSerial||0;
    if(authority.downed||authority.hp<=0){shots.clear();nextShotAt=0;pendingDash=false;}
    for(const [key,at] of sent)if(key<authority.ackSeq-2)sent.delete(key);
    history=history.filter(f=>f.end>time-1800);
    for(const [key,shot] of shots)if(time-shot.at>8000)shots.delete(key);
    if(authority.hp<=0&&!authority.downed){history=[];pendingDash=false;offsetX=offsetY=0;}
    present(p);
  }
  function present(p){
    if(!motion)return;
    Object.assign(p,motion);
    // Do not let a visual correction put the feet through solid geometry.
    moveWithWallCollision(p,offsetX,offsetY);
  }
  function update(dt,active,fresh){
    if(!motion||(player.hp<=0&&!player.downed))return;
    if(!fresh){history=[];pendingDash=false;return;}
    const end=now(),start=end-dt*1000,controls=input(state.keys,active);
    // A long suspended tab is re-based by the next authoritative snapshot.
    if(history.length&&start-history.at(-1).end>200)history=[];
    const steps=Math.max(1,Math.ceil(dt/(1/30))),delta=dt/steps;
    for(let i=0;i<steps;i++){
      const entry={start:start+i*delta*1000,end:start+(i+1)*delta*1000,input:{...controls,dash:controls.dash&&i===0}};
      history.push(entry);
      if(SurvivorMotion.step(motion,delta,entry.input)){playDash();lastDashAt=end;}
    }
    pendingDash=false;
    while(history.length&&history[0].end<end-1800)history.shift();
    const blend=Math.exp(-22*dt);offsetX*=blend;offsetY*=blend;present(player);
    if(active&&mouseDown)fire();
  }
  function fire(){
    const time=now(),kind=player.weapon,spec=WEAPONS[kind];
    if(!spec||player.hp<=0||!state.running||state.gameOver||time<nextShotAt)return false;
    const elapsed=Math.max(0,(time-lastSnapshotAt)/1000);
    if(player.reloadTimer>elapsed||player.shootCooldown>elapsed)return false;
    const pending=[...shots.values()].filter(s=>s.serial>confirmed);
    if(player.mag-pending.length<=0)return false;
    const serial=Math.max(confirmed,...pending.map(s=>s.serial))+1;
    shots.set(serial,{serial,kind,at:time});
    nextShotAt=time+Math.ceil(spec.cooldown*30)/30*1000;
    const aim=PixelArt.aimPose(player,camera());
    PixelArt.shot(aim.angle,kind);
    if(kind==='arc')AudioEngine.play('arc_shot',{volume:.32,group:'electric',interval:.045});else AudioEngine.shot(kind);
    if(kind!=='arc')Lighting.flash(aim.angle,kind,safeMuzzle(aim.muzzleX,aim.muzzleY));
    state.cameraShake=Math.max(state.cameraShake,kind==='shotgun'?3.5:kind==='gatling'?1.6:kind==='rocket'?2:0);
    return true;
  }
  function shotConfirmed(event){const shot=shots.get(event.shotId);return !!shot&&shot.kind===event.kind;}
  function action(kind){if(kind==='dash')pendingDash=true;if(kind==='shoot')fire();}
  return {reset,remember,reconcile,update,action,shotConfirmed,
    get lastDashAt(){return lastDashAt;},get stats(){return {history:history.length,pendingInputs:sent.size,predictedShots:shots.size,correction:Math.hypot(offsetX,offsetY)};}};
})();
