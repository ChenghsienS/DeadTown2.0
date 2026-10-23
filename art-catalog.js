// Deterministic, lazy art inventory. Source rendering stays separate from editable copies.
const ArtCatalog=(()=>{
  const entries=[],byId=new Map();let initialized=false;
  const cat={actors:['Characters & animation','角色与动画'],weapons:['Weapons & drones','武器与无人机'],town:['Buildings & props','建筑与布景'],terrain:['Ground & markings','地表与标识'],items:['Supplies & airdrops','道具与空投'],effects:['Effects & particles','特效与粒子'],ui:['Interface & author','界面与作者']};
  const names={player:['Player','主角'],walker:['Walker','普通丧尸'],runner:['Runner','奔跑丧尸'],crawler:['Crawler','爬行丧尸'],bloater:['Bloater','自爆丧尸'],pouncer:['Pouncer','跳扑丧尸'],charger:['Charger','冲锋丧尸'],boss:['Boss','首领']};
  const poses={idle:'待机',walk:'行走',hurt:'受击',attack:'攻击',charge:'蓄力',airborne:'腾空',recover:'恢复',roll:'翻滚'};
  const dirNames=['南 S','东 E','北 N','西 W'];
  const surface=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  function clone(source){const c=surface(source.width,source.height);c.getContext('2d').drawImage(source,0,0);return c;}
  function add(id,category,label,frames,recipe,render){if(byId.has(id))return;const entry={id,category,label,frames,recipe,render};entries.push(entry);byId.set(id,entry);return entry;}
  // Captures use real draw functions. Restore references and dimensions even on failure.
  function capture(w,h,fn,patch={},lists={}){
    const oldCtx=ctx,oldW=SW,oldH=SH,oldState={...state},oldPlayer={...player},oldBuildings=WORLD.buildings;
    const groups=Object.entries(lists).map(([key,items])=>({array:Town[key],old:Town[key].slice(),items}));
    const c=surface(w,h);try{
      ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;SW=w;SH=h;
      Object.assign(state,{running:true,gameOver:false,time:0,zombies:[],particles:[],flameParticles:[],damageTexts:[],explosions:[],fireZones:[],airdrops:[],pellets:[],rockets:[],pickups:[]},patch);
      WORLD.buildings=[];player.x=-10000;player.y=-10000;
      groups.forEach(g=>g.array.splice(0,g.array.length,...g.items));Town.withArtGeometry(fn);
    }finally{ctx=oldCtx;SW=oldW;SH=oldH;for(const k of Object.keys(state))if(!(k in oldState))delete state[k];for(const k of Object.keys(player))if(!(k in oldPlayer))delete player[k];Object.assign(state,oldState);Object.assign(player,oldPlayer);WORLD.buildings=oldBuildings;groups.forEach(g=>g.array.splice(0,g.array.length,...g.old));}
    return c;
  }
  function image(url){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(clone(img));img.onerror=()=>reject(Error('Image could not be loaded'));img.src=url;});}
  function init(){
    if(initialized)return;initialized=true;
    // Enemy source animation states, all four directions and all three appearances.
    for(const kind of Object.keys(names).filter(k=>k!=='player'))for(const pose of ['idle','walk','hurt','attack','charge','airborne','recover'])for(let d=0;d<4;d++)for(let v=0;v<3;v++){
      add(`actor/${kind}/${pose}/${d}/${v}`,'actors',[`${names[kind][0]} · ${pose} · ${dirNames[d]} · ${v+1}`,`${names[kind][1]} · ${poses[pose]} · ${dirNames[d]} · 外观${v+1}`],8,{source:'pixel-art.js',generator:'sprite',args:[kind,pose,'FRAME',d,v,false],frameRate:8},f=>PixelArt.sprite(kind,pose,f,d,v));
    }
    // Every selectable appearance exports its real shared animation frames.
    for(const skin of PlayerSkins.skins)for(let colorId=0;colorId<4;colorId++){
      const appearance={skinId:skin.id,colorId},prefix=`look/${skin.id}/${colorId}`,labels=[PlayerSkins.label(appearance,'en'),PlayerSkins.label(appearance,'zh')];
      for(const pose of ['idle','walk','hurt','airborne'])for(let sector=0;sector<8;sector++){
        const dir=[1,0,0,0,3,2,2,2][sector];add(`${prefix}/${pose}/${sector}`,'actors',[`${labels[0]} · ${pose} · ${sector*45}°`,`${labels[1]} · ${poses[pose]} · ${sector*45}°`],8,{source:'pixel-art.js',generator:'sprite',args:['player',pose,'FRAME',dir,sector,true,appearance],frameRate:8},f=>PixelArt.sprite('player',pose,f,dir,sector,true,appearance));
      }
      for(const dir of [1,3]){
        add(`${prefix}/roll/${dir}`,'actors',[`${labels[0]} · roll · ${dirNames[dir]}`,`${labels[1]} · 翻滚 · ${dirNames[dir]}`],8,{source:'pixel-art.js',generator:'sprite',args:['player','roll','FRAME',dir,0,false,appearance],frameRate:24},f=>PixelArt.sprite('player','roll',f,dir,0,false,appearance));
        add(`${prefix}/crawl/${dir}`,'actors',[`${labels[0]} · crawl · ${dirNames[dir]}`,`${labels[1]} · 匍匐 · ${dirNames[dir]}`],8,{source:'pixel-art.js',generator:'crawlSprite',appearance,frameRate:8},f=>PixelArt.crawlSprite({...appearance,faceDir:dir===3?-1:1,artMoving:true,animPhase:f*Math.PI/4+.001}));
        add(`${prefix}/fall/${dir}`,'actors',[`${labels[0]} · fall · ${dirNames[dir]}`,`${labels[1]} · 倒地 · ${dirNames[dir]}`],23,{source:'pixel-art.js',generator:'fallFrame',args:['player','FRAME/20',dir,0,appearance],frameRate:20},f=>PixelArt.fallFrame('player',(f+.001)/20,dir,0,appearance));
      }
    }
    // Player body sheets follow the eight actual aiming sectors (not enemy variants).
    for(const pose of ['idle','walk','hurt','airborne'])for(let sector=0;sector<8;sector++){
      const d=[1,0,0,0,3,2,2,2][sector];add(`actor/player/${pose}/aim${sector}`,'actors',[`Player · ${pose} · aim ${sector*45}°`,`主角 · ${poses[pose]} · 瞄准${sector*45}°`],8,{source:'pixel-art.js',generator:'sprite',args:['player',pose,'FRAME',d,sector,true],frameRate:8},f=>PixelArt.sprite('player',pose,f,d,sector,true));
    }
    for(let d=0;d<4;d++){
      add(`actor/player/roll/${d}`,'actors',[`Player · roll · ${dirNames[d]}`,`主角 · 翻滚 · ${dirNames[d]}`],8,{source:'pixel-art.js',generator:'sprite',args:['player','roll','FRAME',d,0,false],frameRate:24},f=>PixelArt.sprite('player','roll',f,d,0,false));
      add(`fall/player/${d}`,'actors',[`Player · fall · ${dirNames[d]}`,`主角 · 倒地 · ${dirNames[d]}`],23,{source:'pixel-art.js',generator:'fallFrame',args:['player','FRAME/20',d,0],frameRate:20},f=>PixelArt.fallFrame('player',(f+.001)/20,d,0));
      for(let v=0;v<3;v++)add(`fall/boss/${d}/${v}`,'actors',[`Boss · fall · ${dirNames[d]} · ${v+1}`,`首领 · 倒地 · ${dirNames[d]} · 外观${v+1}`],46,{source:'pixel-art.js',generator:'fallFrame',args:['boss','FRAME/30',d,v],frameRate:30},f=>PixelArt.fallFrame('boss',(f+.001)/30,d,v));
      for(const kind of ['walker','runner','crawler','pouncer','charger'])for(let v=0;v<3;v++){
        const get=()=>PixelArt.fragments(PixelArt.sprite(kind,'idle',0,d,v),kind);
        const pieces=get();add(`fragments/${kind}/${d}/${v}`,'actors',[`${names[kind][0]} · body parts · ${dirNames[d]} · ${v+1}`,`${names[kind][1]} · 肢解部件 · ${dirNames[d]} · ${v+1}`],pieces.length,{source:'pixel-art.js',generator:'fragments',args:[kind,d,v],frameRate:0,derived:true},f=>get()[f].image);
      }
    }
    for(const kind of ['walker','runner','crawler','pouncer','charger'])for(let dir=0;dir<4;dir++)for(let variant=0;variant<3;variant++)add(`death/${kind}/${dir}/${variant}`,'actors',[`${names[kind][0]} · dismember · ${dirNames[dir]} · ${variant+1}`,`${names[kind][1]} · 肢解动画 · ${dirNames[dir]} · ${variant+1}`],24,{source:'pixel-art.js',generator:'artDeathPreview',args:[kind,dir,variant,'FRAME'],frameRate:12,procedural:true},f=>capture(320,320,()=>PixelArt.artDeathPreview(kind,dir,variant,f)));
    for(const kind of ['walker','runner','crawler','pouncer','charger'])for(let dir=0;dir<4;dir++)for(let variant=0;variant<3;variant++)for(let fall=0;fall<PixelArt.charredDirections.length;fall++){
      const label=PixelArt.charredDirections[fall],primary=fall===(dir===3?3:0);
      // Retain the existing primary IDs so edited V1.0.14 frames stay addressable.
      add(`charred/${kind}/${dir}/${variant}${primary?'':'/fall'+fall}`,'actors',[`${names[kind][0]} · charred fall ${label.en} · ${dirNames[dir]} · ${variant+1}`,`${names[kind][1]} · 焦尸${label.zh}倒地 · ${dirNames[dir]} · ${variant+1}`],29,{source:'pixel-art.js',generator:'charredFallFrame',args:[kind,'FRAME/20',dir,variant,fall],frameRate:20},f=>PixelArt.charredFallFrame(kind,(f+.001)/20,dir,variant,fall));
    }
    for(const kind of Object.keys(WEAPONS))for(const reload of [false,true])for(let cycle=0;cycle<3;cycle++)for(const lit of (kind==='arc'?[false,true]:[false])){
      add(`gun/${kind}/${reload?'reload':'ready'}/${cycle}/${lit?1:0}`,'weapons',[`${kind} · ${reload?'reload':'ready'} · cycle ${cycle}${lit?' · lit':''}`,`${{shotgun:'霰弹枪',gatling:'加特林',rocket:'火箭筒',flamethrower:'喷火器',arc:'电弧枪'}[kind]} · ${reload?'换弹':'持枪'} · 阶段${cycle}${lit?' · 红灯亮':''}`],128,{source:'pixel-art.js',generator:'weapon',args:[kind,'FRAME/128*TAU',cycle,reload,lit],frameRate:16},f=>PixelArt.weapon(kind,f/128*Math.PI*2,cycle,reload,lit));
    }
    for(const kind of Object.keys(WEAPONS))for(const action of ['idle','walk','fire','reload','hurt'])add(`rig/${kind}/${action}`,'weapons',[`Player + ${kind} · ${action}`,`完整持枪姿势 · ${kind} · ${action}`],64,{source:'pixel-art.js',generator:'drawPlayerRig',weapon:kind,action,frameRate:8,layout:'8 animation frames per aim sector',procedural:true},f=>capture(192,192,()=>{
      const sector=Math.floor(f/8),a=sector*Math.PI/4,time=(f%8)/2;
      Object.assign(player,{x:96,y:112,hp:100,maxHp:100,weapon:kind,artMoving:action==='walk',animPhase:f%8*Math.PI/4,dashTime:0,rocketJumpTime:0,knockbackTime:0,artHit:action==='hurt'?.1:0,artRecoil:0,artShotUntil:action==='fire'?time+1:0,reloadTimer:action==='reload'?.5:0});state.time=time;state.mouse={x:96+Math.cos(a)*100,y:106+Math.sin(a)*100};PixelArt.actor(player,{x:0,y:0});
    }));
    const droneWarm=f=>capture(100,100,()=>PixelArt.drone({x:50,y:64,slot:0,angle:f/64*Math.PI*2,reload:0,life:60,shotUntil:0},{x:0,y:0},f/24));
    add('drone/chassis','weapons',['Drone · rotors','无人机 · 机身与旋翼'],4,{source:'pixel-art.js',cacheKey:'drone/military/FRAME',frameRate:24},f=>{droneWarm(f);return PixelArt.artCached('drone/military/'+f);});
    for(const reload of [false,true])add(`drone/pods/${reload}`,'weapons',[`Drone launchers · ${reload?'reload':'ready'}`,`无人机发射舱 · ${reload?'换弹':'就绪'}`],64,{source:'pixel-art.js',cacheKey:`drone/pods/FRAME/${reload}`,frameRate:16},f=>{capture(100,100,()=>PixelArt.drone({x:50,y:64,slot:0,angle:f/64*Math.PI*2,reload:reload?1:0,life:60,shotUntil:0},{x:0,y:0},0));return PixelArt.artCached(`drone/pods/${f}/${reload}`);});
    for(let cycle=0;cycle<2;cycle++)add('micro/'+cycle,'weapons',[`Micro missile · flame ${cycle}`,`微型导弹 · 尾焰${cycle}`],64,{source:'pixel-art.js',cacheKey:`micro/FRAME/${cycle}`,frameRate:16},f=>{capture(48,48,()=>PixelArt.microMissile({x:24,y:24,angle:f/64*Math.PI*2,age:cycle/40},{x:0,y:0}));return PixelArt.artCached(`micro/${f}/${cycle}`);});
    for(const kind of ['grass','road'])add('tile/'+kind,'terrain',[kind+' tiles',kind==='grass'?'草地贴片':'道路贴片'],8,{source:'pixel-art.js',generator:'tile',args:[kind,'FRAME'],frameRate:0},f=>PixelArt.tile(kind,f));
    for(const type of ['med','grenade','molotov','serum'])for(const buff of (type==='serum'?['health','damage','speed']:['']))add('pickup/'+type+'/'+(buff||'base'),'items',[`${type} ${buff}`,`${{med:'医疗包',grenade:'手雷',molotov:'燃烧瓶',serum:'血清'}[type]} ${{health:'生命',damage:'伤害',speed:'速度'}[buff]||''}`],1,{source:'pixel-art.js',generator:'pickupSprite',args:[type,buff]},()=>PixelArt.pickupSprite(type,buff));
    for(const kind of ['standard','military'])for(const component of ['crate','chute']){
      const key=component==='chute'?'chute/'+kind:kind==='military'?'military-crate':'crate';
      add('airdrop/'+kind+'/'+component,'items',[`${kind} ${component}`,`${kind==='military'?'军用':'普通'}${component==='crate'?'空投箱':'降落伞'}`],1,{source:'pixel-art.js',cacheKey:key},()=>{capture(128,160,()=>PixelArt.airdrops({x:0,y:0}),{airdrops:[{kind,x:64,y:120,fallY:120,landed:false,smoke:0}]});return PixelArt.artCached(key);});
    }
    const dimensions={car:[32,58],van:[32,66],policecar:[32,58],ambulance:[34,66],firetruck:[34,66],tree:[40,36],fence:[112,6],bench:[48,18],dumpster:[44,24],busstop:[88,22],pump:[24,32],fountain:[64,50],lamp:[12,12],utility:[30,24],bin:[18,20],mailbox:[18,24],crates:[48,38]};
    const propNames={car:'轿车',van:'面包车',policecar:'警车',ambulance:'救护车',firetruck:'消防车',tree:'树池与树干',fence:'围栏',bench:'长椅',dumpster:'垃圾箱',busstop:'公交亭',pump:'加油泵',fountain:'喷泉',lamp:'路灯底座',utility:'配电箱',bin:'垃圾桶',mailbox:'邮箱',crates:'木箱'};
    for(const [kind,[w,h]] of Object.entries(dimensions))for(const color of (['car','van'].includes(kind)?['#63777d','#80665c','#66765f','#8b8580','#4b6475']:['#63777d'])){
      add(`prop/${kind}/${color.slice(1)}`,'town',[kind+' '+color,propNames[kind]+' '+color],4,{source:'town-art.js',generator:'propSprite',args:{kind,w,h,color,variant:'FRAME'},frameRate:0},f=>TownArt.propSprite({kind,w,h,color,variant:f}));
    }
    add('prop/burnbarrel','town',['Burn barrel · metal body','燃烧桶 · 金属桶体'],1,{source:'town-art.js',generator:'propSprite',args:{kind:'burnbarrel',w:24,h:26,variant:0}},()=>TownArt.propSprite({kind:'burnbarrel',w:24,h:26,variant:0}));
    for(let facing=0;facing<4;facing++){
      const sample={id:7,kind:'roadcar',x:320,y:320,w:facing%2?58:32,h:facing%2?32:58,facing,color:'#63777d',variant:0,headlights:true};
      add('prop/roadcar/'+facing,'town',[`Road car · ${facing*90}°`,`路边车辆 · ${facing*90}°`],4,{source:'town-art.js',generator:'propSprite',args:sample},f=>TownArt.propSprite({...sample,variant:f}));
      add('environment/headlights/'+facing,'effects',[`Paired headlights · ${facing*90}°`,`双束车灯 · ${facing*90}°`],1,{source:'town-lights.js',generator:'headlamps + drawPropEmission',args:sample,procedural:true},()=>capture(700,700,()=>{Lighting.artPreview(TownLights.headlamps(sample));ctx.drawImage(TownArt.propSprite(sample),sample.x,sample.y);TownLights.drawPropEmission(sample,{x:0,y:0});}));
    }
    for(const lightMode of ['steady','fault','off'])add('environment/lamp/'+lightMode,'effects',[`Streetlight · ${lightMode}`,`路灯 · ${{steady:'常亮',fault:'故障闪烁',off:'熄灭'}[lightMode]}`],lightMode==='fault'?24:1,{source:'town-lights.js',generator:'lampLevel + drawPropEmission',lightMode,frameRate:8,procedural:true},f=>{
      const sample={id:1,kind:'lamp',x:202,y:230,w:12,h:12,variant:1,lightMode,lightPhase:0};
      return capture(440,440,()=>{Lighting.artPreview(TownLights.lights({x:0,y:0}));TownArt.props({x:0,y:0});TownArt.canopies({x:0,y:0});TownLights.drawEmissive({x:0,y:0});},{time:f/8},{props:[sample]});
    });
    add('environment/burning-barrel','effects',['Burning barrel · flames, smoke & embers','燃烧桶 · 火焰、烟雾与火星'],24,{source:'town-lights.js',generator:'drawAtmosphere + drawPropEmission',frameRate:12,procedural:true},f=>capture(350,350,()=>{
      Lighting.artPreview(TownLights.lights({x:0,y:0}));TownArt.props({x:0,y:0});TownLights.drawAtmosphere({x:0,y:0});TownLights.drawEmissive({x:0,y:0});
    },{time:f/12},{props:[{id:8,kind:'burnbarrel',x:163,y:170,w:24,h:26,variant:0,firePhase:0}]}));
    for(const role of ['house','hospital','court','townhall','pharmacy','market','diner','police','gas']){
      const b={id:'lit-art-'+role,role,x:12,y:12,w:300,h:200,variant:1,litWindows:[16,54,206,244],windowLevel:1,windowCool:['hospital','police','pharmacy'].includes(role)};
      add('environment/windows/'+role,'town',[`Lit windows · ${role}`,`透光窗户 · ${TownArt.names[role][1]}`],1,{source:'town-lights.js',generator:'windows + drawWindowEmission',args:b,procedural:true},()=>capture(340,360,()=>{Lighting.artPreview(TownLights.windows(b));TownArt.building(b,{x:0,y:0});TownLights.drawWindowEmission(b,{x:0,y:0});}));
    }
    add('prop/fence/vertical','town',['Fence vertical','竖向围栏'],1,{source:'town-art.js',generator:'propSprite',args:{kind:'fence',w:6,h:112,variant:0}},()=>TownArt.propSprite({kind:'fence',w:6,h:112,variant:0}));
    for(const style of ['oak','pine'])add('tree/crown/'+style,'town',[style+' crown',style==='oak'?'阔叶树冠':'松树树冠'],4,{source:'town-art.js',cacheKey:`tree/crown/${style}/FRAME`,frameRate:0},f=>{capture(100,100,()=>TownArt.canopies({x:0,y:0}),{}, {props:[{kind:'tree',x:30,y:50,w:40,h:36,treeStyle:style,variant:f}]});return TownArt.artCached(`tree/crown/${style}/${f}`);});
    add('lamp/upper','town',['Streetlight · pole & light','路灯 · 灯杆与灯头'],3,{source:'town-art.js',generator:'canopies',frameRate:0},f=>capture(48,64,()=>TownArt.canopies({x:0,y:0}),{}, {props:[{kind:'lamp',x:10,y:42,w:12,h:12,variant:f}]}));
    for(const role of ['hospital','court','townhall','police','fire','gas','market','pharmacy','diner','warehouse','house']){
      const w=role==='house'?156:300,h=role==='house'?126:200;
      add('building/'+role,'town',[TownArt.names[role][0],TownArt.names[role][1]],4,{source:'town-art.js',generator:'building',args:{role,w,h,variant:'FRAME'},frameRate:0},f=>capture(w+12,h+20,()=>TownArt.building({id:'art-'+role,role,x:0,y:0,w,h,variant:f},{x:0,y:0})));
    }
    for(const kind of ['sidewalk','yard','plaza','walk','path','park','parking','forecourt','flowers','layby'])add('ground/'+kind,'terrain',[kind,{sidewalk:'人行道',yard:'院落',plaza:'广场',walk:'步道',path:'公园小路',park:'公园草坪',parking:'停车位',forecourt:'加油站前场',flowers:'花坛',layby:'路边停车标线'}[kind]],1,{source:'town-art.js',generator:'ground',args:{kind,w:128,h:128}},()=>capture(128,128,()=>TownArt.ground({x:0,y:0}),{}, {floors:[{kind,x:0,y:0,w:128,h:128,slots:[{x:18,y:20,w:58,h:74}]}]}));
    for(const kind of ['crossing','streetSign','parkingSign','busSign','parkSign','drain','paper','leaves','crack'])add('mark/'+kind,'terrain',[kind,{crossing:'人行横道',streetSign:'路牌',parkingSign:'停车标识',busSign:'公交标识',parkSign:'公园标识',drain:'排水口',paper:'纸片',leaves:'落叶',crack:'裂缝'}[kind]],1,{source:'town-art.js',generator:'markings',args:{kind}},()=>capture(224,224,()=>TownArt.markings({x:300,y:300}),{}, {marks:[{kind,x:400,y:400}]}));
    for(const kind of ['explosion','bloater','bloater-fire','fire','blood','dust','smoke','spark','flame','chip','pellet','rocket','arc','micro-impact','drone-burst','trail','boss-warning','boss-impact','lightning','rain']){
      const labels={explosion:'爆炸',bloater:'自爆绿雾','bloater-fire':'燃烧自爆与范围点燃',fire:'燃烧区域',blood:'血液粒子',dust:'尘土',smoke:'烟雾',spark:'火星',flame:'火焰粒子',chip:'碎屑',pellet:'弹道',rocket:'火箭弹',arc:'电弧连锁', 'micro-impact':'微型导弹爆炸','drone-burst':'无人机销毁',trail:'导弹烟迹','boss-warning':'Boss 跃击预警','boss-impact':'Boss 落地冲击',lightning:'落雷',rain:'雨幕'};
      add('effect/'+kind,'effects',[kind,labels[kind]],12,{source:kind==='bloater-fire'?'burning.js':['arc','micro-impact','drone-burst','trail'].includes(kind)?'arsenal.js':kind.startsWith('boss')?'boss.js':['rain','lightning'].includes(kind)?'weather.js':'pixel-art.js',generator:'baked-effect-preview',kind,frameRate:12,procedural:true},f=>effect(kind,f));
    }
    add('ui/crosshair','ui',['Crosshair & reload','准星与换弹进度'],8,{source:'game.js',generator:'drawCrosshair',frameRate:8},f=>capture(80,80,()=>{player.reloadTimer=f?1.3*(1-f/8):0;player.weapon='shotgun';state.mouse={x:40,y:40};drawCrosshair();}));
    add('effect/military-beacon','effects',['Military beacon','军用空投红灯'],8,{source:'pixel-art.js',generator:'airdropBeacons',frameRate:8},f=>capture(80,80,()=>PixelArt.airdropBeacons({x:0,y:0}),{time:f/8,airdrops:[{kind:'military',x:40,y:48,landed:true,beaconPhase:0}]}));
    add('effect/standard-beacon','effects',['Supply beacon','普通空投琥珀灯'],12,{source:'pixel-art.js',generator:'airdropBeacons',frameRate:8},f=>capture(80,80,()=>PixelArt.airdropBeacons({x:0,y:0}),{time:f/8,airdrops:[{kind:'standard',x:40,y:48,landed:true,beaconPhase:0}]}));
    for(const kind of ['standard','military'])add('effect/airdrop-light/'+kind,'effects',[`${kind} supply lighting`,`${kind==='military'?'军用空投红光':'普通空投暖光'}`],12,{source:'lighting.js',generator:'airdrops',kind,frameRate:8,procedural:true},f=>capture(440,440,()=>{Lighting.artPreview(Lighting.airdrops({x:0,y:0}));PixelArt.airdrops({x:0,y:0});PixelArt.airdropBeacons({x:0,y:0});},{time:f/8,airdrops:[{kind,x:220,y:240,landed:true,smoke:0,beaconPhase:0}]}));
    for(const kind of ['player','walker','runner','crawler','bloater','pouncer','charger','boss'])add('effect/burning/'+kind,'effects',[`${names[kind][0]} · burning`,`${names[kind][1]} · 持续燃烧`],12,{source:'burning.js',generator:'draw',kind,frameRate:12,procedural:true},f=>capture(160,160,()=>{
      const o=kind==='player'?player:{id:501,type:kind,x:80,y:112,hp:100,radius:12,burn:{remaining:3}};
      if(kind==='player')Object.assign(player,{x:80,y:112,hp:100,burn:{remaining:3},rocketJumpTime:0,dashTime:0});else state.zombies=[o];
      PixelArt.actor(o,{x:0,y:0},kind==='player');Burning.draw({x:0,y:0});
    },{time:f/12}));
    add('ui/avatar' ,'ui',['Author avatar','作者头像'],1,{source:'assets/author-avatar.png',generator:'image'},()=>image('assets/author-avatar.png'));
    add('ui/title','ui',['Pixel title','像素标题'],1,{source:'game.js',generator:'pixelTitle'},()=>{
      const c=surface(276,192),p=c.getContext('2d');
      for(const g of pixelTitle().matchAll(/<g fill="([^"]+)">([\s\S]*?)<\/g>/g)){p.fillStyle=g[1];for(const r of g[2].matchAll(/<rect x="(\d+)" y="(\d+)" width="1" height="1"\/>/g))p.fillRect(Number(r[1])*12,Number(r[2])*12,12,12);}return c;
    });
  }
  function effect(kind,f){
    const t=f/12,w=kind==='lightning'?192:kind.startsWith('boss')?280:256,h=kind==='lightning'?512:w;
    return capture(w,h,()=>{
      if(['arc','micro-impact','drone-burst','trail'].includes(kind)){Arsenal.artPreview(kind,f);return;}
      if(['lightning','rain'].includes(kind)){Weather.artPreview(kind,f);return;}
      if(kind.startsWith('boss')){
        const saved=BossAttack.impacts.slice();try{BossAttack.impacts.length=0;
          if(kind==='boss-warning')state.zombies=[{type:'boss',bossPhase:'charge',targetX:140,targetY:140,targetLocked:f>7,bossTimer:1.3*(1-t)}];
          else BossAttack.impacts.push({x:140,y:140,age:t*.54,seed:1});
          BossAttack.drawWorld({x:0,y:0});BossAttack.drawWarnings({x:0,y:0});
        }finally{BossAttack.impacts.splice(0,BossAttack.impacts.length,...saved);}return;
      }
      if(kind==='bloater-fire'){
        state.zombies=[{id:501,type:'walker',x:62,y:145,hp:100,radius:12,burn:{remaining:3-t}},{id:502,type:'runner',x:174,y:76,hp:100,radius:12,burn:{remaining:3-t}}];
        Object.assign(player,{x:198,y:174,hp:100,burn:{remaining:3-t},rocketJumpTime:0,dashTime:0});
        for(const z of state.zombies)PixelArt.actor(z,{x:0,y:0});PixelArt.actor(player,{x:0,y:0},true);Burning.draw({x:0,y:0});
        if(t<.22)state.explosions.push({x:128,y:140,radius:74*t/.22,ring:74*t/.22,life:.22-t,maxLife:.22,bloaterBurst:true});
        if(t<.28)state.explosions.push({x:128,y:140,radius:96*t/.28,ring:96*t/.28,life:.28-t,maxLife:.28,ignitionBurst:true});
      }
      else if(['explosion','bloater'].includes(kind))state.explosions=[{x:128,y:128,radius:t*85,ring:t*90,life:1-t,maxLife:1,bloaterBurst:kind==='bloater'}];
      else if(kind==='fire')state.fireZones=[{x:128,y:140,radius:55,life:3}];
      else if(kind==='pellet')state.pellets=[{x:128,y:128,vx:400,vy:0,weapon:'gatling'}];
      else if(kind==='rocket')state.rockets=[{x:128,y:128,vx:Math.cos(t*Math.PI*2)*300,vy:Math.sin(t*Math.PI*2)*300}];
      else{const color={blood:'#821212',dust:'#8b8575',smoke:'#64696a',spark:'#edb960',flame:'#dc9c51',chip:'#8a9685'}[kind];state.particles=Array.from({length:12},(_,i)=>({x:128+Math.cos(i*2.4)*t*65,y:128+Math.sin(i*2.4)*t*45-t*30,life:1-t,maxLife:1,size:kind==='smoke'?12:kind==='flame'?8:4,color,chip:kind==='chip',floaty:kind==='smoke'}));}
      PixelArt.explosions({x:0,y:0});PixelArt.particles({x:0,y:0});PixelArt.pelletTrail({x:0,y:0});PixelArt.rockets({x:0,y:0});
    },{time:f/8});
  }
  function refreshWorld(){
    init();for(const b of WORLD.buildings){const id=`world/building/${b.role}/${b.w}/${b.h}/${b.variant}`;const sample={...b,id:'studio-'+id,x:0,y:0};add(id,'town',[`Current map · ${b.role} ${b.w}×${b.h}`,`当前地图 · ${TownArt.names[b.role]?.[1]||b.role} ${b.w}×${b.h}`],1,{source:'town-art.js',generator:'building',args:sample},()=>capture(b.w+12,b.h+20,()=>TownArt.building(sample,{x:0,y:0})));}
    for(const p of Town.props){const id=`world/prop/${p.kind}/${p.w}/${p.h}/${p.variant}/${(p.color||'none').replace('#','')}${p.kind==='roadcar'?'/facing'+p.facing:''}`;const sample={...p};add(id,'town',[`Current map · ${p.kind} ${p.w}×${p.h}`,`当前地图 · ${p.kind} ${p.w}×${p.h}`],1,{source:'town-art.js',generator:'propSprite',args:sample},()=>TownArt.propSprite(sample));}
  }
  async function frame(entry,index){if(!entry||index<0||index>=entry.frames)throw Error('Unknown asset frame');const result=await entry.render(index);if(!result||!result.width||!result.height)throw Error('Empty source canvas: '+entry.id);return clone(result);}
  return {init,refreshWorld,frame,capture,surface,clone,categories:cat,get entries(){init();return entries;},get:id=>{init();return byId.get(id);}};
})();
