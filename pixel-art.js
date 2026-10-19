// Original code-native pixel artwork. One source pixel = two world pixels.
// Sprites are cached; animation and randomness never advance inside draw calls.
const PixelArt = (() => {
  const cache=new Map(), corpses=[], casings=[];
  const BOSS_FALL={impact:1.1,settle:1.5};
  // Screen-space fall directions, independent of the living sprite's facing.
  const CHARRED_DIRECTIONS=Object.freeze([
    {angle:0,en:'right',zh:'向右'},
    {angle:Math.PI/6,en:'down-right',zh:'右下'},
    {angle:-Math.PI/6,en:'up-right',zh:'右上'},
    {angle:Math.PI,en:'left',zh:'向左'},
    {angle:Math.PI*5/6,en:'down-left',zh:'左下'},
    {angle:-Math.PI*5/6,en:'up-left',zh:'左上'}
  ].map(Object.freeze));
  const CORPSE={maxResting:32,minAnimation:1.5,retireFade:0.45,normalLife:8,bossLife:11,
    hold:0.1,physicsStep:1/120,gravity:460};
  const silhouetteCache=new WeakMap(),fragmentCache=new WeakMap();let fragmentSerial=0;let playerFall=null;const coopFalls=new Map();
  const palettes={
    player:{skin:'#c7a486',light:'#e0c5a1',shade:'#826956',coat:'#66766e',trim:'#96a396',dark:'#303c3e',pants:'#3b4650'},
    walker:{skin:'#879b7a',light:'#b1bb8e',shade:'#536854',coat:'#725647',trim:'#a3866a',dark:'#3d3835',pants:'#414448'},
    runner:{skin:'#b59b8d',light:'#d3b9a1',shade:'#76615e',coat:'#4b6b7c',trim:'#84a1a8',dark:'#253c47',pants:'#414454'},
    crawler:{skin:'#a2857e',light:'#c4a299',shade:'#6d555b',coat:'#7c6650',trim:'#aa9272',dark:'#413b3b',pants:'#464148'},
    bloater:{skin:'#8c9a6c',light:'#b1bc83',shade:'#5d6f55',coat:'#746343',trim:'#b09962',dark:'#414535',pants:'#3d4440'},
    pouncer:{skin:'#a2a0a1',light:'#c3b9b1',shade:'#696974',coat:'#66536b',trim:'#9b7f92',dark:'#393647',pants:'#42404c'},
    charger:{skin:'#9f9482',light:'#c1b39a',shade:'#72675d',coat:'#906449',trim:'#c3925e',dark:'#4b3b35',pants:'#494440'},
    boss:{skin:'#83917c',light:'#b0b396',shade:'#505f57',coat:'#7f4844',trim:'#b67965',dark:'#3b3236',pants:'#3e4448'}
  };
  const hash=(x,y=0)=>{let n=Math.imul(x|0,374761393)+Math.imul(y|0,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
  const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
  const box=(c,x,y,w,h,color)=>{rect(c,x-1,y-1,w+2,h+2,'#192126');rect(c,x,y,w,h,color);};
  function surface(w,h){const s=document.createElement('canvas');s.width=w;s.height=h;return s;}
  function cached(key,w,h,paint){
    if(cache.has(key))return cache.get(key);
    const s=surface(w,h),c=s.getContext('2d');c.imageSmoothingEnabled=false;paint(c);cache.set(key,s);
    if(cache.size>1700)cache.delete(cache.keys().next().value);
    return s;
  }
  function blit(s,x,y,scale=2,alpha=1){ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=alpha;ctx.drawImage(s,Math.round(x),Math.round(y),s.width*scale,s.height*scale);ctx.restore();}
  function direction(a){const c=Math.cos(a),s=Math.sin(a);return Math.abs(s)>Math.abs(c)?(s<0?2:0):(c<0?3:1);}
  function sprite(kind,pose='idle',frame=0,dir=0,variant=0,aiming=false){
    return cached(['actor',kind,pose,frame,dir,variant,aiming].join('/'),kind==='boss'?52:36,kind==='boss'?64:42,c=>{
      const p=palettes[kind]||palettes.walker,boss=kind==='boss',playerSprite=kind==='player';
      c.translate(boss?26:18,boss?42:26);if(dir===3||(playerSprite&&aiming&&(variant===3||variant===5)))c.scale(-1,1);
      const gait=[0,1,2,1,0,-1,-2,-1][frame%8],walk=pose==='walk',idle=pose==='idle';
      const swing=walk?Math.round(gait*(kind==='runner'?1.7:kind==='bloater'?0.6:1)):0,bob=walk?(frame%4===1?-1:0):(idle&&frame>3?-1:0);
      const crouch=pose==='charge'?Math.round(frame/2):pose==='recover'?3:0;
      if(pose==='dead'){c.translate(0,5);c.rotate((dir===3?-1:1)*(0.8+frame*0.06));c.scale(1,Math.max(0.52,1-frame*0.055));}
      if(pose==='hurt'){c.translate(-1,1);c.rotate(-0.08);}
      if(pose==='roll'){
        c.rotate(frame*Math.PI/4);box(c,-6,-6,12,12,p.dark);rect(c,-4,-5,8,5,p.coat);rect(c,-3,-2,7,4,p.skin);
        rect(c,2,-4,3,3,p.light);rect(c,-6,2,5,4,p.pants);rect(c,1,3,5,3,p.pants);rect(c,-2,-6,5,2,p.trim);return;
      }
      c.translate(walk&&kind==='bloater'?Math.sign(gait):0,bob+crouch);
      if(walk&&kind==='runner')c.rotate(dir===2?-0.06:0.06);
      if(kind==='crawler'){
        // Alternating arm pulls and dragging torn trouser legs.
        box(c,-9,1,8,4,p.pants);box(c,-13,3+swing,6,3,p.dark);box(c,-5,-2,11,6,p.coat);
        rect(c,-4,-2,3,5,p.trim);box(c,4,-5,7,6,p.skin);rect(c,6,-5,4,1,p.light);
        box(c,-1,4-swing,8,2,p.shade);rect(c,5,4-swing,4,2,p.skin);box(c,-1,-4+swing,6,2,p.skin);
        rect(c,8,-2,2,1,'#322527');rect(c,9,0,2,2,'#7b4142');return;
      }
      const wide=kind==='bloater',charger=kind==='charger',pouncer=kind==='pouncer';
      if(boss){
        // Asymmetric bruiser: bandages, exposed ribs, torn overalls, heavy hands.
        const leg=pose==='airborne'? -4:swing;
        box(c,-12,6,8,8+leg,p.pants);box(c,4,6,8,8-leg,p.pants);
        box(c,-14,12+leg,10,4,'#303b3e');box(c,4,12-leg,11,4,'#303b3e');
        box(c,-14,-12,28,20,p.skin);rect(c,-12,-11,9,15,p.light);rect(c,8,-8,6,16,p.shade);
        rect(c,-11,-11,5,23,p.coat);rect(c,4,-10,6,23,p.coat);rect(c,-12,3,24,8,p.coat);
        rect(c,-9,4,3,5,p.trim);rect(c,7,3,3,7,p.dark);rect(c,-3,-9,3,12,p.shade);
        for(let i=0;i<4;i++){rect(c,0,-7+i*3,5,1,p.light);rect(c,-6,-8+i*3,2,2,'#765957');}
        const arms=pose==='airborne'?-12:pose==='charge'?3:pose==='recover'?6:0;
        box(c,-20,-10+arms+swing,7,19,p.skin);rect(c,-20,-9+arms+swing,3,12,p.light);
        box(c,14,-10+arms-swing,8,19,p.shade);rect(c,15,-6+arms-swing,6,3,'#b5ac91');
        rect(c,15,-2+arms-swing,6,2,'#d0c3a1');box(c,-22,5+arms+swing,10,6,p.shade);box(c,13,5+arms-swing,11,7,p.skin);
        box(c,-7,-23,14,12,p.skin);rect(c,-6,-22,9,3,p.light);rect(c,3,-20,4,8,p.shade);
        rect(c,-8,-24,12,3,'#454c44');rect(c,-6,-17,4,2,'#282c2a');rect(c,2,-17,3,2,'#282c2a');
        rect(c,-5,-17,2,1,pose==='charge'?'#efb681':'#bd7b64');rect(c,3,-17,1,1,'#d9a076');
        rect(c,-4,-12,9,2,'#493335');rect(c,-3,-12,2,1,'#d1c5a1');rect(c,1,-12,2,1,'#d1c5a1');
        if(dir===2){rect(c,-7,-22,14,10,p.shade);rect(c,-6,-22,11,3,p.light);rect(c,-3,-11,5,15,p.shade);}
        return;
      }
      const width=wide?16:charger?14:10,half=width/2,air=pose==='airborne';
      const legL=air?-2:swing,legR=air?-3:-swing;
      box(c,-half+1,2,4,6+legL,p.pants);box(c,half-5,2,4,6+legR,p.pants);
      rect(c,-half+1,3,1,3,p.trim);rect(c,half-5,3,1,2,p.trim);
      box(c,-half,7+legL,5,2,'#293236');box(c,half-5,7+legR,6,2,'#293236');
      rect(c,-half,7+legL,3,1,'#606860');rect(c,half-4,7+legR,3,1,'#606860');
      const armRaise=pose==='attack'?-4:air?-5:0;
      if(!playerSprite||!aiming){
      box(c,-half-3,-5-swing+armRaise,3,8,p.coat);box(c,half,-5+swing+armRaise,3,8,p.dark);
      rect(c,-half-3,1-swing+armRaise,3,3,p.skin);rect(c,half,1+swing+armRaise,3,3,p.shade);
      }
      box(c,-half,-6,width,10,p.coat);rect(c,-half,-5,2,7,p.trim);rect(c,half-3,-5,3,8,p.dark);
      rect(c,-half,3,width,2,'#303637');rect(c,-1,3,2,1,'#b0a485');
      if(playerSprite){
        // Field jacket, plate carrier, shoulder radio, backpack/tank.
        rect(c,-3,-4,6,6,'#354840');rect(c,-3,-4,5,1,'#a0a18b');rect(c,-3,-1,2,3,'#727d64');rect(c,0,-1,2,3,'#727d64');
        rect(c,-6,-6,2,2,'#b7a170');rect(c,-6,-8,1,3,'#303d42');
        if(dir===2){box(c,-4,-5,8,8,'#586554');rect(c,-3,-4,6,2,'#8b9475');rect(c,-3,0,6,1,'#2d423a');}
      }else if(wide){
        box(c,-half+2,-3,width-4,8,p.skin);rect(c,-half+3,-2,width-7,2,p.light);rect(c,-2,1,4,4,p.shade);
        for(const [x,y] of [[-4,-2],[3,0],[5,3]]){rect(c,x,y,2,2,'#bac084');rect(c,x,y+1,1,1,'#6b684b');}
      }else{
        rect(c,-3,-4,2,7,p.shade);rect(c,-2,-2,3,2,'#713e40');rect(c,-half+2,1,2,3,p.skin);
        if(variant===1){rect(c,-half,-4,width,1,p.trim);rect(c,-half,-1,width,1,p.trim);}
        if(variant===2){rect(c,-2,-6,2,8,p.dark);rect(c,1,-3,2,1,p.trim);}
      }
      const headY=pouncer?-13:wide?-14:-15,headW=charger?10:8;
      box(c,-headW/2,headY,headW,8,p.skin);rect(c,-headW/2,headY,headW-2,2,p.light);
      rect(c,headW/2-2,headY+2,2,6,p.shade);rect(c,-1,headY+6,3,2,p.shade);
      if(playerSprite){
        rect(c,-5,headY-1,10,3,'#374441');rect(c,-4,headY-1,7,1,'#82917c');rect(c,3,headY+1,4,1,'#273333');
        if(dir!==2){rect(c,-3,headY+3,7,2,'#24343a');rect(c,-2,headY+3,2,1,'#a1b2af');rect(c,4,headY+6,3,1,'#79543c');rect(c,7,headY+6,1,1,'#c28a54');}
      }else{
        rect(c,-headW/2,headY-1,headW-2,2,variant===1?'#635448':'#414d47');
        if(dir!==2){rect(c,-3,headY+3,2,1,'#292b2a');rect(c,1,headY+3,2,1,'#292b2a');
          rect(c,2,headY+3,1,1,pouncer?'#d0b4bc':'#ba9c75');rect(c,0,headY+6,3,1,'#6d3d3c');rect(c,2,headY+7,1,2,'#854849');}
      }
      if(dir===1){rect(c,-headW/2,headY+2,3,5,p.shade);rect(c,headW/2,headY+4,1,2,p.skin);}
      if(dir===2){rect(c,-headW/2,headY+2,headW,5,p.shade);rect(c,-3,headY+1,6,2,p.skin);}
      if(playerSprite&&aiming){
        if(variant===5||variant===7){rect(c,2,headY+3,2,4,p.skin);rect(c,3,headY+3,1,1,'#23363c');}
        if(variant===1||variant===3){rect(c,-3,headY+3,2,3,p.shade);rect(c,3,headY+4,2,2,p.light);}
        if(variant===2){rect(c,-3,headY+3,6,2,'#24343a');rect(c,-2,headY+3,2,1,'#a1b2af');}
      }
      if(charger){box(c,-8,-9,5,5,'#6e7770');rect(c,-8,-9,4,1,'#b0b5a1');box(c,4,-9,5,5,'#65706c');rect(c,-6,-17,12,3,pose==='charge'?'#c3a471':'#8d7961');}
      if(pouncer){rect(c,-6,-11,2,6,'#c5bbb0');rect(c,5,-11,2,6,'#9e9596');rect(c,-8,2-swing,4,1,'#c5bbb0');rect(c,6,2+swing,4,1,'#c5bbb0');}
      if(pose==='reload'&&!aiming){box(c,2,0+frame%3,4,3,p.skin);rect(c,5,1+frame%3,2,1,p.light);}
    });
  }
  function militaryPulse(time,phase=0){const t=(time+phase)%1.4;return t<0.14||(t>0.25&&t<0.39);}
  function weapon(kind,angle,frame=0,reload=false,lit=false){
    const step=Math.round(angle/(Math.PI*2)*128),a=step/128*Math.PI*2;
    return cached(`gun/${kind}/${step}/${frame}/${reload}/${lit?1:0}`,42,42,c=>{
      c.translate(21,21);c.rotate(a);c.scale(1,Math.cos(a)<0?-1:1);
      const steel='#778b8e',edge='#b4c1b7',dark='#26373d',wood='#8a6751';
      if(kind==='shotgun'){
        box(c,-6,-2,5,3,wood);rect(c,-5,-2,3,1,'#bd9673');box(c,-1,-2,6,3,steel);rect(c,0,-2,4,1,edge);
        box(c,4,-2,10,2,dark);rect(c,5,-2,8,1,'#87968e');box(c,reload?4:6,0,5,2,wood);rect(c,13,-3,1,1,edge);
      }else if(kind==='gatling'){
        box(c,-6,-3,10,6,'#4d6766');rect(c,-5,-3,7,1,edge);box(c,-3,3,4,4,'#747767');
        box(c,4,-3,10,6,dark);for(let i=0;i<3;i++)rect(c,5,-2+i*2,9,1,(i+frame)%3===0?edge:steel);
        rect(c,6,-4,2,8,'#4c5d5c');rect(c,12,-4,2,8,'#627676');rect(c,-8,-1,2,4,wood);
        rect(c,-1,4,1,3,'#c3a66b');
      }else if(kind==='rocket'){
        box(c,-9,-3,23,6,'#617452');rect(c,-7,-3,17,1,'#a6ad78');rect(c,-7,1,19,2,'#384a3e');
        box(c,12,-4,3,8,'#8f9e87');rect(c,14,-3,1,6,'#263536');rect(c,-8,-4,3,8,'#7c8b73');
        rect(c,3,-2,3,4,'#b8ad6b');box(c,-1,3,3,3,'#654f3c');rect(c,0,-5,4,1,steel);
      }else if(kind==='arc'){
        box(c,-7,-3,12,6,'#14191f');rect(c,-6,-3,9,1,'#62686b');box(c,-4,3,3,3,'#24282d');
        rect(c,-6,0,5,1,'#080b10');rect(c,-5,-2,1,1,'#8b9090');
        box(c,-1,-5,5,3,'#24272d');rect(c,0,-5,3,2,lit?'#ff384a':'#681f2b');
        box(c,4,-3,8,6,'#10151b');for(let i=0;i<3;i++){rect(c,4+i*3,-3,1,6,lit?'#ed3949':'#722c37');rect(c,4+i*3,-1,1,2,lit?'#ffb19f':'#a7474d');}
        rect(c,12,-4,4,2,'#555e66');rect(c,12,2,4,2,'#555e66');rect(c,15,-3,2,1,lit?'#ff7778':'#82323a');rect(c,15,2,2,1,lit?'#ff7778':'#82323a');
      }else{
        box(c,-5,-3,10,6,steel);rect(c,-4,-3,7,1,edge);box(c,5,-2,8,3,dark);box(c,12,-3,3,5,'#9c7959');
        rect(c,-4,2,8,1,'#baa774');rect(c,1,3,2,4,'#5d6860');rect(c,2,5,5,1,'#b4a36b');
        rect(c,13,2,1,2,frame?'#e9b475':'#b58f61');rect(c,-3,-1,2,2,'#414f53');
      }
    });
  }
  function initActor(o){if(o.artX===undefined){o.artX=o.x;o.artY=o.y;o.animPhase=0;o.artFacing=0;o.artMoving=false;}}
  function animate(o,dt){
    initActor(o);const dx=o.x-o.artX,dy=o.y-o.artY,d=Math.hypot(dx,dy);
    o.artMoving=d>0.12&&d<60;o.animPhase=(o.animPhase+(o.artMoving?d*(Coop.isPlayer(o)?Math.PI/50:o.type==='boss'?0.028:0.1):0))%(Math.PI*2);
    if(o.artMoving)o.artFacing=Math.atan2(dy,dx);
    o.artX=o.x;o.artY=o.y;o.artRecoil=Math.max(0,(o.artRecoil||0)-dt);o.artHit=Math.max(0,(o.artHit||0)-dt);
  }
  function update(dt){
    for(const p of Coop.all())animate(p,dt);for(const z of state.zombies)animate(z,dt);
    updateDeaths(dt);
    for(let i=casings.length-1;i>=0;i--){const p=casings[i];p.age+=dt;if(p.age<0.42){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(0.05,dt);p.vy*=Math.pow(0.05,dt);}if(p.age>5)casings.splice(i,1);}
  }
  function shot(angle,kind){
    player.artRecoil=kind==='gatling'?0.075:0.18;player.artShotUntil=state.time+(kind==='flamethrower'?0.045:0.07);player.artShotAngle=angle;player.artShotKind=kind;
    if(kind==='shotgun'||kind==='gatling'){
      casings.push({x:player.x+Math.cos(angle)*6,y:player.y+Math.sin(angle)*6,age:0,vx:Math.cos(angle+Math.PI/2)*65,vy:Math.sin(angle+Math.PI/2)*65,kind});
      if(casings.length>64)casings.shift();
    }
  }
  function hit(z){z.artHit=0.13;}
  // The same attachment pose drives the rendered weapon and projectile origin.
  function aimPose(o=player,cam=camera()){
    const target=Coop.aim(o,cam),targetX=target.x,targetY=target.y;
    const initial=Math.atan2(targetY-(o.y-6),targetX-o.x),sector=((Math.round(initial/(Math.PI/4))%8)+8)%8;
    const shoulder=sector===5?-9:sector===6||sector===7?9:0;
    const baseX=o.x+shoulder,baseY=o.y-6,angle=Math.atan2(targetY-baseY,targetX-baseX);
    const dx=Math.cos(angle),dy=Math.sin(angle),flip=dx<0?-1:1,x=baseX+dx*4,y=baseY+dy*4;
    const length=o.weapon==='arc'?32:o.weapon==='rocket'||o.weapon==='flamethrower'?30:28;
    return {angle,dx,dy,flip,x,y,targetX,targetY,muzzleX:x+dx*length,muzzleY:y+dy*length,
      sector:((Math.round(angle/(Math.PI/4))%8)+8)%8};
  }
  function aimRig(o=player,cam=camera()){
    const aim=aimPose(o,cam),recoil=Math.min(3,(o.artRecoil||0)*22),x=aim.x-aim.dx*recoil,y=aim.y-aim.dy*recoil;
    const point=(u,v)=>({x:x+aim.dx*u-aim.dy*v*aim.flip,y:y+aim.dy*u+aim.dx*v*aim.flip});
    const trigger=point(-1,5),support=point(o.weapon==='shotgun'?12:14,4);
    if(o.reloadTimer>0){
      const total=WEAPONS[o.weapon].reload;
      const phase=Math.sin(clamp(1-o.reloadTimer/total,0,1)*Math.PI);
      support.x+=(o.x-aim.flip*11-support.x)*phase;support.y+=(o.y+6-support.y)*phase;
    }
    const near={x:o.x+aim.flip*8,y:o.y-9},far={x:o.x-aim.flip*7,y:o.y-10};
    function solve(s,w,bend){
      const dx=w.x-s.x,dy=w.y-s.y,d=Math.hypot(dx,dy)||1,L=Math.max(12,d*0.54),along=d*0.5;
      const offset=Math.sqrt(Math.max(0,L*L-along*along));
      return {shoulder:s,elbow:{x:s.x+dx/d*along-dy/d*offset*bend,y:s.y+dy/d*along+dx/d*offset*bend},hand:w};
    }
    const length=o.weapon==='arc'?32:o.weapon==='rocket'||o.weapon==='flamethrower'?30:28;
    return {...aim,x,y,trigger,support,near:solve(near,trigger,aim.flip),far:solve(far,support,-aim.flip),
      behind:aim.dy<-0.25,muzzleX:x+aim.dx*length,muzzleY:y+aim.dy*length};
  }
  const playerLayer=surface(70,70);let rigShadows=new WeakMap(),playerShadow=null;
  function drawPlayerRig(o,cam,paint=true){
    playerShadow=rigShadows.get(o)||null;
    if(o.hp<=0){if(paint)drawPlayerFall(cam,Coop.active?coopFalls.get(o.id):playerFall);return;}
    const rig=aimRig(o,cam),x=Math.round(o.x-cam.x),groundY=Math.round(o.y-cam.y),lift=Coop.withPlayer(o,()=>getPlayerJumpVisual().lift);
    let pose=o.artMoving?'walk':'idle',frame=o.artMoving?Math.floor((o.animPhase||0)/Math.PI*4)%8:Math.floor(state.time*2)%8;
    if(o.dashTime>0){pose='roll';frame=Math.min(7,Math.floor((1-o.dashTime/0.18)*8));}
    else if(o.rocketJumpTime>0)pose='airborne';else if(o.artHit>0)pose='hurt';
    if(o.hp<=0){pose='dead';frame=Math.min(7,Math.floor((1.4-state.deathAnim)*8));}
    const active=o.hp>0&&pose!=='roll',dir=[1,0,0,0,3,2,2,2][rig.sector];
    const cycling=state.time<(o.artShotUntil||0)?Math.floor(state.time*24)%3:0;
    const lit=o.weapon==='arc'&&(militaryPulse(state.time)||state.time<(o.artShotUntil||0));
    const shadowKey=[o.x,o.y,cam.x,cam.y,lift,pose,frame,dir,rig.sector,rig.angle,rig.x,rig.y,rig.support.x,rig.support.y,o.weapon,o.reloadTimer>0,cycling,lit].join('/');
    if(!paint&&playerShadow?.key===shadowKey)return;
    const body=sprite('player',pose,frame,dir,rig.sector,active),c=playerLayer.getContext('2d');
    c.clearRect(0,0,70,70);c.save();c.imageSmoothingEnabled=false;c.translate(35,40);
    const local=p=>({x:(p.x-o.x)/2,y:(p.y-o.y)/2});
    function line(a,b,width,color){
      const dx=b.x-a.x,dy=b.y-a.y,n=Math.max(1,Math.ceil(Math.hypot(dx,dy)*2));
      for(let i=0;i<=n;i++)rect(c,a.x+dx*i/n-width/2,a.y+dy*i/n-width/2,width,width,color);
    }
    function arm(a){
      const s=local(a.shoulder),e=local(a.elbow),h=local(a.hand);
      line(s,e,4,'#192126');line(e,h,4,'#192126');line(s,e,2,'#66766e');line(e,h,2,'#96a396');
    }
    function gun(){
      const reload=o.reloadTimer>0;
      const g=weapon(o.weapon,rig.angle,cycling,reload,lit),p=local(rig);
      c.drawImage(g,Math.round(p.x)-21,Math.round(p.y)-21);
      for(const hand of [rig.trigger,rig.support]){const h=local(hand);box(c,h.x-1,h.y-1,2,2,'#c7a486');rect(c,h.x-1,h.y-1,1,1,'#e0c5a1');}
    }
    if(active){arm(rig.far);if(rig.behind){arm(rig.near);gun();}}
    c.drawImage(body,-18,-26);
    if(active&&!rig.behind){arm(rig.far);arm(rig.near);gun();}
    if(active&&o.weapon==='flamethrower'){
      const tx=rig.flip<0?5:-7;box(c,tx,-4,3,7,'#707f66');rect(c,tx,-3,1,5,'#a2ac89');rect(c,tx,-1,3,1,'#394c4d');
    }
    // Read the assembled body, arms and weapon before painting transient muzzle fire.
    // This canvas is mutable, so its outline must not use the sprite WeakMap cache.
    if(playerShadow?.key!==shadowKey)playerShadow={key:shadowKey,caster:outlineCaster(silhouette(playerLayer,false).map(p=>({
      x:cam.x+x-70+p.x*2,y:cam.y+Math.round(groundY-80-lift)+p.y*2
    })),'player','player')};
    rigShadows.set(o,playerShadow);
    if(active&&o.weapon!=='arc'&&state.time<(o.artShotUntil||0)&&!o.reloadTimer){
      const m=local({x:rig.muzzleX,y:rig.muzzleY}),len=o.weapon==='shotgun'?9:o.weapon==='gatling'?5:7;
      c.save();c.translate(Math.round(m.x),Math.round(m.y));c.rotate(Math.round(rig.angle*32)/32);
      rect(c,-1,-3,len+2,6,'#b98142');rect(c,0,-2,len,4,'#e3b46c');rect(c,0,-1,len*0.7,2,'#ead4a2');c.restore();
    }
    c.restore();if(paint){pxRect(x-10,groundY+14,20,5,'#081219',0.36);blit(playerLayer,x-70,groundY-80-lift);}

  }
  function enemyPose(o){
    const a=o.artFacing??Math.atan2(player.y-o.y,player.x-o.x);
    let pose=o.artMoving?'walk':'idle',frame=o.artMoving?Math.floor((o.animPhase||0)/Math.PI*4)%8:Math.floor(state.time*2+(o.id||0))%8,lift=o.lift||0;
    if(o.bossPhase==='charge'){pose='charge';frame=Math.floor((1-o.bossTimer/BOSS_SLAM.charge)*7);}
    else if(o.bossPhase==='airborne')pose='airborne';
    else if(o.bossPhase==='recover'){pose='recover';frame=0;}
    else if(o.state==='windup'){pose='charge';frame=5;}
    else if(o.state==='charge'||o.pounceTime>0){pose='attack';frame=4;if(o.type==='pouncer')lift=16*Math.sin(Math.max(0,o.pounceTime)/0.28*Math.PI);}
    else if(o.artHit>0)pose='hurt';
    const dir=direction(a);return {pose,frame,lift,dir,s:sprite(o.type,pose,frame,dir,(o.id||0)%3)};
  }
  // Alpha-derived convex silhouettes follow the actual pose, including crawling.
  function silhouette(body,remember=true){
    if(remember&&silhouetteCache.has(body))return silhouetteCache.get(body);
    const {width:w,height:h}=body,data=body.getContext('2d').getImageData(0,0,w,h).data,points=[];
    for(let y=0;y<h;y++){
      let left=w,right=-1;for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]){left=Math.min(left,x);right=x;}
      if(right>=0)points.push({x:left,y},{x:left,y:y+1},{x:right+1,y},{x:right+1,y:y+1});
    }
    points.sort((a,b)=>a.x-b.x||a.y-b.y);
    const cross=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x),lower=[],upper=[];
    for(const p of points){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
    for(const p of [...points].reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
    const hull=lower.slice(0,-1).concat(upper.slice(0,-1));if(remember)silhouetteCache.set(body,hull);return hull;
  }
  function outlineCaster(points,kind,entityId){
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y),x=(Math.min(...xs)+Math.max(...xs))/2,y=(Math.min(...ys)+Math.max(...ys))/2;
    return {x,y,r:Math.max(...points.map(p=>Math.hypot(p.x-x,p.y-y))),kind,entityId,points};
  }
  function playerCaster(cam=camera(),o=player){
    if(o.hp<=0){
      const d=Coop.active?coopFalls.get(o.id):playerFall;if(!d)return null;
      const lift=d.lift*Math.max(0,1-d.age/.3),body=fallFrame('player',d.age,d.dir);
      return outlineCaster(silhouette(body).map(p=>({x:cam.x+Math.round(d.x-cam.x-128)+p.x*2,
        y:cam.y+Math.round(d.y-cam.y-148-lift)+p.y*2})),'player','player');
    }
    // Normally reuses the outline prepared by drawActors in this same frame.
    drawPlayerRig(o,cam,false);return {...playerShadow.caster,entityId:o.id||'player'};
  }
  function caster(o){
    const v=enemyPose(o),ox=o.type==='boss'?52:36,oy=o.type==='boss'?84:52;
    const points=silhouette(v.s).map(p=>({x:o.x-ox+p.x*2,y:o.y-v.lift-oy+p.y*2}));
    return outlineCaster(points,'zombie',o.id);
  }
  function actor(o,cam,isPlayer=false){
    if(isPlayer)return drawPlayerRig(o,cam);
    const x=Math.round(o.x-cam.x),groundY=Math.round(o.y-cam.y);
    if(x<-120||x>SW+120||groundY<-80||groundY>SH+190)return;
    const v=enemyPose(o),boss=o.type==='boss',sw=(boss?50:23)*(1-v.lift/320);
    ctx.save();ctx.fillStyle='rgba(5,12,17,0.36)';ctx.fillRect(x-sw/2,groundY+(boss?23:15),sw,4);ctx.fillRect(x-sw/2+4,groundY+(boss?21:13),sw-8,8);ctx.restore();
    blit(v.s,x-v.s.width,groundY-v.lift-(boss?84:52));
    if((o.electricUntil||0)>state.time){
      const tint=cached('electric/'+o.type+'/'+v.pose+'/'+v.frame+'/'+v.dir+'/'+((o.id||0)%3),v.s.width,v.s.height,c=>{c.drawImage(v.s,0,0);c.globalCompositeOperation='source-in';c.fillStyle='#9eeeff';c.fillRect(0,0,v.s.width,v.s.height);});
      blit(tint,x-v.s.width,groundY-v.lift-(boss?84:52),2,Math.min(0.55,(o.electricUntil-state.time)*2));
    }
  }
  function drawActors(cam){
    const all=[...state.zombies,...Coop.all()].sort((a,b)=>(a.y+(BossAttack.airborne(a)?10000:0))-(b.y+(BossAttack.airborne(b)?10000:0)));
    for(const o of all)actor(o,cam,Coop.isPlayer(o));
  }
  // Split the painted sprite without duplicating or inventing pixels.
  function fragments(body,kind){
    if(fragmentCache.has(body))return fragmentCache.get(body);
    const w=body.width,h=body.height,data=body.getContext('2d').getImageData(0,0,w,h).data;
    const layers=Array.from({length:6},()=>({data:new Uint8ClampedArray(w*h*4),minX:w,minY:h,maxX:-1,maxY:-1}));
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const offset=(y*w+x)*4;if(!data[offset+3])continue;let part;
      if(kind==='crawler')part=x>=21?0:x<10?(y<29?4:5):y<24?2:y>28?3:1;
      else if(kind==='boss')part=y<31?0:y>=53&&x>=12&&x<=40?(x<26?4:5):x<13?2:x>39?3:1;
      else {const wide=kind==='charger';part=y<20&&x>=12&&x<24?0:x<(wide?11:13)?2:x>(wide?24:22)?3:y>=30?(x<18?4:5):1;}
      const l=layers[part];l.data.set(data.subarray(offset,offset+4),offset);
      l.minX=Math.min(l.minX,x);l.minY=Math.min(l.minY,y);l.maxX=Math.max(l.maxX,x);l.maxY=Math.max(l.maxY,y);
    }
    const serial=++fragmentSerial,result=[];
    layers.forEach((l,part)=>{
      if(l.maxX<0)return;const full=surface(w,h),c=full.getContext('2d'),pixels=c.createImageData(w,h);pixels.data.set(l.data);c.putImageData(pixels,0,0);
      const fw=l.maxX-l.minX+1,fh=l.maxY-l.minY+1,cut=surface(fw,fh);
      cut.getContext('2d').drawImage(full,l.minX,l.minY,fw,fh,0,0,fw,fh);
      result.push({key:serial+'/'+part,image:cut,ox:l.minX+fw/2-(kind==='boss'?26:18),oy:l.minY+fh/2-(kind==='boss'?42:26),part});
    });fragmentCache.set(body,result);return result;
  }
  function death(z,cause='normal'){
    if(z.type==='bloater')return; // All Bloater deaths are explosions, never corpses.
    const charred=cause==='fire'&&z.type!=='boss';
    const dir=direction(z.artFacing||0),variant=(z.id||0)%3,boss=z.type==='boss';
    const fallDirection=charred?Math.min(5,Math.floor(hash(z.id,119)*6)):null;
    const d={id:z.id,x:z.x,y:z.y,type:z.type,dir,variant,age:0,boss,charred,fallDirection,lift:z.lift||0,impactPlayed:false,retireAge:null,motionSteps:0,parts:[]};
    if(boss)AudioEngine.variant('groan',3,{x:z.x,y:z.y,volume:0.32,rate:0.5,group:'boss_death',interval:0.2});
    else if(!charred)d.parts=fragments(sprite(z.type,'idle',0,dir,variant),z.type).map((fragment,i)=>{
      const angle=i/6*Math.PI*2+hash(z.id,17)*Math.PI,speed=48+hash(z.id,i+4)*75;
      return {...fragment,x:z.x,y:z.y,radius:3,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,height:0,vz:85+hash(i,z.id)*100,
        spin:(i%2?1:-1)*(4+hash(i,77)*5),angle:0,bounced:false,settled:false};
    });
    // A burst can kill more than 32 enemies before the next draw. Never evict a
    // new or airborne death animation to make room for another one.
    corpses.push(d);
  }
  function updateDeaths(dt){
    if(!Number.isFinite(dt)||dt<=0)return;
    for(const fall of (Coop.active?[...coopFalls.values()]:playerFall?[playerFall]:[])){fall.age+=dt;if(fall.age>=1.03&&!fall.impactPlayed){fall.impactPlayed=true;AudioEngine.play('roll',{volume:0.28,rate:0.65,gameplay:false});state.cameraShake=Math.max(state.cameraShake,3);}}

    for(let i=corpses.length-1;i>=0;i--){
      const d=corpses[i];d.age+=dt;
      if(d.boss){
        if(d.age>=BOSS_FALL.impact&&!d.impactPlayed){
          d.impactPlayed=true;AudioEngine.variant('explosion',2,{x:d.x,y:d.y,volume:0.2,rate:0.57,group:'boss_bodyfall',interval:0.15});
          state.cameraShake=Math.max(state.cameraShake,4*Math.max(0,1-dist(player.x,player.y,d.x,d.y)/650));
        }
      }else if(d.charred){
        if(d.age>=1.05)d.impactPlayed=true;
      }else{
        // Run the airborne phase on fixed simulation ticks, independent of
        // render FPS. At the exact end of hit-stop there are zero ticks to run.
        const targetSteps=Math.floor(Math.max(0,d.age-CORPSE.hold)/CORPSE.physicsStep+1e-8);
        while(d.motionSteps<targetSteps&&d.parts.some(p=>!p.settled)){
          d.motionSteps++;const step=CORPSE.physicsStep;
          for(const p of d.parts){if(p.settled)continue;
            moveWithWallCollision(p,p.vx*step,p.vy*step);
            p.height+=p.vz*step-0.5*CORPSE.gravity*step*step;p.vz-=CORPSE.gravity*step;p.angle+=p.spin*step;
            p.vx*=Math.pow(0.22,step);p.vy*=Math.pow(0.22,step);
            // Height starts at zero while velocity points UP. Only a descending
            // fragment can land; zero-time / hold-boundary updates must not settle it.
            if(p.height<=0&&p.vz<0){p.height=0;if(!p.bounced&&p.vz<-50){p.bounced=true;p.vz*=-0.23;p.spin*=0.35;}else{p.settled=true;p.vx=0;p.vy=0;p.vz=0;}}
          }
        }
      }
      if(d.retireAge!==null)d.retireAge+=dt;
      if(d.age>(d.boss?CORPSE.bossLife:CORPSE.normalLife)||(d.retireAge!==null&&d.retireAge>=CORPSE.retireFade))corpses.splice(i,1);
    }
    // Only settled ordinary remains share the retention budget. Let every
    // dismemberment finish, then fade the oldest excess instead of popping it.
    // Boss bodies keep their own complete fall and normal lifetime.
    const resting=corpses.filter(d=>!d.boss&&d.retireAge===null&&d.age>=CORPSE.minAnimation&&d.parts.every(p=>p.settled));
    for(let i=0;i<resting.length-CORPSE.maxResting;i++)resting[i].retireAge=0;
  }
  function corpseAlpha(d){
    const ageFade=Math.min(1,((d.boss?CORPSE.bossLife:CORPSE.normalLife)-d.age)/2);
    return Math.max(0,Math.min(ageFade,d.retireAge===null?1:1-d.retireAge/CORPSE.retireFade));
  }
  // Connected joints keep the bruiser's full body mass throughout the collapse.
  // Only rigid rotations/translations are used; no body dimension is compressed.
  function bossFallFrame(age,dir,variant){
    const frame=Math.min(Math.round(BOSS_FALL.settle*30),Math.floor(age*30));
    return cached(`bossfall/${dir}/${variant}/${frame}`,128,128,c=>{
      const t=frame/30,sign=dir===3?-1:1,p=palettes.boss;
      if(t<0.12){c.drawImage(sprite('boss','idle',0,dir,variant),38+Math.round(Math.sin(t*80)),32);return;}
      const smooth=v=>{const x=clamp(v,0,1);return x*x*(3-2*x);};
      const kneel=smooth((t-0.12)/0.3),u=clamp((t-0.42)/(BOSS_FALL.impact-0.42),0,1);
      const fall=u*u,settle=smooth((t-BOSS_FALL.impact)/0.4);
      const rebound=t>BOSS_FALL.impact&&t<BOSS_FALL.impact+0.26?Math.sin((t-BOSS_FALL.impact)/0.26*Math.PI):0;
      const lean=0.13*kneel+1.37*fall-0.055*rebound;
      const brace=Math.sin(Math.PI*clamp((t-0.4)/0.7,0,1));
      c.save();c.translate(64+sign*(12*fall),74+4*kneel+4*fall-1.5*rebound);c.scale(sign,1);
      c.translate(0,6);c.rotate(lean);c.translate(0,-6);
      // Knees buckle independently while the pelvis and chest stay full-sized.
      for(const side of [-1,1]){
        c.save();c.translate(side*8,6);c.rotate(side*(kneel*(1-fall)+0.22*fall));
        box(c,-4,0,8,6,p.pants);rect(c,-3,0,2,5,'#56605d');
        c.translate(0,4);c.rotate(-side*(2*kneel*(1-fall)+0.46*fall));
        box(c,-4,0,8,4,p.pants);box(c,-5,3,10,4,'#303b3e');rect(c,-4,3,7,1,'#57625e');c.restore();
      }
      const arm=(side,angle,elbow)=>{
        c.save();c.translate(side<0?-17:18,-10);c.rotate(angle);
        box(c,-3,0,side<0?7:8,11,side<0?p.skin:p.shade);
        rect(c,-3,1,3,8,side<0?p.light:p.skin);
        c.translate(0,9);c.rotate(elbow);box(c,-3,0,side<0?7:8,9,p.skin);
        if(side>0){rect(c,-2,0,6,3,'#b5ac91');rect(c,-2,4,6,2,'#d0c3a1');}
        box(c,-5,6,side<0?10:11,side<0?6:7,side<0?p.shade:p.skin);c.restore();
      };
      arm(-1,-0.18*kneel-0.37*fall,0.18*kneel+0.12*fall);
      // Ribs, torn overalls and head retain the living sprite's proportions.
      box(c,-14,-12,28,20,p.skin);rect(c,-12,-11,9,15,p.light);rect(c,8,-8,6,16,p.shade);
      rect(c,-11,-11,5,23,p.coat);rect(c,4,-10,6,23,p.coat);rect(c,-12,3,24,8,p.coat);
      rect(c,-9,4,3,5,p.trim);rect(c,7,3,3,7,p.dark);rect(c,-3,-9,3,12,p.shade);
      for(let i=0;i<4;i++){rect(c,0,-7+i*3,5,1,p.light);rect(c,-6,-8+i*3,2,2,'#765957');}
      arm(1,0.18*kneel-0.9*brace+0.17*fall+0.1*settle,-0.18*kneel+0.45*brace-0.62*settle);
      // Head lags the falling torso, then comes to rest after the shoulder hits.
      c.save();c.translate(0,-12);c.rotate(-0.17*Math.sin(u*Math.PI)+0.12*settle);
      box(c,-7,-11,14,12,p.skin);rect(c,-6,-10,9,3,p.light);rect(c,3,-8,4,8,p.shade);
      rect(c,-8,-12,12,3,'#454c44');rect(c,-6,-5,4,1,'#282c2a');rect(c,2,-5,3,1,'#282c2a');
      rect(c,-4,0,9,2,'#493335');rect(c,-3,0,2,1,'#d1c5a1');rect(c,1,0,2,1,'#d1c5a1');
      if(dir===2){rect(c,-7,-10,14,10,p.shade);rect(c,-6,-10,11,3,p.light);}
      c.restore();
      c.restore();
      // Quantize rotated joints back to the original palette on the source-pixel
      // grid, avoiding antialiased vector edges in the final pixel-art sprite.
      const colors=[...new Set([...Object.values(p),'#192126','#56605d','#303b3e','#57625e','#b5ac91','#d0c3a1','#765957','#454c44','#282c2a','#493335','#d1c5a1'])]
        .map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
      const pixels=c.getImageData(0,0,128,128),data=pixels.data;
      for(let i=0;i<data.length;i+=4){
        if(data[i+3]<128){data[i+3]=0;continue;}
        let nearest=colors[0],best=Infinity;
        for(const rgb of colors){const distance=(data[i]-rgb[0])**2+(data[i+1]-rgb[1])**2+(data[i+2]-rgb[2])**2;
          if(distance<best){best=distance;nearest=rgb;}if(!distance)break;}
        data.set(nearest,i);data[i+3]=255;
      }
      c.putImageData(pixels,0,0);
    });
  }
  function fallFrame(kind,age,dir=0,variant=0){
    if(kind==='boss')return bossFallFrame(age,dir,variant);
    const frame=Math.min(22,Math.floor(age*20));
    return cached(`wholefall/${kind}/${dir}/${variant}/${frame}`,128,110,c=>{
      const t=frame/20,kneel=clamp((t-0.12)/0.3,0,1),u=clamp((t-0.38)/0.65,0,1),fall=u*u*(3-2*u),sign=dir===3?-1:1;
      const feet=35,origin=26,body=sprite(kind,'idle',0,dir,variant);
      c.translate(64+(t<0.16?Math.sin(t*85):0),74+feet-origin);
      c.translate(0,kneel*3*(1-fall));c.rotate(sign*fall*Math.PI/2);
      c.scale(1-fall*0.48,1-fall*0.12-kneel*(1-fall)*0.12);
      c.drawImage(body,-18,-feet);
    });
  }
  function charredFallFrame(kind,age,dir=0,variant=0,fallDirection=dir===3?3:0){
    const frame=Math.min(28,Math.floor(Math.max(0,age)*20));
    const choice=CHARRED_DIRECTIONS[fallDirection]||CHARRED_DIRECTIONS[0];
    const palette=[[20,23,25],[36,35,34],[53,48,43],[76,67,56],[101,88,69]];
    const body=cached(`charred/${kind}/${dir}/${variant}`,36,42,c=>{
      c.drawImage(sprite(kind,'idle',0,dir,variant),0,0);
      const pixels=c.getImageData(0,0,36,42),a=pixels.data;
      for(let i=0;i<a.length;i+=4)if(a[i+3]){
        const lum=(a[i]*.25+a[i+1]*.6+a[i+2]*.15),level=Math.min(4,Math.floor(lum/45));
        a.set(palette[level],i);
      }c.putImageData(pixels,0,0);
    });
    return cached(`charredfall/${kind}/${dir}/${variant}/${fallDirection}/${frame}`,128,110,c=>{
      const t=frame/20,dx=Math.cos(choice.angle),dy=Math.sin(choice.angle),sign=dx<0?-1:1;
      const rotation=choice.angle>Math.PI/2?choice.angle-Math.PI*1.5:choice.angle+Math.PI/2;
      const kneel=clamp((t-.12)/.26,0,1),u=clamp((t-.38)/.67,0,1),fall=u*u;
      const bounce=t>1.05&&t<1.35?Math.sin((t-1.05)/.3*Math.PI):0;
      // Rigid whole-body fall: preserve body area and proportions at every angle.
      if(kind==='crawler'){
        // Crawlers are already horizontal: their supporting arms give way,
        // followed by a short forward slump, never a quarter-turn onto their head.
        c.translate(64+dx*fall*10,83+fall*(3+dy*7)-bounce*.5);
        const yaw=choice.angle-(sign<0?(choice.angle<0?-Math.PI:Math.PI):0);
        c.rotate(yaw*fall+sign*(Math.sin(fall*Math.PI)*.25-fall*.12-bounce*.025));
      }else{
        c.translate(64+dx*fall*4,83+dy*fall*4+kneel*2*(1-fall)-bounce);
        c.rotate(fall*rotation-sign*bounce*.055);
      }
      c.drawImage(body,-18,-35);
      c.setTransform(1,0,0,1,0,0);
      const pixels=c.getImageData(0,0,128,110),a=pixels.data;
      for(let i=0;i<a.length;i+=4){
        if(a[i+3]<128){a[i+3]=0;continue;}
        let best=palette[0],distance=Infinity;
        for(const color of palette){const d=(a[i]-color[0])**2+(a[i+1]-color[1])**2+(a[i+2]-color[2])**2;if(d<distance){distance=d;best=color;}}
        a.set(best,i);a[i+3]=255;
      }c.putImageData(pixels,0,0);
    });
  }
  function playerDeath(){
    if(Coop.active?coopFalls.has(player.id):playerFall)return;
    const aim=aimPose(player,camera());
    const fall={x:player.x,y:player.y,age:0,dir:aim.dx<0?3:1,weapon:player.weapon,angle:aim.angle,lift:getPlayerJumpVisual().lift,impactPlayed:false};
    if(Coop.active)coopFalls.set(player.id,fall);else playerFall=fall;
    player.dashTime=0;player.rocketJumpTime=0;player.knockbackTime=0;player.artShotUntil=0;
  }
  function fallDust(x,y,age,seed=0){
    if(age<1.03||age>1.7)return;const t=age-1.03;
    for(let i=0;i<24;i++){const a=i*2.39996,r=5+t*(30+hash(i,seed)*70),size=2+i%3*2;
      pxRect(x+Math.cos(a)*r,y+Math.sin(a)*r*0.3-t*8,size,size,i%3?'#8b8575':'#b0aa91',(1-t/0.67)*0.5);}
  }
  function drawPlayerFall(cam,d=playerFall){
    if(!d)return;
    const x=d.x-cam.x,y=d.y-cam.y,lift=d.lift*Math.max(0,1-d.age/0.3),spread=clamp(d.age/1.6,0,1);
    pxRect(x-12,y+16,24+spread*14,4,'#341e22',0.65);
    blit(fallFrame('player',d.age,d.dir),x-128,y-148-lift);
    const drop=clamp((d.age-0.18)/0.7,0,1),sign=d.dir===3?-1:1;
    const gun=weapon(d.weapon,d.angle+sign*drop*0.5,0,false);
    blit(gun,x-42-sign*drop*22,y-42+drop*20-Math.sin(drop*Math.PI)*12);
    fallDust(x,y+18,d.age,19);
  }
  function drone(d,cam,time){
    const pose=Arsenal.dronePose(d),scale=pose.scale,x=Math.round(pose.x-cam.x),y=Math.round(pose.y-cam.y);
    pxRect(x-9,d.y-cam.y+7,18,3,'#071217',0.35);
    const frame=Math.floor(time*24)%4;
    const chassis=cached('drone/military/'+frame,30,26,c=>{
      // Four protected rotors and a compact armored battery / sensor housing.
      for(const [rx,ry] of [[5,5],[24,5],[5,20],[24,20]]){
        rect(c,Math.min(rx,14),ry<10?7:16,Math.abs(rx-14)+1,2,'#343b43');
        box(c,rx-3,ry-2,6,4,'#14191f');rect(c,rx-2,ry-1,4,1,'#616b73');
        if(frame%2===0){rect(c,rx-5,ry,10,1,'#727a7e');rect(c,rx,ry-3,1,6,'#3d464e');}
        else{for(let k=-3;k<=3;k++){rect(c,rx+k,ry+Math.round(k*0.5),2,1,'#647078');rect(c,rx+k,ry-Math.round(k*0.5),2,1,'#3c434b');}}
      }
      box(c,10,8,10,10,'#10151b');rect(c,11,8,8,1,'#788187');rect(c,12,10,6,5,'#282e35');
      for(let i=0;i<3;i++)rect(c,13,10+i*2,4,1,'#0b0f14');
      rect(c,13,17,4,2,'#721e2d');rect(c,9,10,1,6,'#40474f');rect(c,20,10,1,6,'#40474f');
    });
    const turn=Math.round(d.angle/(Math.PI*2)*64),reload=d.reload>0;
    const pods=cached('drone/pods/'+turn+'/'+reload,36,36,c=>{
      c.translate(18,18);c.rotate(turn/64*Math.PI*2);
      for(const side of [-1,1]){const y=side*4-1;box(c,-2,y,15,3,'#1a2027');rect(c,0,y,11,1,'#616c75');rect(c,11,y,3,3,'#080c11');rect(c,reload?3:8,y+1,2,1,reload?'#8a2837':'#ed4b55');}
    });blit(pods,x-18*scale,y-18*scale,scale);
    blit(chassis,x-15*scale,y-13*scale,scale);
    const length=pose.length;
    const mx=x+Math.cos(d.angle)*length-Math.sin(d.angle)*(d.launchSide||1)*4,
      my=y+Math.sin(d.angle)*length+Math.cos(d.angle)*(d.launchSide||1)*4;
    if(time<d.shotUntil){pxRect(mx-2,my-2,4,4,'#ee8958');pxRect(mx-1,my-1,2,2,'#fff1ce');}
    pxRect(x+Math.cos(d.angle)*9*scale-1,y+Math.sin(d.angle)*9*scale-1,2,2,'#d9e6cf');
    pxRect(x-9,y+15*scale,18,2,'#25282f');pxRect(x-9,y+15*scale,18*d.life/DRONE.duration,2,d.life<10?'#d29c64':'#b8515c');
    if(d.reload>0){pxRect(x-9,y+18*scale,18,1,'#30242b');pxRect(x-9,y+18*scale,18*(1-d.reload/MICRO_MISSILE.reload),1,'#ee8d69');}
    droneBeacons(d,cam,time);
  }
  function redLamp(x,y,on,size=2){
    if(on){pxRect(x-3,y-3,size+6,size+6,'#c6263a',0.15);pxRect(x-1,y-1,size+2,size+2,'#ee3248',0.35);}
    pxRect(x,y,size,size,on?'#ff3c50':'#702534');
  }
  function droneBeacons(d,cam,time){
    const p=Arsenal.dronePose(d),on=militaryPulse(time,d.slot*0.19);
    redLamp(Math.round(p.x-cam.x)-5,Math.round(p.y-cam.y)-5,on);
    redLamp(Math.round(p.x-cam.x)+3,Math.round(p.y-cam.y)+3,on);
  }
  function equipmentBeacons(cam){
    for(const d of Arsenal.drones)droneBeacons(d,cam,Arsenal.clock);
    if(player.hp<=0||player.weapon!=='arc'||player.dashTime>0)return;
    const rig=aimRig(player,cam),on=militaryPulse(state.time)||state.time<(player.artShotUntil||0),lift=getPlayerJumpVisual().lift;
    // Forward emitter tips remain clear of the body in all eight aim sectors.
    for(const v of [-6,4])redLamp(Math.round(rig.x+rig.dx*30-rig.dy*v*rig.flip-cam.x),Math.round(rig.y+rig.dy*30+rig.dx*v*rig.flip-cam.y-lift),on);
  }
  function microMissile(m,cam){
    const turn=Math.round(m.angle/(Math.PI*2)*64),frame=Math.floor(m.age*40)%2;
    const s=cached('micro/'+turn+'/'+frame,24,24,c=>{
      c.translate(12,12);c.rotate(turn/64*Math.PI*2);
      rect(c,-10,-1,frame?5:3,2,'#e67c4b');rect(c,-7,-1,3,2,'#ffdeb0');
      box(c,-4,-1,8,2,'#555f68');rect(c,-3,-1,5,1,'#9ba5a6');rect(c,3,-1,2,2,'#ed4150');
      rect(c,-4,-3,2,6,'#343d47');rect(c,-4,-1,2,2,'#8c969e');
    });blit(s,m.x-cam.x-12,m.y-cam.y-12,1);
  }
  function bossDeathFrame(d){return fallFrame('boss',d.age,d.dir,d.variant);}
  function drawCorpses(cam){
    for(const d of corpses){
      if(d.x<cam.x-240||d.x>cam.x+SW+240||d.y<cam.y-240||d.y>cam.y+SH+240)continue;
      if(d.boss){
        const lift=d.lift*Math.max(0,1-d.age/0.35),sign=d.dir===3?-1:1,fall=clamp((d.age-0.42)/(BOSS_FALL.impact-0.42),0,1);
        const alpha=corpseAlpha(d),x=d.x-cam.x,y=d.y-cam.y;
        pxRect(x+sign*30*fall-(52+fall*25)/2,y+23,52+fall*25,8,'#111b1c',alpha*0.3*(1-Math.min(1,lift/180)));
        blit(bossDeathFrame(d),x-128,y-148-lift,2,alpha);
        if(d.age>BOSS_FALL.impact&&d.age<BOSS_FALL.impact+0.6){const t=d.age-BOSS_FALL.impact;for(let i=0;i<22;i++){const a=i*2.39996,r=8+t*(40+hash(i,5)*80),size=2+hash(i,8)*4;
          pxRect(x+sign*30+Math.cos(a)*r,y+22+Math.sin(a)*r*0.45-t*8,size,size,'#8b8575',(1-t/0.6)*0.55);}}
      }else if(d.charred){
        const x=d.x-cam.x,y=d.y-cam.y,alpha=corpseAlpha(d),angle=CHARRED_DIRECTIONS[d.fallDirection].angle;
        const dx=Math.cos(angle),dy=Math.sin(angle),spread=clamp((d.age-.38)/.67,0,1);
        for(let i=0;i<5;i++)pxRect(x-9+dx*i*8*spread,y+16+dy*i*8*spread,18,4,'#16191a',alpha*.12);
        blit(charredFallFrame(d.type,d.age,d.dir,d.variant,d.fallDirection),x-128,y-148,2,alpha);
        if(d.age<1.8)for(let i=0;i<7;i++){
          const t=d.age,r=4+t*14,xx=x+dx*spread*24+Math.sin(i*2.4)*r,yy=y-6+dy*spread*24-t*17+Math.cos(i*2.4)*r*.3;
          pxRect(xx,yy,2+i%2*2,2+i%2*2,i%3?'#615c54':'#bd6b3d',alpha*(1-t/1.8)*.7);
        }
      }else if(d.age<CORPSE.hold)blit(sprite(d.type,'hurt',0,d.dir,d.variant),d.x-cam.x-36,d.y-cam.y-52);
      else for(const p of d.parts){
        const turn=((Math.round(p.angle/Math.PI*16)%32)+32)%32;
        const s=cached('fragment/'+p.key+'/'+turn,28,28,c=>{c.translate(14,14);c.rotate(turn/16*Math.PI);c.drawImage(p.image,-p.image.width/2,-p.image.height/2);});
        const x=p.x+p.ox*2-cam.x,y=p.y+p.oy*2-cam.y,alpha=corpseAlpha(d);
        pxRect(x-3,y+2,6,2,'#111d20',alpha*0.3);blit(s,x-28,y-28-p.height,2,alpha);
      }
    }
    for(const p of casings){const lift=p.age<0.42?Math.sin(p.age/0.42*Math.PI)*10:0;pxRect(p.x-cam.x,p.y-cam.y-lift,p.kind==='shotgun'?4:3,2,p.kind==='shotgun'?'#b27e59':'#a39a6d',Math.min(1,5-p.age));}
  }
  function tile(kind,n){return cached(`tile/${kind}/${n}`,32,32,c=>{
    const road=kind==='road';rect(c,0,0,32,32,road?'#485159':'#293a30');
    for(let i=0;i<60;i++){const x=Math.floor(hash(i,n*31)*32),y=Math.floor(hash(i+90,n*13)*32);
      rect(c,x,y,road?1:2,1,road?(i%2?'#515a5e':'#3d474c'):(i%3?'#334937':'#202f2c'));
      if(!road&&i%4===0)rect(c,x+1,y-2,1,3,'#506044');}
    if(n%3===0){for(let j=0;j<6;j++)rect(c,3+j*3,12+(j%3),7,3,road?'#303e46':'#233537');rect(c,6,13,11,1,'#53636a');rect(c,9,17,8,1,'#42575c');}
    if(road&&n%2){for(let j=0;j<8;j++)rect(c,8+j*2,3+j*3+(j%2),2,3,'#2c383d');}
    if(!road&&n===2){for(let j=0;j<7;j++)rect(c,8+j,18+(j%2),3,2,'#656551');}
  });}
  function ground(cam){
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#293a30';ctx.fillRect(0,0,SW,SH);
    const sx=Math.floor(cam.x/64)*64,sy=Math.floor(cam.y/64)*64;
    for(let y=sy;y<cam.y+SH+64;y+=64)for(let x=sx;x<cam.x+SW+64;x+=64)ctx.drawImage(tile('grass',Math.floor(hash(x/64,y/64)*8)),Math.round(x-cam.x),Math.round(y-cam.y),64,64);
    TownArt.ground(cam);
    for(const r of WORLD.road){
      if(r.x+r.w<cam.x||r.y+r.h<cam.y||r.x>cam.x+SW||r.y>cam.y+SH)continue;
      const x=Math.round(r.x-cam.x),y=Math.round(r.y-cam.y);ctx.fillStyle='#68716a';ctx.fillRect(x-3,y-3,r.w+6,r.h+6);
      ctx.save();ctx.beginPath();ctx.rect(x,y,r.w,r.h);ctx.clip();
      for(let yy=Math.max(sy,Math.floor(r.y/64)*64);yy<Math.min(cam.y+SH+64,r.y+r.h);yy+=64)
        for(let xx=Math.max(sx,Math.floor(r.x/64)*64);xx<Math.min(cam.x+SW+64,r.x+r.w);xx+=64)
          ctx.drawImage(tile('road',Math.floor(hash(xx/64,yy/64)*8)),Math.round(xx-cam.x),Math.round(yy-cam.y),64,64);
      ctx.fillStyle='#8c8c6d';
      if(r.w>r.h){for(let xx=Math.max(r.x,Math.floor(cam.x/48)*48);xx<Math.min(r.x+r.w,cam.x+SW);xx+=48)ctx.fillRect(Math.round(xx-cam.x),y+r.h/2,22,2);}
      else{for(let yy=Math.max(r.y,Math.floor(cam.y/48)*48);yy<Math.min(r.y+r.h,cam.y+SH);yy+=48)ctx.fillRect(x+r.w/2,Math.round(yy-cam.y),2,22);}
      ctx.restore();
    }
    TownArt.markings(cam);
    for(const d of state.decals){if(d.x<cam.x-20||d.y<cam.y-20||d.x>cam.x+SW+20||d.y>cam.y+SH+20)continue;
      ctx.globalAlpha=Math.min(0.65,d.alpha+0.15);ctx.fillStyle='#573632';
      for(let i=0;i<7;i++){const size=Math.max(2,d.r*(0.35+hash(i,d.x)*0.35));ctx.fillRect(Math.round(d.x-cam.x+(hash(i,d.y)-0.5)*d.r),Math.round(d.y-cam.y+(hash(i+9,d.x)-0.5)*d.r),size,size);}}
    ctx.restore();
  }
  function buildings(cam){for(const b of WORLD.buildings){
    if(b.role){if(b.x+b.w>=cam.x-30&&b.y+b.h>=cam.y-30&&b.x<=cam.x+SW+30&&b.y<=cam.y+SH+30)TownArt.building(b,cam);continue;}
    if(b.x+b.w<cam.x-30||b.y+b.h<cam.y-30||b.x>cam.x+SW+30||b.y>cam.y+SH+30)continue;
    const x=px(b.x-cam.x),y=px(b.y-cam.y),w=b.w,h=b.h;
    pxRect(x+8,y+10,w,h,'#142025',0.4);
    pxRect(x+5,y+5,w-10,h-10,'#645b4b');
    ctx.save();ctx.beginPath();ctx.rect(x+6,y+6,w-12,h-12);ctx.clip();
    for(let yy=8;yy<h;yy+=12){pxRect(x+6,y+yy,w-12,1,'#3e4038');for(let xx=8+(yy%24===8?0:24);xx<w;xx+=48){pxRect(x+xx,y+yy,1,12,'#47463b');pxRect(x+xx+5,y+yy+4,16,1,'#756851',0.55);}}
    for(const f of b.furniture||[]){const fx=px(f.x-cam.x),fy=px(f.y-cam.y);pxRect(fx+3,fy+4,f.w,f.h,'#252b2a',0.6);pxRect(fx-1,fy-1,f.w+2,f.h+2,'#242e30');pxRect(fx,fy,f.w,f.h,f.c);pxRect(fx+2,fy+2,f.w-4,2,'#a48c6b',0.65);pxRect(fx+2,fy+f.h-3,f.w-4,2,'#343b39');}
    ctx.restore();
    for(const wr of getBuildingWallRects(b)){const wx=wr.x-cam.x,wy=wr.y-cam.y;pxRect(wx,wy,wr.w,wr.h,'#77746a');pxRect(wx,wy,wr.w,2,'#aba58a');}
    const ds=worldToScreen(b.door.x,b.door.y,cam);pxRect(ds.x,ds.y,b.door.w,b.door.h,'#8a8064',0.6);
    const roof=cached(`roof/${b.x}/${b.y}/${w}/${h}`,Math.ceil(w/2),Math.ceil(h/2),c=>{
      rect(c,0,0,w/2,h/2,'#232f34');rect(c,2,2,w/2-4,h/2-4,'#525b5b');
      const roofPal=['#535b58','#5b6260','#485457','#61665f'];
      for(let yy=4;yy<h/2-4;yy+=6)for(let xx=4-(yy%12?5:0);xx<w/2-4;xx+=12){
        const tw=Math.min(11,w/2-4-xx);if(tw<=0)continue;rect(c,Math.max(3,xx),yy,tw,5,roofPal[Math.floor(hash(xx+b.x,yy+b.y)*4)]);rect(c,Math.max(3,xx),yy+5,tw,1,'#343f43');}
      rect(c,3,3,w/2-6,1,'#899086');rect(c,3,h/2-4,w/2-6,2,'#26383e');
      box(c,9,9,9,13,'#343f44');rect(c,10,9,7,2,'#a09b83');rect(c,11,12,5,8,'#6c7674');
      for(let k=0;k<3;k++)rect(c,11,13+k*3,5,1,'#3f5054');
      if(w>140){box(c,w/2-19,h/2-18,9,9,'#796c5e');rect(c,w/2-18,h/2-17,7,3,'#303c42');rect(c,w/2-18,h/2-13,7,1,'#b3a28a');}
    });
    blit(roof,x,y,2,b.roofAlpha??1);
    // Sills, gutters and tiny street number (decoration, no extra collision).
    pxRect(x+14,y+h-5,22,3,'#99aaa4');pxRect(x+16,y+h-5,18,1,'#4c6c76');
    pxRect(ds.x+2,ds.y-8,14,6,'#a6a793');pxRect(ds.x+4,ds.y-6,3,2,'#3a4947');pxRect(ds.x+10,ds.y-6,3,2,'#3a4947');
    if(BUILDINGS_CLOSED){
      const vertical=b.door.h>b.door.w;pxRect(ds.x,ds.y,b.door.w,b.door.h,'#29383b');
      for(let j=0;j<3;j++){
        const bx=ds.x+(vertical?j*6+1:1),by=ds.y+(vertical?1:j*6+1),bw=vertical?5:b.door.w-2,bh=vertical?b.door.h-2:5;
        pxRect(bx,by,bw,bh,'#8b7960');pxRect(bx,by,bw,1,'#b4a183');pxRect(bx+1,by+1,2,2,'#394745');pxRect(bx+bw-3,by+bh-3,2,2,'#394745');
      }
    }
  }}
  function pickupSprite(type,buff=''){return cached('pickup/'+type+buff,18,24,c=>{
    c.translate(9,16);
    if(type==='med'){box(c,-6,-5,12,9,'#a3b7ac');rect(c,-5,-5,10,2,'#d1d7bd');rect(c,-1,-4,2,7,'#a8574c');rect(c,-3,-2,6,2,'#a8574c');rect(c,-3,-7,6,1,'#7a938d');}
    else if(type==='grenade'){box(c,-3,-4,6,8,'#647959');rect(c,-2,-4,2,7,'#9ca879');rect(c,-4,-2,8,1,'#354a43');rect(c,-3,1,6,1,'#354a43');box(c,-2,-7,4,2,'#a9aea1');rect(c,2,-6,1,6,'#bac0af');}
    else if(type==='molotov'){box(c,-3,-5,6,10,'#67846a');rect(c,-2,-4,1,7,'#b4c3a1');rect(c,-3,0,6,3,'#bcae7e');box(c,-1,-9,2,4,'#8d9270');rect(c,1,-10,3,1,'#dac39a');rect(c,3,-12,1,3,'#dfa364');}
    else{const col=buff==='damage'?'#c8a66d':buff==='health'?'#82b68e':'#7db5c7';box(c,-3,-8,6,13,'#8ea6a5');rect(c,-2,-6,4,9,col);rect(c,-2,-6,1,8,'#d2dac8');rect(c,-3,-9,6,2,'#bac0b2');rect(c,-1,-3,3,2,'#4a6b70');}
  });}
  function pickups(cam){for(const item of state.pickups){if(item.x<cam.x-30||item.x>cam.x+SW+30||item.y<cam.y-40||item.y>cam.y+SH+30)continue;
    const s=pickupSprite(item.type,item.buff),x=item.x-cam.x,y=item.y-cam.y,bob=Math.round(Math.sin(state.time*3+(item.phase||item.x))*2);
    pxRect(x-7,y+5,14,3,'#142126',0.45);blit(s,x-18,y-32+bob);}}
  function beaconPulse(a){const phase=((state.time+(a.beaconPhase||0))%1.4+1.4)%1.4;return phase<0.14||(phase>0.25&&phase<0.39)?1:0;}
  function airdrops(cam){for(const a of state.airdrops){
    const military=a.kind==='military',x=Math.round(a.x-cam.x),y=Math.round((a.landed?a.y:a.fallY)-cam.y);
    if(x<-100||x>SW+100||y<-150||y>SH+150)continue;
    if(military){
      const crate=cached('military-crate',32,28,c=>{
        rect(c,3,24,27,2,'#0c1318');box(c,2,5,28,18,'#151c23');rect(c,3,6,26,5,'#303a42');
        rect(c,5,7,22,2,'#424d53');rect(c,4,12,24,10,'#1b242b');rect(c,5,13,22,1,'#0a1116');
        for(const xx of [3,25]){rect(c,xx,5,4,18,'#45525a');rect(c,xx,5,4,2,'#7a8789');rect(c,xx+1,9,2,11,'#252f36');rect(c,xx,21,4,2,'#657277');}
        for(const xx of [9,20]){box(c,xx,10,3,6,'#77817b');rect(c,xx,11,2,3,'#35444a');rect(c,xx,14,3,1,'#b2b4a0');}
        rect(c,14,16,5,4,'#35454c');rect(c,15,17,3,2,'#778582');rect(c,13,20,7,1,'#0b1116');
        for(let i=0;i<3;i++){rect(c,8+i*2,20,1,2,'#8d8153');rect(c,20+i*2,20,1,2,'#8d8153');}
        box(c,6,3,4,3,'#5e2027');box(c,22,3,4,3,'#5e2027');rect(c,7,3,2,1,'#a54949');rect(c,23,3,2,1,'#a54949');
      });blit(crate,x-32,y-28);
    }else{
      const crate=cached('crate',24,22,c=>{box(c,3,4,18,14,'#7e8060');rect(c,4,4,16,3,'#b0aa7c');rect(c,5,9,14,8,'#565e4d');rect(c,7,4,2,14,'#b2b19a');rect(c,16,4,2,14,'#b2b19a');box(c,10,10,4,5,'#809c9b');rect(c,11,11,2,3,'#bbcbad');});blit(crate,x-24,y-22);
    }
    if(!a.landed){
      const chute=cached('chute/'+(military?'military':'standard'),42,46,c=>{
        rect(c,2,10,38,6,military?'#3c474c':'#a6b3a5');rect(c,6,6,30,4,military?'#536065':'#c6c8ae');rect(c,12,3,18,3,military?'#69757a':'#d5d2b3');
        rect(c,12,6,2,10,military?'#864047':'#849791');rect(c,26,6,2,10,military?'#864047':'#849791');
        for(let i=0;i<4;i++)rect(c,4+i*11,16,1,25,military?'#7e8b8e':'#b3bbae');
      });blit(chute,x-42,y-88);
    }else for(let i=0;i<(military?5:10);i++){const size=6+i%4*2,xx=x+Math.round(Math.sin(a.smoke*1.5+i)*9);pxRect(xx,y-23-i*7,size,size,military?'#59616a':'#af6961',(1-i/12)*(military?0.11:0.2));}
  }}
  function airdropBeacons(cam){
    for(const a of state.airdrops){
      const x=Math.round(a.x-cam.x),y=Math.round((a.landed?a.y:a.fallY)-cam.y),pulse=beaconPulse(a);
      if(x<-70||x>SW+70||y<-70||y>SH+70)continue;
      if(a.kind!=='military'){
        const glow=.72+.28*Math.sin(state.time*3+(a.beaconPhase||0));
        pxRect(x-8,y-17,16,8,'#b7803d',glow*.2);pxRect(x-4,y-15,8,3,'#e9ad59',glow);pxRect(x-2,y-15,4,1,'#ffdf99');continue;
      }
      for(const dx of [-18,14]){
        if(pulse){pxRect(x+dx-4,y-26,12,10,'#b32131',0.16);pxRect(x+dx-2,y-24,8,6,'#dc3340',0.35);}
        pxRect(x+dx,y-22,4,4,pulse?'#f23d48':'#68252c');if(pulse)pxRect(x+dx,y-22,2,2,'#ffd0b6');
      }
    }
  }
  function airdropLight(a){
    const military=a.kind==='military',pulse=military?beaconPulse(a):(.5+.5*Math.sin(state.time*3+(a.beaconPhase||0)));
    return {x:a.x,y:(a.landed?a.y:a.fallY)-(military?20:14),radius:military?205:190,
      strength:military?.48+.16*pulse:.50+.08*pulse,color:military?'255,78,66':'255,197,108',environment:true,kind:'airdrop'};
  }
  function pelletTrail(cam){for(const p of state.pellets){const x=p.x-cam.x,y=p.y-cam.y;if(x<0||y<0||x>SW||y>SH)continue;const speed=Math.hypot(p.vx,p.vy)||1,len=p.weapon==='gatling'?12:7;
    for(let i=0;i<4;i++)pxRect(x-p.vx/speed*len*i/4,y-p.vy/speed*len*i/4,2,2,i===0?'#d5be8c':'#a28a62',1-i*0.22);}}
  function rockets(cam){for(const r of state.rockets){const a=Math.atan2(r.vy,r.vx),s=cached('missile/'+Math.round(a*16),24,24,c=>{c.translate(12,12);c.rotate(Math.round(a*16)/16);box(c,-4,-1,9,2,'#88998a');rect(c,4,-1,2,2,'#c0a47b');rect(c,-4,-3,2,6,'#667c76');rect(c,-7,-1,3,2,'#d5ab69');});blit(s,r.x-cam.x-24,r.y-cam.y-24);}}
  function grenades(cam){for(const g of state.grenades){pxRect(g.x-cam.x-4,g.y-cam.y,8,3,'#142025',0.4);const s=pickupSprite(g.type||'grenade');blit(s,g.drawX-cam.x-9,g.drawY-cam.y-16,1);}}
  function explosions(cam){
    for(const e of state.explosions){const x=e.x-cam.x,y=e.y-cam.y,t=clamp(1-e.life/e.maxLife,0,1);if(x<-220||y<-220||x>SW+220||y>SH+220)continue;
      const green=e.bloaterBurst,colors=green?['#5e7953','#a2b879','#ced39c']:['#9c5f41','#d69a58','#e2c78b'];
      for(let i=0;i<20;i++){const a=i*2.39996,r=e.radius*(0.25+hash(i,7)*0.65),size=Math.max(2,(1-t)*24*(0.5+hash(i,4)));
        const xx=x+Math.cos(a)*r,yy=y+Math.sin(a)*r;
        pxRect(xx-size/2,yy-size/2,size,size,colors[0],(1-t)*0.7);pxRect(xx-size/4,yy-size/3,size/2,size/2,colors[1],(1-t)*0.8);
        if(t<0.4)pxRect(xx,yy,size/4,size/4,colors[2],0.65);}
      for(let i=0;i<50;i++){const a=i/50*Math.PI*2;pxRect(x+Math.cos(a)*e.ring,y+Math.sin(a)*e.ring,2,2,colors[1],(1-t)*0.35);}
    }
    for(const z of state.fireZones){const fade=Math.min(1,z.life/0.8);for(let i=0;i<42;i++){
      const a=i*2.39996,r=Math.sqrt(hash(i,19))*z.radius*0.94,x=z.x+Math.cos(a)*r-cam.x,y=z.y+Math.sin(a)*r-cam.y;
      const h=6+Math.floor((Math.sin(state.time*9+i*3)+1)*5);pxRect(x-3,y-h,7,h,'#a56936',fade*0.7);pxRect(x-1,y-h+3,3,h-3,'#d2a95b',fade*0.8);pxRect(x,y-3,2,3,'#e4c78d',fade*0.6);}}
  }
  function particles(cam){
    for(const p of [...state.particles,...state.flameParticles]){
      if(p.x<cam.x-30||p.y<cam.y-30||p.x>cam.x+SW+30||p.y>cam.y+SH+30)continue;
      const x=Math.round((p.x-cam.x)/2)*2,y=Math.round((p.y-cam.y)/2)*2,size=Math.max(2,Math.round(p.size/2)*2),a=clamp(p.life/p.maxLife,0,1);
      pxRect(x,y,size,size,p.color||'#bda36a',a*0.8);
      if(size>=6){pxRect(x+2,y-2,size-4,2,p.color||'#bda36a',a*0.45);if(!p.floaty)pxRect(x+2,y+2,2,2,p.chip?'#b5b7a7':'#dab982',a*0.45);}
    }
    for(const t of state.damageTexts){if(t.x<cam.x-20||t.y<cam.y-20||t.x>cam.x+SW+20||t.y>cam.y+SH+20)continue;
      const x=px(t.x-cam.x),y=px(t.y-cam.y);ctx.save();ctx.globalAlpha=t.life/t.maxLife;ctx.font='bold 13px Courier New';ctx.textAlign='center';ctx.fillStyle='#121d24';ctx.fillText(String(t.amount),x+1,y+1);ctx.fillStyle=t.color;ctx.fillText(String(t.amount),x,y);ctx.restore();}
  }
  function artDeathPreview(kind,dir,variant,frame){
    const saved=corpses.slice(),savedCasings=casings.slice(),savedFall=playerFall;
    try{corpses.length=0;casings.length=0;playerFall=null;
      death({id:300+variant,type:kind,x:160,y:180,artFacing:[Math.PI/2,0,-Math.PI/2,Math.PI][dir]});
      updateDeaths(frame/12);drawCorpses({x:0,y:0});
    }finally{corpses.splice(0,corpses.length,...saved);casings.splice(0,casings.length,...savedCasings);playerFall=savedFall;}
  }
  function reset(){rigShadows=new WeakMap();coopFalls.clear();playerFall=null;playerShadow=null;corpses.length=0;casings.length=0;for(const key of [...cache.keys()])if(key.startsWith('roof/'))cache.delete(key);
    for(const k of ['artX','artY','animPhase','artFacing','artMoving','artRecoil','artHit','artShotUntil'])delete player[k];}
  return {artDeathPreview,tile,pickupSprite,artCached:key=>cache.get(key),update,updateDeaths,shot,hit,death,playerDeath,fallFrame,charredFallFrame,drone,equipmentBeacons,militaryPulse,microMissile,reset,sprite,weapon,actor,caster,playerCaster,enemyPose,fragments,aimPose,aimRig,drawActors,drawCorpses,ground,buildings,pickups,airdrops,airdropBeacons,airdropLight,beaconPulse,pelletTrail,rockets,grenades,explosions,particles,
    charredDirections:CHARRED_DIRECTIONS,
    get playerFall(){return playerFall;},
    get deathStates(){return corpses.map(d=>({id:d.id,type:d.type,age:d.age,boss:d.boss,charred:d.charred,fallDirection:d.fallDirection,parts:d.parts.length,settled:d.charred?d.age>=1.4:d.parts.every(p=>p.settled),impactPlayed:d.impactPlayed,retiring:d.retireAge!==null,alpha:corpseAlpha(d)}));},
    get stats(){return {cache:cache.size,corpses:corpses.length,casings:casings.length};}};
})();
