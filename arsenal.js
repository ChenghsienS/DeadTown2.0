// Player weapons and autonomous military support; simulation owns all damage.
const WEAPONS=Object.freeze({
  shotgun:{mag:6,reserve:0,reload:1.3,cooldown:0.48,range:300},
  gatling:{mag:120,reserve:880,reload:1.9,cooldown:0.055,range:540},
  rocket:{mag:1,reserve:49,reload:0.95,cooldown:0.42,range:500},
  flamethrower:{mag:200,reserve:1500,reload:1,cooldown:0.024,range:190},
  arc:{mag:12,reserve:72,reload:1.45,cooldown:0.34,range:360}
});
const ARC=Object.freeze({range:360,halfAngle:Math.PI/5,chainRange:145,maxTargets:10,damage:38,falloff:0.78});
const DRONE=Object.freeze({duration:60,max:3,speed:310,patrolSpeed:90,patrolMin:55,patrolMax:145,hover:22,drawScale:1,
  aimInterpSpeed:7,patrolInterpSpeed:4.5,beamLength:220,beamAngle:40,beamFalloff:105,beamStrength:0.66});
const MICRO_MISSILE=Object.freeze({mag:10,cooldown:0.18,reload:1.8,targetRange:440,launchRange:580,
  startSpeed:210,speed:430,acceleration:780,turnRate:10,life:2.4,radius:2,blastRadius:42,damage:42,maxActive:48});
const Arsenal=(()=>{
  const arcs=[],drones=[],bursts=[],flashes=[],missiles=[],trails=[],impacts=[];let serial=0,clock=0;
  const hash=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  const alive=z=>z.hp>0&&!BossAttack.airborne(z);
  const clear=(a,b)=>BossAttack.clearLine(a.x,a.y,b.x,b.y);
  const hitPoint=z=>({x:z.x,y:z.y-(z.type==='boss'?14:z.type==='crawler'?-2:8)});
  function path(a,b,seed){
    const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,n=Math.max(3,Math.ceil(d/15)),points=[];
    for(let i=0;i<=n;i++){const t=i/n,offset=i===0||i===n?0:(hash(seed+i*17)-0.5)*Math.min(24,d*0.18);
      points.push({x:a.x+dx*t-dy/d*offset,y:a.y+dy*t+dx/d*offset});}
    return points;
  }
  function addArc(a,b,index,entity=null,sourceEntity=null){
    const seed=++serial*71,frames=Array.from({length:3},(_,i)=>path(a,b,seed+i*117));
    const branches=frames.map((p,i)=>{
      const k=Math.floor(p.length*0.55),q=p[k],angle=Math.atan2(b.y-a.y,b.x-a.x)+(hash(seed+i)-0.5)*2;
      return path(q,{x:q.x+Math.cos(angle)*28,y:q.y+Math.sin(angle)*28},seed+i*9);
    });
    arcs.push({a:{...a},b:{...b},frames,branches,index,entity,sourceEntity,age:0,life:0.24,seed});
    if(arcs.length>80)arcs.shift();
  }
  function electric(origin,angle,mult=1,owner=player.id||'player'){
    const candidates=state.zombies.filter(z=>{
      if(!alive(z))return false;const dx=z.x-origin.x,dy=z.y-origin.y,d=Math.hypot(dx,dy);
      return d<=ARC.range+z.radius&&(d<20||(dx*Math.cos(angle)+dy*Math.sin(angle))/d>=Math.cos(ARC.halfAngle))&&clear(origin,hitPoint(z));
    }).sort((a,b)=>dist(a.x,a.y,origin.x,origin.y)-dist(b.x,b.y,origin.x,origin.y));
    let target=candidates[0],from=origin,previous=null,fromEntity=null;const visited=new Set(),hits=[];
    for(let i=0;i<ARC.maxTargets&&target;i++){
      if(!alive(target))break;const point=hitPoint(target),damage=ARC.damage*mult*Math.pow(ARC.falloff,i);
      visited.add(target);addArc(from,point,i,target,fromEntity);target.electricUntil=state.time+0.24;
      target.hp-=damage;PixelArt.hit(target);addDamageText(target.x,target.y-target.radius-10,damage,'#a6edff');
      hits.push(target.id);previous={x:target.x,y:target.y};from=point;fromEntity=target;
      if(target.hp<=0)handleZombieDeath(state.zombies.indexOf(target),true,'normal',owner);
      if(!state.running||player.hp<=0)break;
      target=state.zombies.filter(z=>alive(z)&&!visited.has(z)&&dist(z.x,z.y,previous.x,previous.y)<=ARC.chainRange&&clear(from,hitPoint(z)))
        .sort((a,b)=>dist(a.x,a.y,previous.x,previous.y)-dist(b.x,b.y,previous.x,previous.y))[0];
    }
    if(!hits.length){const end=safeMuzzle(origin.x+Math.cos(angle)*90,origin.y+Math.sin(angle)*90,origin);addArc(origin,end,0);}
    AudioEngine.play('arc_shot',{x:origin.x,y:origin.y,volume:0.32,group:'electric',interval:0.045});
    return hits;
  }
  function fire(kind,origin,angle,target,mult=player.damageMul||1,owner=player.id||'player'){
    const shotX=origin.x,shotY=origin.y,drone=owner==='drone';
    if(kind==='arc')return electric(origin,angle,mult,owner);
    if(drone){
      flashes.push({x:shotX,y:shotY,age:0,kind});if(flashes.length>12)flashes.shift();
      if(kind==='flamethrower')AudioEngine.play('flame_ignite',{x:shotX,y:shotY,volume:0.13,group:'drone_flame',interval:0.3});
      else AudioEngine.variant(kind,kind==='gatling'?4:kind==='rocket'?2:3,{x:shotX,y:shotY,volume:0.22,group:'drone_'+kind,interval:kind==='gatling'?0.07:0.12});
    }else playShot(kind);
    if(kind==='shotgun')for(let i=0;i<9;i++){
      const a=angle+rand(-0.18,0.18),speed=rand(620,780);state.pellets.push({x:shotX,y:shotY,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:0.42,damage:rand(15,26)*mult,radius:2,weapon:kind,owner});
    }
    else if(kind==='gatling'){
      const a=angle+rand(-0.038,0.038),speed=980;state.pellets.push({x:shotX,y:shotY,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:0.62,damage:20*mult,radius:2,weapon:kind,owner,penetration:5,hitIds:[]});
    }else if(kind==='rocket'){
      const targetDist=Math.max(30,dist(target.x,target.y,shotX,shotY)),speed=620;
      state.rockets.push({x:shotX,y:shotY,targetX:target.x,targetY:target.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:Math.min(3.5,targetDist/speed+0.18),radius:4,angle,owner,damageMul:mult});
    }else if(kind==='flamethrower')for(let i=0;i<6;i++){
      const a=angle+(Math.random()<0.3?rand(-0.28,0.28):rand(-0.18,0.18)),speed=rand(180,390),life=rand(0.34,0.62);
      state.flameParticles.push({x:shotX+rand(-2.5,2.5),y:shotY+rand(-2.5,2.5),vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life,maxLife:life,size:rand(2.5,5.5),damage:0.8*mult,damageMul:mult,owner,hitTick:0,swirl:rand(-110,110),heat:rand(0.85,1.2),color:Math.random()>0.6?'rgba(255,205,110,0.96)':Math.random()>0.45?'rgba(255,130,40,0.92)':'rgba(255,85,25,0.88)'});
    }
  }
  function retire(d){bursts.push({x:d.x,y:d.y-DRONE.hover,age:0,seed:d.id});if(bursts.length>8)bursts.shift();}
  function deploy(){
    if(!state.running||state.gameOver||state.paused)return null;
    const owned=drones.filter(d=>d.ownerId===(player.id||'player'));
    if(owned.length>=DRONE.max){const oldest=owned.shift();retire(oldest);drones.splice(drones.indexOf(oldest),1);}
    const used=new Set(owned.map(d=>d.slot)),slot=[0,1,2].find(n=>!used.has(n));
    const d={id:++serial,ownerId:player.id||'player',slot,x:player.x,y:player.y,radius:8,weapon:'microMissile',damageMul:player.damageMul||1,life:DRONE.duration,cooldown:0.25,mag:MICRO_MISSILE.mag,reload:0,angle:-Math.PI/2,targetId:null,shotUntil:0,patrolStep:0,patrolTimer:0,waitTime:0,stuckTime:0};
    drones.push(d);AudioEngine.play('pickup',{volume:0.28});return d;
  }
  function effects(dt){
    clock+=dt;
    for(const [list,maxAge] of [[arcs,0.24],[bursts,0.7],[flashes,0.09],[trails,0.3],[impacts,0.38]])for(let i=list.length-1;i>=0;i--){list[i].age+=dt;if(list[i].age>=maxAge)list.splice(i,1);}
  }
  function choosePatrolPoint(d){
    d.patrolStep++;d.patrolTimer=2.6+hash(d.id+d.patrolStep*13)*1.4;d.waitTime=0;d.stuckTime=0;
    d.anchorX=player.x;d.anchorY=player.y;
    for(let attempt=0;attempt<28;attempt++){
      const seed=d.id*151+d.patrolStep*61+attempt*17,angle=hash(seed)*Math.PI*2,radius=DRONE.patrolMin+hash(seed+7)*(DRONE.patrolMax-DRONE.patrolMin);
      const goal={x:clamp(player.x+Math.cos(angle)*radius,18,WORLD.w-18),y:clamp(player.y+Math.sin(angle)*radius,DRONE.hover+18,WORLD.h-18)};
      if(dist(goal.x,goal.y,d.x,d.y)<35||(Town.blocked(goal.x,goal.y,d.radius+3)||Town.blocked(goal.x,goal.y-DRONE.hover,d.radius)))continue;
      if(!clear(d,goal)||drones.some(other=>other!==d&&other.goalX!==undefined&&dist(goal.x,goal.y,other.goalX,other.goalY)<32))continue;
      d.goalX=goal.x;d.goalY=goal.y;return;
    }
    d.goalX=player.x;d.goalY=player.y;d.patrolTimer=0.6;
  }
  // Rendering, muzzle emission and the flashlight share this reduced-size pose.
  function dronePose(d){
    let x=d.x,y=d.y-DRONE.hover+Math.round(Math.sin(clock*5+d.slot*2)*2);
    if(Town.blocked(x,y,1)){const safe=safeMuzzle(x,y,d);x=safe.x;y=safe.y;}
    const scale=DRONE.drawScale,length=14*scale;
    return {x,y,ownerId:d.ownerId,scale,length,muzzleX:x+Math.cos(d.angle)*length,muzzleY:y+Math.sin(d.angle)*length};
  }
  function patrol(d,dt){
    d.patrolTimer-=dt;
    if(d.goalX===undefined||d.patrolTimer<=0||dist(player.x,player.y,d.anchorX,d.anchorY)>65||d.stuckTime>0.45)choosePatrolPoint(d);
    const dx=d.goalX-d.x,dy=d.goalY-d.y,distance=Math.hypot(dx,dy)||1;
    if(distance<10){d.waitTime+=dt;if(d.waitTime>0.25)choosePatrolPoint(d);return;}
    d.waitTime=0;const catchup=dist(d.x,d.y,player.x,player.y)>180;
    const step=Math.min(distance,(catchup?DRONE.speed:DRONE.patrolSpeed)*dt),oldX=d.x,oldY=d.y;
    moveWithWallCollision(d,dx/distance*step,dy/distance*step);
    if(dist(oldX,oldY,d.x,d.y)<step*0.2)d.stuckTime+=dt;else d.stuckTime=0;
    d.patrolAngle=Math.atan2(dy,dx);
    // Safety recovery only when obstacles leave a drone far outside patrol range.
    if(dist(d.x,d.y,player.x,player.y)>340){d.x=player.x;d.y=player.y;collideWithBuildings(d);choosePatrolPoint(d);}
  }
  function validTarget(z,origin){
    const owner=Coop.byId(origin.ownerId)||player;
    return z&&alive(z)&&dist(z.x,z.y,owner.x,owner.y)<=MICRO_MISSILE.targetRange&&
      dist(z.x,z.y,origin.x,origin.y)<=MICRO_MISSILE.launchRange&&clear(origin,hitPoint(z));
  }
  function randomTarget(origin){
    const candidates=state.zombies.filter(z=>validTarget(z,origin));
    return candidates[Math.floor(Math.random()*candidates.length)]||null;
  }
  function launch(d,gun,target){
    const side=d.mag%2?1:-1;d.launchSide=side;
    const muzzle=safeMuzzle(gun.x+Math.cos(d.angle)*gun.length-Math.sin(d.angle)*side*4,
      gun.y+Math.sin(d.angle)*gun.length+Math.cos(d.angle)*side*4,gun);
    // Each rocket retains its own lock; later shots may select a different enemy.
    const angle=d.angle+side*0.24;
    missiles.push({id:++serial,ownerId:d.ownerId,x:muzzle.x,y:muzzle.y,angle,speed:MICRO_MISSILE.startSpeed,
      targetId:target.id,damageMul:d.damageMul,age:0,life:MICRO_MISSILE.life,seek:0,trailTimer:0});
    d.mag--;d.cooldown=MICRO_MISSILE.cooldown;d.shotUntil=clock+0.075;
    if(d.mag===0)d.reload=MICRO_MISSILE.reload;
    flashes.push({x:muzzle.x,y:muzzle.y,age:0,kind:'microMissile'});if(flashes.length>12)flashes.shift();
    AudioEngine.variant('rocket',2,{x:muzzle.x,y:muzzle.y,volume:0.11,rate:1.65,group:'micro_launch',interval:0.06});
  }
  function detonate(m,damage=true){
    impacts.push({x:m.x,y:m.y,age:0,seed:m.id,radius:damage?MICRO_MISSILE.blastRadius:14});if(impacts.length>32)impacts.shift();
    if(!damage)return;
    AudioEngine.variant('impact_rocket',3,{x:m.x,y:m.y,volume:0.16,rate:1.5,group:'micro_impact',interval:0.07});
    // Dedicated small explosion, no player damage, rocket jump or full-screen flash.
    for(const z of [...state.zombies]){
      if(!alive(z)||!state.zombies.includes(z))continue;
      const p=hitPoint(z),distance=Math.max(0,dist(m.x,m.y,p.x,p.y)-z.radius*0.45);
      if(distance>MICRO_MISSILE.blastRadius||!clear(m,p))continue;
      const damage=MICRO_MISSILE.damage*(1-0.6*distance/MICRO_MISSILE.blastRadius)*m.damageMul;
      z.hp-=damage;PixelArt.hit(z);addDamageText(z.x,z.y-z.radius-10,damage,'#ffbd83');
      if(z.hp<=0)handleZombieDeath(state.zombies.indexOf(z),true,'normal',m.ownerId);
      if(!state.running||state.gameOver)break;
    }
  }
  function updateMissiles(dt){
    const targets=new Map(state.zombies.map(z=>[z.id,z]));
    for(let i=missiles.length-1;i>=0;i--){
      const m=missiles[i];m.age+=dt;m.life-=dt;m.seek-=dt;
      let target=targets.get(m.targetId);
      if(m.seek<=0){
        if(!validTarget(target,m)){target=randomTarget(m);m.targetId=target?.id??null;}
        m.seek=0.1;
      }
      if(target&&alive(target)&&state.zombies.includes(target)){
        const p=hitPoint(target),desired=Math.atan2(p.y-m.y,p.x-m.x),turn=Math.atan2(Math.sin(desired-m.angle),Math.cos(desired-m.angle));
        m.angle+=clamp(turn,-MICRO_MISSILE.turnRate*dt,MICRO_MISSILE.turnRate*dt);
      }
      m.speed=Math.min(MICRO_MISSILE.speed,m.speed+MICRO_MISSILE.acceleration*dt);
      const travel=m.speed*dt,steps=Math.max(1,Math.ceil(travel/4)),dx=Math.cos(m.angle)*travel/steps,dy=Math.sin(m.angle)*travel/steps;
      let impact=false,out=false;
      // Four-pixel sweep steps avoid tunnelling through walls and small enemies.
      for(let step=0;step<steps;step++){
        const x=m.x+dx,y=m.y+dy;
        if(x<2||y<2||x>WORLD.w-2||y>WORLD.h-2){out=true;break;}
        if(Town.walls({x:x-2,y:y-2,w:4,h:4}).some(r=>circleRectCollision(x,y,MICRO_MISSILE.radius,r))){impact=true;break;}
        m.x=x;m.y=y;
        if(state.zombies.some(z=>{if(!alive(z))return false;const p=hitPoint(z);return dist(x,y,p.x,p.y)<=z.radius+MICRO_MISSILE.radius;})){impact=true;break;}
      }
      m.trailTimer-=dt;
      if(m.trailTimer<=0){trails.push({x:m.x-Math.cos(m.angle)*6,y:m.y-Math.sin(m.angle)*6,age:0,seed:m.id});m.trailTimer=0.025;if(trails.length>720)trails.shift();}
      if(impact||out||m.life<=0){missiles.splice(i,1);detonate(m,impact);if(!state.running||state.gameOver)return;}
    }
  }
  function update(dt){
    if(state.paused)return;
    effects(dt);if(!state.running||state.gameOver)return;
    updateMissiles(dt);if(!state.running||state.gameOver)return;
    for(let i=drones.length-1;i>=0;i--){
      const d=drones[i];const owner=Coop.active?Coop.byId(d.ownerId):player;if(!owner||owner.hp<=0||owner.connected===false){retire(d);drones.splice(i,1);continue;}d.life-=dt;if(d.life<=0){retire(d);drones.splice(i,1);continue;}
      Coop.withPlayer(owner,()=>{
      patrol(d,dt);
      d.cooldown=Math.max(0,d.cooldown-dt);const spec=MICRO_MISSILE;
      if(d.reload>0){d.reload=Math.max(0,d.reload-dt);if(d.reload===0)d.mag=spec.mag;}
      const gun=dronePose(d);
      const ready=d.cooldown===0&&d.reload===0&&(Coop.active?missiles.filter(m=>m.ownerId===d.ownerId).length:missiles.length)<spec.maxActive;
      let target=state.zombies.find(z=>z.id===d.targetId&&validTarget(z,gun));
      if(ready||!target)target=randomTarget(gun);
      d.targetId=target?.id??null;
      const point=target?hitPoint(target):null;
      const desired=point?Math.atan2(point.y-gun.y,point.x-gun.x):(d.patrolAngle??d.angle);
      // Exponential shortest-arc interpolation: the launcher and its flashlight
      // share one continuous heading, including target changes and idle patrol.
      const turn=Math.atan2(Math.sin(desired-d.angle),Math.cos(desired-d.angle));
      d.angle+=turn*(1-Math.exp(-(target?DRONE.aimInterpSpeed:DRONE.patrolInterpSpeed)*dt));
      // Homing rockets leave the visibly aimed pod, then steer to their own lock.
      if(target&&ready)launch(d,gun,target);
      });
    }
  }
  function pixelLine(points,cam,width,color,alpha){
    ctx.fillStyle=color;ctx.globalAlpha=alpha;
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(dist(a.x,a.y,b.x,b.y)/2));
      for(let j=0;j<=n;j++)ctx.fillRect(Math.round((a.x+(b.x-a.x)*j/n-cam.x)/2)*2-width/2,Math.round((a.y+(b.y-a.y)*j/n-cam.y)/2)*2-width/2,width,width);
    }
  }
  function drawArcs(cam){
    ctx.save();
    for(const a of arcs){
      const t=a.age/a.life,alpha=Math.pow(1-t,0.65),f=Math.min(2,Math.floor(t*3));
      const start=a.sourceEntity?hitPoint(a.sourceEntity):a.a,end=a.entity?hitPoint(a.entity):a.b;
      const points=a.frames[f].map((p,i,all)=>{const u=i/(all.length-1);return {x:p.x+(start.x-a.a.x)*(1-u)+(end.x-a.b.x)*u,y:p.y+(start.y-a.a.y)*(1-u)+(end.y-a.b.y)*u};});
      pixelLine(points,cam,10,'#196caa',alpha*0.18);pixelLine(points,cam,6,'#34b8e7',alpha*0.55);pixelLine(points,cam,2,'#d3faff',alpha);
      const k=Math.floor(points.length*0.55),branchDX=points[k].x-a.frames[f][k].x,branchDY=points[k].y-a.frames[f][k].y;
      pixelLine(a.branches[f].map(p=>({x:p.x+branchDX,y:p.y+branchDY})),cam,2,'#6fdcff',alpha*0.6);
      if(a.entity){const x=end.x-cam.x,y=end.y-cam.y;
        for(let i=0;i<10;i++){const angle=i*Math.PI/5+a.seed,r=4+t*(18+hash(i+a.seed)*28),size=i%3===0?4:2;
          pxRect(x+Math.cos(angle)*r,y+Math.sin(angle)*r,size,size,i%2?'#b7f7ff':'#51bbe9',alpha);}
        pxRect(x-3,y-3,6,6,'#e0fbff',alpha*0.8);
      }
    }
    ctx.restore();
  }
  function drawDrones(cam){
    for(const d of drones)PixelArt.drone(d,cam,clock);
    for(const b of bursts){const t=b.age/0.7;
      for(let i=0;i<18;i++){const a=i*2.39996,r=t*(18+hash(i+b.seed)*35);pxRect(b.x-cam.x+Math.cos(a)*r,b.y-cam.y+Math.sin(a)*r+t*t*25,2+i%2*2,2,i%3?'#60666b':'#f64a50',1-t);}
    }
  }
  function drawMissiles(cam){
    for(const p of trails){const t=p.age/0.3,size=t<0.25?2:3;
      pxRect(p.x-cam.x-size/2,p.y-cam.y-size/2-t*3,size,size,t<0.2?'#ffd09a':'#647078',(1-t)*(t<0.2?0.9:0.4));}
    for(const m of missiles)PixelArt.microMissile(m,cam);
  }
  function drawImpacts(cam){
    for(const e of impacts){
      const t=e.age/0.38,x=e.x-cam.x,y=e.y-cam.y;
      if(x<-70||y<-70||x>SW+70||y>SH+70)continue;
      for(let i=0;i<12;i++){
        const a=i*2.39996,r=Math.sqrt(t)*e.radius*(0.28+hash(e.seed+i)*0.62),size=Math.max(2,Math.round((1-t)*(4+hash(i+e.seed)*6)/2)*2);
        pxRect(x+Math.cos(a)*r-size/2,y+Math.sin(a)*r-size/2,size,size,t<0.3?'#ffad5e':'#776b62',(1-t)*0.9);
        if(t<0.45)pxRect(x+Math.cos(a)*r,y+Math.sin(a)*r,2,2,'#ffe8bd',1-t);
      }
      for(let i=0;i<16;i++){const a=i*Math.PI/8,r=e.radius*t;pxRect(x+Math.cos(a)*r,y+Math.sin(a)*r,2,2,'#c8a07c',(1-t)*0.45);}
      if(t<0.22)pxRect(x-3,y-3,6,6,'#fff0ce',1-t/0.22);
    }
  }
  function drawHUD(){
    const mine=Coop.client?drones.filter(d=>d.ownerId===player.id):drones;
    if(!mine.length||!state.running)return;ctx.save();ctx.font='11px Courier New';ctx.textAlign='left';
    const hudTop=document.querySelector?.('.hudBottom')?.getBoundingClientRect().top;
    const x=18,y=Number.isFinite(hudTop)&&hudTop>0?Math.min(SH-(SW<=580?335:182),hudTop-14-mine.length*19):SH-(SW<=580?335:182);pxRect(x-8,y-18,268,20+mine.length*19,'#11151b',0.86);ctx.fillStyle='#ef7176';ctx.fillText((lang==='zh'?'导弹无人机':'MISSILE DRONES')+' '+mine.length+'/3',x,y-4);
    mine.forEach((d,i)=>{ctx.fillStyle=d.life<10?'#f0b579':'#c6d5cb';const ammo=d.reload>0?(lang==='zh'?'换弹 ':'LOAD ')+d.reload.toFixed(1)+'s':d.mag+'/10';
      ctx.fillText((i+1)+'. '+(lang==='zh'?'微型导弹':'MICRO')+'  '+ammo+'  '+Math.ceil(d.life)+'s',x,y+15+i*19);});ctx.restore();
  }
  function lights(cam=camera()){
    const cells=new Map();
    const sources=[...arcs.filter(a=>a.entity).map(a=>({...hitPoint(a.entity),radius:75,strength:0.32*(1-a.age/a.life),color:'90,200,240',priority:4})),
      ...impacts.map(e=>({x:e.x,y:e.y,radius:65,strength:0.26*(1-e.age/0.38),color:'255,146,84',priority:3})),
      ...flashes.map(f=>({x:f.x,y:f.y,radius:f.kind==='microMissile'?38:80,strength:0.2*(1-f.age/0.09),priority:2}))];
    for(const light of sources){const key=Math.floor(light.x/80)+','+Math.floor(light.y/80);if(!cells.has(key)||cells.get(key).strength<light.strength)cells.set(key,light);}
    return [...cells.values()].filter(s=>s.strength>0&&Lighting.visible(s,cam));
  }
  function flashlights(){
    return drones.map(d=>{const p=dronePose(d),lamp=safeMuzzle(p.x+Math.cos(d.angle)*9*p.scale,p.y+Math.sin(d.angle)*9*p.scale,p);
  return {...lamp,angle:d.angle,beam:true,radius:DRONE.beamLength,beamAngle:DRONE.beamAngle,falloff:DRONE.beamFalloff,strength:DRONE.beamStrength};});
  }
      // Editor-only deterministic visual capture: no firing, spawning, damage or audio.
  function artPreview(kind,frame){
    const arrays=[arcs,drones,bursts,missiles,trails,impacts],saved=arrays.map(a=>a.slice()),oldClock=clock;
    try{arrays.forEach(a=>a.length=0);clock=frame/12;
      if(kind==='arc'){
        const a={x:24,y:80},b={x:200,y:80},frames=Array.from({length:3},(_,i)=>path(a,b,71+i*117));
        const branches=frames.map((points,i)=>path(points[Math.floor(points.length*.55)],{x:150,y:110},99+i));
        arcs.push({a,b,frames,branches,seed:71,age:frame/12*.17,life:.18,entity:{x:200,y:88,type:'walker'}});drawArcs({x:0,y:0});
      }else if(kind==='micro-impact'){impacts.push({x:64,y:64,radius:42,seed:7,age:frame/12*.36});drawImpacts({x:0,y:0});}
      else if(kind==='drone-burst'){bursts.push({x:64,y:50,age:frame/12*.65,seed:11});drawDrones({x:0,y:0});}
      else if(kind==='trail'){for(let i=0;i<12;i++)trails.push({x:22+i*6,y:50-i*2,age:Math.min(.29,(i+frame/12)/45)});drawMissiles({x:0,y:0});}
    }finally{arrays.forEach((a,i)=>a.splice(0,a.length,...saved[i]));clock=oldClock;}
  }
  function stop(){for(const d of drones)retire(d);drones.length=0;missiles.length=0;trails.length=0;}
  function reset(){arcs.length=0;drones.length=0;bursts.length=0;flashes.length=0;missiles.length=0;trails.length=0;impacts.length=0;clock=0;}
  function snapshot(){return {clock,arcs:arcs.map(a=>({...a,entity:a.entity?{id:a.entity.id,x:a.entity.x,y:a.entity.y,type:a.entity.type}:null,sourceEntity:a.sourceEntity?{id:a.sourceEntity.id,x:a.sourceEntity.x,y:a.sourceEntity.y,type:a.sourceEntity.type}:null})),drones,bursts,flashes,missiles,trails,impacts};}
  function applySnapshot(s){clock=s.clock;for(const [k,list] of Object.entries({arcs,drones,bursts,flashes,missiles,trails,impacts}))list.splice(0,list.length,...s[k]);}
  return {snapshot,applySnapshot,artPreview,fire,electric,deploy,update,effects,drawArcs,drawDrones,drawMissiles,drawImpacts,drawHUD,lights,flashlights,dronePose,stop,reset,
    get drones(){return drones;},get arcs(){return arcs;},get missiles(){return missiles;},get impacts(){return impacts;},get trails(){return trails;},get clock(){return clock;}};
})();
