// World-space rain and occasional storms. Lightning never targets an entity.
const WEATHER = {
  thunderMin: 35,
  thunderMax: 65,
  groundStrikeChance: 0.15,
  flashDuration: 0.48,
  strikeRadius: 42,
  playerDamage: 35,
  zombieDamage: 120,
  rainDensity: 0.00027,
  maxRainStreaks: 420
};

const Weather = (() => {
  let clock=0, nextStorm=WEATHER.thunderMin, flashAge=Infinity,armed=false,automatic=true;
  const strikes=[], pendingThunder=[];
  const mod=(n,d)=>((n%d)+d)%d;
  const hash=n=>mod(Math.sin(n*127.1+311.7)*43758.5453123,1);
  function interval(random=Math.random){return WEATHER.thunderMin+random()*(WEATHER.thunderMax-WEATHER.thunderMin);}
  function reset(random=Math.random){clock=0;nextStorm=interval(random);flashAge=Infinity;armed=false;automatic=true;strikes.length=0;pendingThunder.length=0;}
  function strike(x,y,options={}){
    const radius=options.radius??WEATHER.strikeRadius,playerDamage=options.playerDamage??WEATHER.playerDamage,zombieDamage=options.zombieDamage??WEATHER.zombieDamage;
    const bolt=[];
    for(let i=0;i<=10;i++)bolt.push({x:x+(i===10?0:(hash(x+y+i*17)-0.5)*64),y:y-460+i*46});
    strikes.push({x,y,age:0,bolt,radius});
    if(strikes.length>4)strikes.shift();
    // A snapshot prevents chained bloater deaths from invalidating this iteration.
    for(const z of [...state.zombies]){
      if(z.hp<=0||!state.zombies.includes(z)||Math.hypot(z.x-x,z.y-y)>radius+z.radius)continue;
      z.hp-=zombieDamage;PixelArt.hit(z);
      addDamageText(z.x,z.y-z.radius-10,zombieDamage,'#bbd9ef');
      blood(z.x,z.y,6,'rgba(110,35,35,0.8)',0.6);
      if(z.hp<=0)handleZombieDeath(state.zombies.indexOf(z),false);
    }
    Coop.each(()=>{
    if(Math.hypot(player.x-x,player.y-y)<=radius+player.radius){
      damagePlayer(playerDamage,x,y,{ignoreInvincibility:true});
    }    });
  }
  function forceStrike(x,y,options={}){
    x=clamp(x,0,WORLD.w);y=clamp(y,0,WORLD.h);flashAge=0;strike(x,y,options);
    pendingThunder.push({x,y,grounded:true,delay:0.12+dist(x,y,player.x,player.y)/1100});
  }
  function drawController(cam){
    if(!armed||!state.devMode||!state.running)return;
    const {radius}=devStrikeOptions(),x=state.mouse.x,y=state.mouse.y;
    ctx.save();ctx.fillStyle='#91d9f2';ctx.globalAlpha=0.7;
    for(let i=0;i<90;i++){const a=i/90*Math.PI*2;ctx.fillRect(Math.round((x+Math.cos(a)*radius)/2)*2,Math.round((y+Math.sin(a)*radius)/2)*2,2,2);}
    ctx.globalAlpha=1;ctx.fillRect(x-8,y-1,16,2);ctx.fillRect(x-1,y-8,2,16);ctx.fillStyle='#12242c';ctx.fillRect(SW/2-180,SH-126,360,26);
    ctx.fillStyle='#bce9f6';ctx.font='12px Courier New';ctx.textAlign='center';ctx.fillText(T[lang].devStrikeHint,SW/2,SH-109);ctx.restore();
  }
  function trigger(random=Math.random){
    // Uniform across the entire map, independent of player and zombie positions.
    const x=random()*WORLD.w,y=random()*WORLD.h,grounded=random()<WEATHER.groundStrikeChance;
    flashAge=0;
    if(grounded)strike(x,y);
    const distance=Math.hypot(x-player.x,y-player.y);
    pendingThunder.push({x,y,grounded,delay:grounded?0.12+distance/1100:0.65+distance/1000});
    nextStorm=interval(random);
    return {x,y,grounded};
  }
  function update(dt){
    if((!state.running&&!state.gameOver)||state.paused||state.loading||document.hidden)return;
    clock+=dt;flashAge+=dt;
    for(let i=strikes.length-1;i>=0;i--){strikes[i].age+=dt;if(strikes[i].age>5)strikes.splice(i,1);}
    for(let i=pendingThunder.length-1;i>=0;i--){
      const t=pendingThunder[i];t.delay-=dt;
      if(t.delay<=0){AudioEngine.thunder(t.x,t.y,t.grounded);pendingThunder.splice(i,1);}
    }
    // Let an existing flash and its thunder finish after death; no new storms.
    if(state.running&&automatic&&!Coop.client){nextStorm-=dt;if(nextStorm<=0)trigger();}
  }
  function flashStrength(){
    if(flashAge>=WEATHER.flashDuration)return 0;
    // One soft attack and decay; no repeated strobe or pure white overlay.
    return Math.min(1,flashAge/0.035)*Math.pow(1-flashAge/WEATHER.flashDuration,1.7);
  }
  function drawRain(cam){
    if(!state.running&&!state.gameOver)return;
    const flash=flashStrength(),w=SW+80,h=SH+80;
    const count=Math.min(WEATHER.maxRainStreaks,Math.ceil(SW*SH*WEATHER.rainDensity));
    ctx.save();
    // Roof footprints also shelter the opened-up interiors from visible rain.
    ctx.beginPath();ctx.rect(0,0,SW,SH);
    for(const b of WORLD.buildings)if(b.x+b.w>=cam.x&&b.y+b.h>=cam.y&&b.x<=cam.x+SW&&b.y<=cam.y+SH)ctx.rect(b.x-cam.x,b.y-cam.y,b.w,b.h);
    ctx.clip('evenodd');
    for(let layer=0;layer<2;layer++){
      ctx.strokeStyle=`rgba(164,188,204,${(layer?0.2:0.12)+flash*0.12})`;ctx.lineWidth=layer?1:0.7;ctx.beginPath();
      for(let i=layer;i<count;i+=2){
        const speed=370+hash(i+19)*190;
        const x=mod(hash(i+1)*w+clock*speed*0.18-cam.x,w)-40;
        const y=mod(hash(i+401)*h+clock*speed-cam.y,h)-40;
        const length=8+hash(i+801)*11;
        ctx.moveTo(x,y);ctx.lineTo(x+length*0.18,y+length);
      }
      ctx.stroke();
    }
    // Small, short-lived rings sell rain hitting the ground without a particle heap.
    ctx.strokeStyle=`rgba(144,171,187,${0.12+flash*0.08})`;ctx.lineWidth=0.7;
    for(let i=0;i<Math.min(38,count/6);i++){
      const time=clock*1.7+hash(i+910),age=mod(time,1);
      if(age>0.38)continue;
      const seed=i+Math.floor(time)*89;
      const x=mod(hash(seed+161)*w-cam.x,w)-40,y=mod(hash(seed+621)*h-cam.y,h)-40;
      ctx.beginPath();ctx.ellipse(x,y,1+age*8,0.5+age*3,0,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
  }
  function drawStrikes(cam){
    ctx.save();
    for(const s of strikes){
      const x=s.x-cam.x,y=s.y-cam.y;
      if(s.age<0.38){
        const alpha=Math.pow(1-s.age/0.38,1.4);
        ctx.strokeStyle=`rgba(174,204,228,${alpha*0.35})`;ctx.lineWidth=8;
        ctx.beginPath();for(let i=0;i<s.bolt.length;i++){const p=s.bolt[i];if(i)ctx.lineTo(p.x-cam.x,p.y-cam.y);else ctx.moveTo(p.x-cam.x,p.y-cam.y);}ctx.stroke();
        ctx.strokeStyle=`rgba(221,231,238,${alpha*0.85})`;ctx.lineWidth=1.8;ctx.stroke();
        const branch=s.bolt[5];ctx.beginPath();ctx.moveTo(branch.x-cam.x,branch.y-cam.y);ctx.lineTo(branch.x-cam.x+48,branch.y-cam.y+32);ctx.lineTo(branch.x-cam.x+36,branch.y-cam.y+81);ctx.lineWidth=0.8;ctx.stroke();
        ctx.strokeStyle=`rgba(179,210,231,${alpha*0.55})`;ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(x,y,10+s.age*90,5+s.age*45,0,0,Math.PI*2);ctx.stroke();
      }
      if(s.age<5){ctx.fillStyle=`rgba(12,17,21,${0.25*(1-s.age/5)})`;ctx.beginPath();ctx.ellipse(x,y,19,10,0,0,Math.PI*2);ctx.fill();}
    }
    ctx.restore();
  }
  function lights(){return strikes.filter(s=>s.age<0.48).map(s=>({x:s.x,y:s.y,radius:175,strength:0.65*(1-s.age/0.48),color:'187,211,232',priority:5}));}
  function artPreview(kind,frame){
    const oldClock=clock,oldFlash=flashAge,saved=strikes.slice();
    try{clock=frame/8;flashAge=Infinity;strikes.length=0;
      if(kind==='rain')drawRain({x:0,y:0});
      else{const x=96,y=470,bolt=Array.from({length:11},(_,i)=>({x:x+(i===10?0:(hash(13+i*17)-.5)*64),y:y-460+i*46}));strikes.push({x,y,age:frame/12*.36,bolt});drawStrikes({x:0,y:0});}
    }finally{clock=oldClock;flashAge=oldFlash;strikes.splice(0,strikes.length,...saved);}
  }
  return {snapshot:()=>({clock,nextStorm,flashAge:Number.isFinite(flashAge)?flashAge:99,strikes}),applySnapshot(s){clock=s.clock;nextStorm=s.nextStorm;flashAge=s.flashAge;strikes.splice(0,strikes.length,...s.strikes);},artPreview,reset,update,trigger,strike,forceStrike,drawRain,drawStrikes,drawController,lights,flashStrength,arm(value){armed=!!value;},setAutomatic(value){automatic=!!value;},get armed(){return armed;},get automatic(){return automatic;},
    get status(){return {clock,nextStorm,flashAge,strikes:strikes.length,pendingThunder:pendingThunder.length};}};
})();
