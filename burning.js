// One refreshable burn per actor: contact never stacks a second damage timer.
const Burning=(()=>{
  const duration=3,tick=.25,zombieDPS=12,playerDPS=4,spreadRadius=96;
  function clear(target){delete target.burn;}
  function ignite(target,mult=1,creditPlayer=true,owner=player.id||'player'){
    if(target.hp<=0)return;
    const b=target.burn;
    if(b){b.remaining=duration;b.mult=Math.max(b.mult,mult);b.creditPlayer=b.creditPlayer||creditPlayer;if(creditPlayer)b.owner=owner;}
    else target.burn={remaining:duration,elapsed:0,mult,creditPlayer,owner};
  }
  function hitZombie(z,amount,mult=1,creditPlayer=true,contact=true,owner=player.id||'player'){
    if(z.hp<=0||!state.zombies.includes(z))return;
    if(contact)ignite(z,mult,creditPlayer,owner);
    z.hp-=amount;PixelArt.hit(z);playHit(z.x,z.y,'fire');
    addDamageText(z.x,z.y-z.radius-10,amount,'#efad64');
    if(z.hp<=0)handleZombieDeath(state.zombies.indexOf(z),creditPlayer,'fire',owner);
  }
  function igniteNearby(x,y,mult=1,creditPlayer=true,owner=player.id||'player'){
    // One instant contact, never a persistent ground hazard. The dying Bloater
    // has already been removed and its original blast has finished resolving.
    for(const target of [...Coop.all(),...state.zombies]){
      if(target.hp<=0||(!Coop.isPlayer(target)&&BossAttack.airborne(target)))continue;
      if(dist(x,y,target.x,target.y)<spreadRadius+target.radius&&Town.lineClear(x,y,target.x,target.y))ignite(target,mult,creditPlayer,owner);
    }
    state.explosions.push({x,y,radius:0,maxRadius:spreadRadius,life:.28,maxLife:.28,ring:0,ignitionBurst:true});
    for(let i=0;i<20;i++){
      const a=i*Math.PI*2/20+rand(-.08,.08),speed=rand(140,260),life=rand(.18,.38);
      state.particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life,maxLife:life,size:rand(2,4),color:i%3?'#e68c43':'#efd098',drag:.96});
    }
  }
  function update(dt){
    if(!state.running||state.paused||state.gameOver||!Number.isFinite(dt)||dt<=0)return;
    // Snapshot statuses as well as identities. A death may ignite another actor;
    // that new burn must not receive time that elapsed before it existed.
    const activeBurns=[];
    for(const target of [...Coop.all(),...state.zombies])if(target.burn)activeBurns.push({target,b:target.burn});
    for(const {target,b} of activeBurns){
      if(target.burn!==b)continue;
      if(target.hp<=0||(!Coop.isPlayer(target)&&!state.zombies.includes(target))){clear(target);continue;}
      const active=Math.min(dt,b.remaining);b.remaining=Math.max(0,b.remaining-active);b.elapsed+=active;
      while(b.elapsed+1e-9>=tick&&target.hp>0&&!state.gameOver){
        b.elapsed=Math.max(0,b.elapsed-tick);
        if(Coop.isPlayer(target))Coop.withPlayer(target,()=>damagePlayer(playerDPS*tick,target.x,target.y,{ignoreInvincibility:true,fire:true}));
        else hitZombie(target,zombieDPS*b.mult*tick,b.mult,b.creditPlayer,false,b.owner);
      }
      if(b.remaining<1e-9||target.hp<=0)clear(target);
      if(state.gameOver)return;
    }
  }
  function draw(cam){
    // Fixed tiny pixel shapes, no extra per-actor light or unbounded particles.
    ctx.save();
    for(const o of [...Coop.all(),...state.zombies]){
      if(!o.burn||o.burn.remaining<=0||o.hp<=0||o.downed||o.dead||o.connected===false)continue;
      const x=o.x-cam.x,y=o.y-cam.y-(Coop.isPlayer(o)?Coop.withPlayer(o,()=>getPlayerJumpVisual().lift):o.lift||0);
      if(x<-60||y<-80||x>SW+60||y>SH+80)continue;
      const fade=Math.min(1,o.burn.remaining/.45),seed=String(o.id||0).split('').reduce((n,c)=>n+c.charCodeAt(0),0)*1.7;
      for(let i=0;i<6;i++){
        const phase=(state.time*(2.1+i*.13)+i*.19+seed)%1;
        const xx=Math.round((x+(i-2.5)*5+Math.sin(state.time*8+i)*2)/2)*2;
        const yy=Math.round((y-4-phase*29)/2)*2,h=6+Math.round((1-phase)*5)*2;
        ctx.globalAlpha=fade*(1-phase*.7);ctx.fillStyle='#a4472e';ctx.fillRect(xx-2,yy-h,6,h);
        ctx.fillStyle='#e68c43';ctx.fillRect(xx,yy-h+4,2,Math.max(2,h-4));
        ctx.fillStyle='#efd098';ctx.fillRect(xx,yy-4,2,2);
        ctx.globalAlpha=fade*(1-phase)*.3;ctx.fillStyle='#656361';ctx.fillRect(xx-2,yy-h-8,4,4);
      }
    }ctx.restore();
  }
  return {ignite,igniteNearby,clear,hitZombie,update,draw,duration,zombieDPS,playerDPS,spreadRadius};
})();
