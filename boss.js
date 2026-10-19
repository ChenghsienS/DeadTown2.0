// Boss slam: simulation owns all transitions; rendering never applies damage.
const BOSS_SLAM = Object.freeze({charge:1.3, lockBeforeJump:0.4, flight:0.72,
  recovery:0.8, cooldownMin:5.5, cooldownMax:7.5, triggerDistance:520,
  radius:120, damage:32, playerPush:460, zombiePush:340, pushDuration:0.46, height:112});

const BossAttack = (() => {
  const impacts=[];
  const airborne=z=>z.type==='boss'&&z.bossPhase==='airborne';
  const fixed=z=>z.type==='boss'&&z.bossPhase&&z.bossPhase!=='approach';
  function clearLine(ax,ay,bx,by){
    return Town.lineClear(ax,ay,bx,by);
  }
  function landingAt(x,y,radius){
    const valid=(x,y)=>x>=radius+2&&y>=radius+2&&x<=WORLD.w-radius-2&&y<=WORLD.h-radius-2&&
      !Town.blocked(x,y,radius+3);
    x=clamp(x,radius+2,WORLD.w-radius-2);y=clamp(y,radius+2,WORLD.h-radius-2);
    if(valid(x,y))return {x,y};
    // Keep this large boss outside roofs and narrow doorways. The marker shows
    // the actual safe landing position, including when the player is indoors.
    for(let r=16;r<=320;r+=16)for(let i=0;i<32;i++){
      const a=i*Math.PI/16,tx=x+Math.cos(a)*r,ty=y+Math.sin(a)*r;
      if(valid(tx,ty))return {x:tx,y:ty};
    }
    return null;
  }
  function dust(x,y,count,force=1){
    for(let i=0;i<count;i++){
      const a=i*2.39996,s=rand(35,170)*force,life=rand(0.25,0.65);
      state.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life,maxLife:life,
        size:rand(2,6),color:i%3?'#7c7970':'#9da7a6',drag:0.94,chip:true});
    }
  }
  function land(z){
    // Phase changes before damage: no duplicate slam on later frames.
    z.bossPhase='recover';z.bossTimer=BOSS_SLAM.recovery;z.lift=0;z.touchTimer=BOSS_SLAM.recovery+0.3;
    z.x=z.targetX;z.y=z.targetY;
    impacts.push({x:z.x,y:z.y,age:0,seed:z.id||0});if(impacts.length>8)impacts.shift();
    dust(z.x,z.y,42,1.5);
    AudioEngine.variant('explosion',2,{x:z.x,y:z.y,volume:0.4,rate:0.68,group:'boss_slam',interval:0.12});
    Coop.each(()=>{
    const pd=dist(player.x,player.y,z.x,z.y);
    state.cameraShake=Math.max(state.cameraShake,10*Math.max(0,1-pd/750));
    if(pd<=BOSS_SLAM.radius+player.radius&&player.dashTime<=0&&player.rocketJumpTime<=0&&
       clearLine(z.x,z.y,player.x,player.y)){
      damagePlayer(BOSS_SLAM.damage,z.x,z.y,{ignoreInvincibility:true});
      if(player.hp>0){const dx=player.x-z.x,dy=player.y-z.y,d=Math.hypot(dx,dy);
        launchPlayerKnockback(d?dx/d:1,d?dy/d:0,BOSS_SLAM.playerPush,BOSS_SLAM.pushDuration);}
    }
    });
    for(const other of state.zombies){
      if(other===z||other.hp<=0||airborne(other))continue;
      const dx=other.x-z.x,dy=other.y-z.y,d=Math.hypot(dx,dy);
      if(d>BOSS_SLAM.radius+other.radius||!clearLine(z.x,z.y,other.x,other.y))continue;
      const a=((other.id||0)*2.39996),nx=d?dx/d:Math.cos(a),ny=d?dy/d:Math.sin(a);
      other.slamPushTime=BOSS_SLAM.pushDuration;
      other.slamVX=nx*BOSS_SLAM.zombiePush;other.slamVY=ny*BOSS_SLAM.zombiePush;
      other.touchTimer=BOSS_SLAM.pushDuration+0.2;
      // Knockback interrupts charging / pouncing; no damage, kill or score calls.
      if(other.type==='boss'){other.bossPhase='approach';other.slamCooldown=2.5;other.lift=0;}
      if(other.type==='charger'){other.state='recover';other.chargeTimer=0.6;other.carrying=false;}
      if(other.type==='pouncer'){other.pounceTime=0;other.pounceCd=1.5;}
    }
  }
  function update(z,dt){
    z.bossPhase=z.bossPhase||'approach';z.slamCooldown=z.slamCooldown??2.5;
    if(z.bossPhase==='charge'){
      z.bossTimer=Math.max(0,z.bossTimer-dt);
      if(!z.targetLocked){
        const target=landingAt(player.x,player.y,z.radius);
        if(target){z.targetX=target.x;z.targetY=target.y;}
        if(z.bossTimer<=BOSS_SLAM.lockBeforeJump){z.targetLocked=true;
          AudioEngine.play('click',{x:z.targetX,y:z.targetY,volume:0.24,rate:0.65});}
      }
      z.dustClock=(z.dustClock||0)+dt;
      if(z.dustClock>0.1){z.dustClock=0;dust(z.x+rand(-20,20),z.y+18,2,0.4);}
      if(z.bossTimer<=0){z.bossPhase='airborne';z.bossTimer=BOSS_SLAM.flight;z.startX=z.x;z.startY=z.y;
        dust(z.x,z.y,20,1);AudioEngine.play('roll',{x:z.x,y:z.y,volume:0.3,rate:0.6});}
    }else if(z.bossPhase==='airborne'){
      z.bossTimer=Math.max(0,z.bossTimer-dt);
      const t=1-z.bossTimer/BOSS_SLAM.flight;
      z.x=z.startX+(z.targetX-z.startX)*t;z.y=z.startY+(z.targetY-z.startY)*t;
      z.lift=Math.sin(Math.PI*t)*BOSS_SLAM.height;
      if(z.bossTimer<=0)land(z);
    }else if(z.bossPhase==='recover'){
      z.bossTimer-=dt;
      if(z.bossTimer<=0){z.bossPhase='approach';z.slamCooldown=rand(BOSS_SLAM.cooldownMin,BOSS_SLAM.cooldownMax);}
    }else{
      z.slamCooldown=Math.max(0,z.slamCooldown-dt);
      const dx=player.x-z.x,dy=player.y-z.y,d=Math.hypot(dx,dy)||1;
      Town.chase(z,dt);
      if(d<BOSS_SLAM.triggerDistance&&z.slamCooldown<=0){
        const target=landingAt(player.x,player.y,z.radius);
        if(target){z.bossPhase='charge';z.bossTimer=BOSS_SLAM.charge;z.targetLocked=false;
          z.targetX=target.x;z.targetY=target.y;z.dustClock=0;
          AudioEngine.variant('groan',3,{x:z.x,y:z.y,volume:0.36,rate:0.55,group:'boss_warning',interval:0.3});}
      }
    }
  }
  function updateEffects(dt){for(let i=impacts.length-1;i>=0;i--){impacts[i].age+=dt;if(impacts[i].age>2.6)impacts.splice(i,1);}}
  function ring(x,y,r,color,alpha=1,width=2,dashed=false){
    ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;
    const n=Math.max(24,Math.ceil(r*1.4));
    for(let i=0;i<n;i++){if(dashed&&i%10>5)continue;const a=i/n*Math.PI*2;
      ctx.fillRect(Math.round((x+Math.cos(a)*r)/2)*2,Math.round((y+Math.sin(a)*r)/2)*2,width,width);}
    ctx.restore();
  }
  function drawWorld(cam){
    for(const e of impacts){const x=e.x-cam.x,y=e.y-cam.y;
      ctx.save();ctx.globalAlpha=Math.min(0.65,(2.6-e.age)*0.4);ctx.fillStyle='#131a1c';
      for(let i=0;i<10;i++){const a=i*2.39996+e.seed;for(let j=0;j<7;j++){
        const r=12+j*9;ctx.fillRect(Math.round((x+Math.cos(a+j*0.06)*r)/2)*2,Math.round((y+Math.sin(a+j*0.06)*r)/2)*2,6,3);}}
      ctx.restore();
      if(e.age<0.55){ring(x,y,BOSS_SLAM.radius*Math.min(1,e.age/0.4),'#c6b590',(1-e.age/0.55)*0.65,3);
        ring(x,y,20+e.age*175,'#7e99a0',(1-e.age/0.55)*0.5,2,true);}
    }
  }
  function drawWarnings(cam){
    // A restrained impact outline is readable even when the boss lands behind
    // the flashlight. It reveals the shockwave, not the surrounding darkness.
    for(const e of impacts){
      if(e.age>=0.55)continue;
      const x=e.x-cam.x,y=e.y-cam.y,fade=1-e.age/0.55;
      ring(x,y,BOSS_SLAM.radius*Math.min(1,e.age/0.4),'#b4b4a0',fade*0.38,2);
      ctx.save();ctx.globalAlpha=fade*0.27;ctx.fillStyle='#a6aaa1';
      for(let i=0;i<16;i++){const a=i*2.39996,r=12+e.age*(100+i%5*28);
        ctx.fillRect(Math.round((x+Math.cos(a)*r)/2)*2,Math.round((y+Math.sin(a)*r-e.age*12)/2)*2,4,4);}
      ctx.restore();
    }
    if(!state.running||state.gameOver)return;
    for(const z of state.zombies){
      if(z.type!=='boss'||!['charge','airborne'].includes(z.bossPhase))continue;
      const x=z.targetX-cam.x,y=z.targetY-cam.y,locked=z.targetLocked,rad=BOSS_SLAM.radius;
      const color=locked?'#ee3e46':'#b52d39';
      // Two-pixel hatch marks keep the warning readable under dark lighting.
      ctx.save();ctx.globalAlpha=locked?0.13:0.07;ctx.fillStyle=color;
      for(let dy=-rad;dy<rad;dy+=10){const span=Math.sqrt(rad*rad-dy*dy);for(let dx=-span;dx<span;dx+=12)ctx.fillRect(px(x+dx),px(y+dy),4,2);}
      ctx.restore();ring(x,y,rad,'#090e12',0.85,5);ring(x,y,rad,color,0.8,2,!locked);
      const progress=z.bossPhase==='airborne'?1:1-z.bossTimer/BOSS_SLAM.charge;
      ring(x,y,rad*(1-progress),color,0.28,2);
      ctx.save();ctx.fillStyle=color;ctx.fillRect(px(x-7),px(y-1),14,2);ctx.fillRect(px(x-1),px(y-7),2,14);
      ctx.restore();
    }
  }
  return {update,updateEffects,drawWorld,drawWarnings,airborne,fixed,clearLine,landingAt,
    reset(){impacts.length=0;},get impacts(){return impacts;}};
})();
