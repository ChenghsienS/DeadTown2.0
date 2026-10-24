// Dead Town — desktop single-player, occluded lighting and spatial audio.
const canvas=document.getElementById('game');
let ctx=canvas.getContext('2d',{alpha:false});
let SW=innerWidth,SH=innerHeight;
function resize(){const dpr=Math.max(1,window.devicePixelRatio||1);SW=innerWidth;SH=innerHeight;canvas.width=Math.floor(SW*dpr);canvas.height=Math.floor(SH*dpr);canvas.style.width=SW+'px';canvas.style.height=SH+'px';ctx.setTransform(dpr,0,0,dpr,0,0);updateGameUI();}
addEventListener('resize',resize);


// ── Language and interface text ──
const T={
  en:{kills:'Kills',score:'Score',hp:'HP',ammo:'Ammo',weapon:'Weapon',reserve:'Reserve',grenades:'Throwables',time:'Time',wave:'Wave',best:'Best',shotgun:'Shotgun',gatling:'Gatling',rocket:'Rocket Launcher',flamethrower:'Flamethrower',reload:'Reloading',title:'DEAD TOWN',desc:'',tip:'',start1:'A dead town has been overrun by endless infected. You are one of the last survivors still fighting.',start2:'A single-player zombie horde PvE survival game focused on fast combat, crowd clearing, and weapon drops.',start3:'Click Start to begin',startBtn:'Start',returnMenu:'Return to main menu',dead:'YOU DIED',survive:'Survived',restart:'Restart',mainMenu:'Main Menu',boss:'Boss has spawned!',airdrop:'Airdrop incoming!',bossHp:'Boss HP',paused:'PAUSED',pauseHint:'Press P or Esc to resume',pauseLabel:'P / Esc Pause',loading:'Initializing signal...',loadingReady:'Signal locked. Opening menu...',serumDamage:'Serum acquired: +10% Damage',serumSpeed:'Serum acquired: +5% Speed',serumHealth:'Serum acquired: +15 Max HP',changeGrenadeKey:'Grenade Key',changeMolotovKey:'Molotov Key',openKeybindMenu:'Control',backBtn:'Back',keybindTitle:'Keybinds',keybindHint:'Only A-Z and 0-9 are allowed. Current: Grenade {grenade} · Molotov {molotov}',keyPromptGrenade:'Set grenade key (A-Z or 0-9):',keyPromptMolotov:'Set molotov key (A-Z or 0-9):',keyInvalid:'Only a single A-Z or 0-9 key is allowed.',keyConflict:'That key is already used by the other throwable. Choose a different key.',openKeybindMenu:'Key Settings',backBtn:'Back',devUnlock:'Developer',devUnlockPrompt:'Enter developer password:',devUnlockFail:'Wrong password.',devUnlocked:'Developer mode enabled.',devPanel:'DEV PANEL',devShotgun:'Shotgun',devGatling:'Gatling',devRocket:'Rocket',devFlame:'Flamethrower',devHeal:'Heal',devThrowables:'Throwables',devCharger:'Charger',devBoss:'Boss',devBloater:'Bloater',createdBy:'Created by',assistedBy:'This game was created with the assistance of',nameLabel:'Name',leaderboardTitle:'Global Top 10',leaderboardLoading:'Loading leaderboard...',leaderboardEmpty:'No scores yet.',leaderboardError:'Leaderboard unavailable right now.',leaderboardRefresh:'Refresh',leaderboardSyncing:'Syncing score...',youTag:'YOU',devBoss:'Boss',defaultNameTitle:'Name Required for Leaderboard',defaultNameNotice:'You are still using the default name Player. Scores from this session will not be recorded to the online leaderboard.',defaultNameContinue:'Continue Without Ranking',defaultNameBack:'Back to Main Menu',defaultNameRename:'Change Name'},
  zh:{kills:'击杀',score:'分数',hp:'生命',ammo:'子弹',weapon:'武器',reserve:'备弹',grenades:'投掷物',time:'时间',wave:'波次',best:'最高分',shotgun:'霰弹枪',gatling:'加特林',rocket:'火箭发射器',flamethrower:'喷火器',reload:'换弹中',title:'DEAD TOWN',desc:'',tip:'',start1:'一座死城已被无尽感染者吞没，而你是仍在战斗的幸存者之一。',start2:'这是一款以高速战斗、割草清怪和武器空投为核心的单人丧尸 PVE 生存游戏。',start3:'点击开始按钮进入游戏',startBtn:'开始游戏',returnMenu:'返回主菜单',dead:'你死了',survive:'存活',restart:'重新开始',mainMenu:'主菜单',boss:'Boss 已出现！',airdrop:'空投已抵达！',bossHp:'Boss生命',paused:'已暂停',pauseHint:'按 P 或 Esc 继续',pauseLabel:'P / Esc 暂停',loading:'正在初始化信号...',loadingReady:'信号稳定，正在打开菜单...',serumDamage:'已获得血清：伤害 +10%',serumSpeed:'已获得血清：移速 +5%',serumHealth:'已获得血清：生命上限 +15',changeGrenadeKey:'手榴弹键位',changeMolotovKey:'燃烧瓶键位',openKeybindMenu:'Control',backBtn:'返回',keybindTitle:'键位设置',keybindHint:'只能使用 A-Z 和 0-9。当前：手榴弹 {grenade} · 燃烧瓶 {molotov}',keyPromptGrenade:'设置手榴弹键位（A-Z 或 0-9）：',keyPromptMolotov:'设置燃烧瓶键位（A-Z 或 0-9）：',keyInvalid:'只能输入单个 A-Z 或 0-9 键位。',keyConflict:'这个键位已经被另一个投掷物占用了，请换一个。',openKeybindMenu:'键位设置',backBtn:'返回',devUnlock:'开发者',devUnlockPrompt:'输入开发者密码：',devUnlockFail:'密码错误。',devUnlocked:'开发者模式已开启。',devPanel:'开发者面板',devShotgun:'霰弹枪',devGatling:'加特林',devRocket:'火箭筒',devFlame:'喷火器',devHeal:'回血',devThrowables:'投掷物',devCharger:'冲锋怪',devBoss:'Boss',createdBy:'作者',assistedBy:'本游戏在 ChatGPT 的协助下完成',nameLabel:'名字',leaderboardTitle:'全球前十排行榜',leaderboardLoading:'排行榜加载中...',leaderboardEmpty:'暂时还没有成绩。',leaderboardError:'排行榜暂时不可用。',leaderboardRefresh:'刷新',leaderboardSyncing:'正在同步成绩...',youTag:'当前',devBoss:'首领',defaultNameTitle:'需要先修改名字',defaultNameNotice:'你当前仍在使用默认名字 Player。本局成绩不会记录到后端排行榜。',defaultNameContinue:'继续游玩但不计排行',defaultNameBack:'返回主页面',defaultNameRename:'修改名字'}
};
Object.assign(T.en,{arc:'Arc Rifle',drone:'Missile Drone',devArc:'Arc Rifle',devDrone:'Missile Drone',devMilitaryDrop:'Military airdrop',militaryAirdrop:'Military airdrop incoming!',devStorm:'Lightning controller',devAimStrike:'Choose impact point',devCancelStrike:'Cancel targeting',devRandomStrike:'Random strike',devPlayerStrike:'Strike at player',devStormAuto:'Natural storms',devRadius:'Radius',devPlayerDamage:'Player damage',devZombieDamage:'Zombie damage',devStrikeHint:'Click ground to strike · Esc to cancel',devBloater:'Bloater',devArt:'Art Studio'});
Object.assign(T.zh,{arc:'电弧枪',drone:'无人机',devArc:'电弧枪',devDrone:'导弹无人机',devMilitaryDrop:'军用空投',militaryAirdrop:'军用空投已抵达！',devStorm:'落雷控制器',devAimStrike:'指定落点',devCancelStrike:'取消指定',devRandomStrike:'随机落雷',devPlayerStrike:'玩家脚下落雷',devStormAuto:'自然雷暴',devRadius:'落雷半径',devPlayerDamage:'玩家伤害',devZombieDamage:'丧尸伤害',devStrikeHint:'点击地面落雷 · Esc 取消',devBloater:'自爆丧尸',devArt:'美术工作台'});
let lang=localStorage.getItem('dead_town_language')==='zh'?'zh':'en';
const $=id=>document.getElementById(id);
function isDefaultPlayerName(name){
  return String(name||'').trim().toLowerCase()==='player';
}

// ── Account-bound rankings (browser only) ──
function escapeHtml(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function savePersonalBest(){try{localStorage.setItem(Accounts.bestKey(),String(state.best));}catch{}}
function restoreLeaderboardStorage(){Rankings.restore();}
function leaderboardCardMarkup(){return Rankings.markup();}
function bindLeaderboardRefreshButton(){Rankings.bind();}
function refreshLeaderboardPanels(){Rankings.refreshPanels();}
function loadLeaderboard(){return Rankings.load();}
function syncPlayerBest(){return Accounts.refresh();}
function flushLeaderboardScores(){return Rankings.flush();}
function submitLeaderboardScore(score){return Rankings.submit(score);}
function retryLeaderboard(){return Rankings.retry();}

function sanitizeKeybind(value){
  const clean=String(value||'').trim().toUpperCase();
  return /^[A-Z0-9]$/.test(clean)?clean:null;
}
function keyStorageValue(name, fallback){
  return sanitizeKeybind(localStorage.getItem(name)) || fallback;
}
function formatGameplayDesc(){
  const grenadeKey=state.keybinds.grenade;
  const molotovKey=state.keybinds.molotov;
  if(lang==='zh') return `在尸潮中生存，拾取空投武器，用投掷物控制范围。首领会随时间出现。WASD移动 · 左键开火 · R换弹 · Shift翻滚 · ${grenadeKey}手榴弹 · ${molotovKey}燃烧瓶。`;
  return `Survive zombie waves, collect airdrops, and use throwables to control space. Bosses appear over time. WASD Move · Left Click Fire · R Reload · Shift Dodge · ${grenadeKey} Grenade · ${molotovKey} Molotov.`;
}
function formatKeybindHint(){
  return T[lang].keybindHint.replace('{grenade}',state.keybinds.grenade).replace('{molotov}',state.keybinds.molotov);
}

Object.assign(T.en,{devHorde:'Horde stress test',devHordeCount:'Count (25–1000)',devHordeSpawn:'Spawn Horde',devHordeClear:'Clear test horde',devHordeHint:'Batches of 20; up to 2000 test enemies. Clear removes test enemies only.'});
Object.assign(T.zh,{devHorde:'Horde 尸潮压力测试',devHordeCount:'数量（25–1000）',devHordeSpawn:'生成尸潮',devHordeClear:'清除测试尸潮',devHordeHint:'每帧分批生成 20 只，最多 2000 只测试丧尸。清除仅移除测试丧尸。'});

// ── World and game state ──
const BUILDINGS_CLOSED=true; // Temporary closure; false restores door access.
const AIRDROP_LOOT=Object.freeze({standard:Object.freeze(['gatling','rocket','flamethrower']),military:Object.freeze(['arc','drone'])});
const WORLD={w:3600,h:2400,road:[],buildings:[]};
const state={running:false,gameOver:false,paused:false,loading:true,loadProgress:0,loadDone:false,vhsTime:0,mouse:{x:SW/2,y:SH/2},keys:new Set(),pellets:[],zombies:[],particles:[],decals:[],pickups:[],grenades:[],explosions:[],airdrops:[],rockets:[],flameParticles:[],fireZones:[],damageTexts:[],wave:1,kills:0,score:0,surviveTime:0,spawnTimer:0,waveTimer:0,screenFlash:0,cameraShake:0,best:Number(localStorage.getItem('dead_town_supply_v2_best')||0),bossSpawned:false,bossAnnouncement:0,airdropAnnouncement:0,buffAnnouncement:'',buffAnnouncementType:'upgrade',buffAnnouncementTimer:0,airdropTimer:35,militaryAirdropTimer:60,airdropAnnouncementType:'standard',deathAnim:0,time:0,nextBossTime:90,nextEntityId:1,playerName:localStorage.getItem('dead_town_player_name')||'Player',keybinds:{grenade:keyStorageValue('dead_town_keybind_grenade','G'),molotov:keyStorageValue('dead_town_keybind_molotov','F')},devMode:false,menuScreen:'main',overlayScreen:'none',leaderboard:[],leaderboardLoading:false,leaderboardError:'',leaderboardLoaded:false,leaderboardSyncing:false};
let player={...PlayerSkins.load(),x:WORLD.w/2,y:WORLD.h/2,radius:10,speed:175,speedMul:1,damageMul:1,hp:100,maxHp:100,grenades:1,molotovs:0,shootCooldown:0,reloadTimer:0,wasReloading:false,dashCooldown:0,dashTime:0,dashFacing:0,dashSpinDir:1,faceDir:1,hurtTimer:0,dashVX:0,dashVY:0,rocketJumpTime:0,rocketJumpVX:0,rocketJumpVY:0,knockbackTime:0,knockbackVX:0,knockbackVY:0,weapon:'shotgun',mag:6,magSize:6,gatlingAmmo:0,rocketAmmo:0,flameAmmo:0,arcAmmo:0};
const SELF_EXPLOSIVE_DAMAGE_MULT=0.125;
const ROCKET_JUMP_DURATION=0.5;
const ROCKET_JUMP_BASE_SPEED=420;
const ROCKET_JUMP_BONUS_SPEED=280;
const ROCKET_JUMP_DAMPING_PER_SECOND=0.12;
const FLAME_VELOCITY_DAMPING_PER_SECOND=0.42;

function scaleDamage(v){return v*(player.damageMul||1);}
function spawnBossSerum(x,y){const buffs=['speed','damage','health'];const buff=buffs[Math.floor(Math.random()*buffs.length)];state.pickups.push({type:'serum',buff,x,y,radius:11,phase:Math.random()*Math.PI*2,ttl:40});}
function applySerumBuff(buff){if(buff==='damage'){player.damageMul*=1.10;state.buffAnnouncement=T[lang].serumDamage;}else if(buff==='speed'){player.speedMul*=1.05;state.buffAnnouncement=T[lang].serumSpeed;}else{player.maxHp+=15;player.hp=Math.min(player.maxHp,player.hp+15);state.buffAnnouncement=T[lang].serumHealth;}state.buffAnnouncementType='upgrade';state.buffAnnouncementTimer=2.6;Coop.emit('notice',{id:player.id,kind:'serum',value:buff});playPickup();}
function triggerBloaterDeathBurst(x,y,deadIndex=-1,creditPlayer=true,owner=player.id||'player'){AudioEngine.variant('gore',3,{x,y,volume:0.42,group:'bloater',interval:0.08});const radius=74;state.explosions.push({x,y,radius:0,maxRadius:radius,life:0.22,maxLife:0.22,ring:0,rocket:false,bloaterBurst:true});for(let i=0;i<18;i++){const a=Math.random()*Math.PI*2,s=rand(40,180);state.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-rand(10,40),life:rand(0.18,0.38),maxLife:0.38,size:rand(2,5),color:Math.random()>0.45?'rgba(140,210,90,0.75)':'rgba(110,160,70,0.6)',drag:0.93});}state.cameraShake=Math.max(state.cameraShake,4.5);Coop.each(()=>{const pd=dist(player.x,player.y,x,y);if(pd<radius+player.radius&&Town.lineClear(x,y,player.x,player.y)){const dealt=Math.max(1,12-pd*0.11);damagePlayer(dealt,x,y,{ignoreInvincibility:true});}});for(const other of [...state.zombies]){if(other.hp<=0||BossAttack.airborne(other)||!state.zombies.includes(other))continue;const d=dist(other.x,other.y,x,y);if(d<radius+other.radius&&Town.lineClear(x,y,other.x,other.y)){const dealt=Math.max(6,34-d*0.28)*(creditPlayer?player.damageMul:1);other.hp-=dealt;PixelArt.hit(other);addDamageText(other.x+rand(-10,10),other.y-other.radius-10,dealt,'#b9ff7a');if(other.hp<=0){handleZombieDeath(state.zombies.indexOf(other),creditPlayer,'normal',owner);}}}}
function handleZombieDeath(index,creditPlayer=true,cause='normal',owner=player.id||'player'){
  const z=state.zombies[index];if(!z)return;
  PixelArt.death(z,cause);const deathX=z.x,deathY=z.y,deathType=z.type,burn=z.burn;
  const charred=cause==='fire'&&z.type!=='boss'&&z.type!=='bloater';
  Burning.clear(z);
  if(!charred)blood(z.x,z.y,z.type==='bloater'||z.type==='boss'?24:14,'rgba(130,18,18,0.95)',z.type==='boss'?1.15:1.05);
  if(z.type==='boss')spawnBossSerum(z.x,z.y);else maybeSpawnPickup(z.x,z.y);
  if(creditPlayer)Coop.award(z.score,owner);
  if(!charred)playGore(z.x,z.y);
  state.zombies.splice(index,1);
  if(deathType==='bloater'){
    triggerBloaterDeathBurst(deathX,deathY,-1,creditPlayer,owner);
    // The body is already removed before damage can recurse into other deaths.
    // Burning alone is insufficient: the final hit must actually be fire.
    if(cause==='fire')Burning.igniteNearby(deathX,deathY,burn?.mult??player.damageMul,creditPlayer,owner);
  }
}



function updateLoadingUI(){
  if(typeof DeadTownLoader!=='undefined'&&state.loading){DeadTownLoader.render();return;}
  const overlay=$('loadingOverlay');
  if(overlay)overlay.classList.toggle('hidden',!state.loading);
}

function updateGameUI(){ document.body.classList.toggle('ingame', state.running && !state.gameOver); document.body.classList.toggle('paused',state.paused); }

function updateCursorVisibility(){
  const inGameplay = state.running && !state.gameOver && !state.paused && !state.loading;
  canvas.style.cursor = inGameplay ? 'none' : 'default';
}


// ── Developer tools ──
function updateDevPanel(){
  const panel=$('devPanel');
  if(!panel) return;
  panel.classList.toggle('hidden', !(state.devMode&&state.running&&!state.gameOver));
  const title=$('devPanelTitle');
  if(title) title.textContent=T[lang].devPanel;
  const map=[['devHordeTitle','devHorde'],['devHordeCountLabel','devHordeCount'],['devHordeSpawnBtn','devHordeSpawn'],['devHordeClearBtn','devHordeClear'],['devHordeHint','devHordeHint'],['devArtBtn','devArt'],['devShotgunBtn','devShotgun'],['devGatlingBtn','devGatling'],['devRocketBtn','devRocket'],['devFlameBtn','devFlame'],['devHealBtn','devHeal'],['devThrowablesBtn','devThrowables'],['devChargerBtn','devCharger'],['devBossBtn','devBoss'],['devBloaterBtn','devBloater'],['devArcBtn','devArc'],['devDroneBtn','devDrone'],['devMilitaryDropBtn','devMilitaryDrop'],['devStormTitle','devStorm'],['devRandomStrikeBtn','devRandomStrike'],['devPlayerStrikeBtn','devPlayerStrike'],['devStormAutoLabel','devStormAuto'],['devRadiusLabel','devRadius'],['devPlayerDamageLabel','devPlayerDamage'],['devZombieDamageLabel','devZombieDamage']];
  for(const [id,key] of map){ const el=$(id); if(el) el.textContent=T[lang][key]; }
  DevHorde.refresh();
  const aim=$('devAimStrikeBtn');if(aim)aim.textContent=T[lang][Weather.armed?'devCancelStrike':'devAimStrike'];
}
function setWeaponLoadout(choice){
  const spec=WEAPONS[choice];if(!spec)return;
  player.weapon=choice;player.magSize=spec.mag;player.mag=spec.mag;
  if(choice!=='shotgun')player[choice==='flamethrower'?'flameAmmo':choice+'Ammo']=spec.reserve;
  player.reloadTimer=0;player.wasReloading=false;player.shootCooldown=0;updateHUD();
}
function devStrikeOptions(){
  const number=(id,fallback,max)=>{const raw=$(id)?.value;const n=raw===''?fallback:Number(raw);return clamp(Number.isFinite(n)?n:fallback,0,max);};
  return {radius:number('devStrikeRadius',WEATHER.strikeRadius,250),playerDamage:number('devStrikePlayerDamage',WEATHER.playerDamage,5000),zombieDamage:number('devStrikeZombieDamage',WEATHER.zombieDamage,5000)};
}
function devStrike(x,y){if(!state.devMode||!state.running||state.paused)return;Weather.forceStrike(x,y,devStrikeOptions());}
function unlockDeveloperMode(){
  if(state.devMode){ArtStudio.open();return;}
  openMenuDialog({title:T[lang].devUnlock,label:T[lang].devUnlockPrompt,type:'password',value:'',submit(value){
    if(value.trim()!=='Lajipingguo')return T[lang].devUnlockFail;
    state.devMode=true;applyLang();setTimeout(()=>ArtStudio.open(),0);return '';
  }});
}

function bindMenuButtons(){
  ['devHordeSpawnBtn','devHordeClearBtn','menuLangBtn','pauseBtn','resumeBtn','pauseMenuBtn','pauseLangBtn','continueDefaultNameBtn','renameDefaultNameBtn','backDefaultNameBtn','renameBtn','grenadeKeyBtn','molotovKeyBtn','startBtn','restartBtn','menuBtn','langBtn','openKeybindMenuBtn','devUnlockBtn','backToMainBtn','devShotgunBtn','devGatlingBtn','devRocketBtn','devFlameBtn','devHealBtn','devThrowablesBtn','devChargerBtn','devBossBtn','devBloaterBtn','devArcBtn','devDroneBtn','devMilitaryDropBtn','devAimStrikeBtn','devRandomStrikeBtn','devPlayerStrikeBtn','refreshLeaderboardBtn'].forEach(id=>{
    const el=$(id);
    if(el && !el.dataset.soundBound){
      el.dataset.soundBound='1';
      el.addEventListener('click',()=>{playMenuClick(); ensureAudio(); startBGM();});
    }
  });
  const setup=[['devHordeSpawnBtn',()=>DevHorde.request($('devHordeCount')?.value)],['devHordeClearBtn',()=>DevHorde.clear()],['devArtBtn',()=>ArtStudio.open()],['devShotgunBtn',()=>setWeaponLoadout('shotgun')],['devGatlingBtn',()=>setWeaponLoadout('gatling')],['devRocketBtn',()=>setWeaponLoadout('rocket')],['devFlameBtn',()=>setWeaponLoadout('flamethrower')],['devHealBtn',()=>{player.hp=player.maxHp;Burning.clear(player);updateHUD();}],['devThrowablesBtn',()=>{player.grenades=8;player.molotovs=5;updateHUD();}],['devChargerBtn',()=>spawnCharger(true)],['devBossBtn',()=>spawnBoss(true)],['devBloaterBtn',()=>spawnDevBloater()],['devArcBtn',()=>setWeaponLoadout('arc')],['devDroneBtn',()=>Arsenal.deploy()],['devMilitaryDropBtn',()=>{if(!state.paused)spawnAirdrop('military',true);}],['devAimStrikeBtn',()=>{if(!state.paused){Weather.arm(!Weather.armed);mouseDown=false;updateDevPanel();}}],['devRandomStrikeBtn',()=>devStrike(Math.random()*WORLD.w,Math.random()*WORLD.h)],['devPlayerStrikeBtn',()=>devStrike(player.x,player.y)]];
  const auto=$('devStormAuto');if(auto&&!auto.dataset.bound){auto.dataset.bound='1';auto.checked=Weather.automatic;auto.onchange=()=>Weather.setAutomatic(auto.checked);}
  for(const [id,fn] of setup){const el=$(id); if(el && !el.dataset.devBound){el.dataset.devBound='1'; el.addEventListener('click',fn);}}
}
function startGameFromMenu(){ Object.assign(player,PlayerSkins.load());resetGame();Rankings.begin(); }
function showDefaultNameStartPrompt(){
  state.overlayScreen='default-name-warning';const zh=lang==='zh';
  showMenu('subCard',`${menuHeader(zh?'账号与排名':'ACCOUNT & RANKING')}<div class="screenBody"><span class="eyebrow">SURVIVOR ID / GUEST</span><h2>${zh?'登录后获得排名':'Sign in to get ranked'}</h2><p>${zh?'注册或登录账号后，单人模式成绩才会进入全球排行榜。你也可以继续以游客身份游玩。':'Register or sign in to add your solo scores to the global leaderboard. You can also continue as a guest.'}</p><div class="controls"><button class="primary" id="rankLoginBtn">${zh?'登录':'Sign in'}</button><button id="rankRegisterBtn">${zh?'注册账号':'Register'}</button><button id="continueDefaultNameBtn">${zh?'游客游玩，不计排行':'Play as guest · Unranked'}</button><button class="quiet" id="backDefaultNameBtn">${zh?'返回':'Back'}</button></div></div>${menuFooter()}`);
  $('rankLoginBtn').onclick=()=>Accounts.open('login',startGameFromMenu);$('rankRegisterBtn').onclick=()=>Accounts.open('register',startGameFromMenu);
  $('continueDefaultNameBtn').onclick=startGameFromMenu;$('backDefaultNameBtn').onclick=()=>{state.menuScreen='main';renderMainMenu();};bindMenuButtons();
}
async function handleStartAttempt(){
  if(!Accounts.initialized)await Accounts.refresh();
  if(!Accounts.user){showDefaultNameStartPrompt();return;}
  startGameFromMenu();
}
// Menu chrome shares the generated build version; package.json is the release source.
function pixelTitle(){
  const glyphs={D:['11110','11011','11011','11011','11011','11011','11110'],E:['11111','11000','11000','11110','11000','11000','11111'],A:['01110','11011','11011','11111','11011','11011','11011'],T:['11111','01110','01110','01110','01110','01110','01110'],O:['01110','11011','11011','11011','11011','11011','01110'],W:['11011','11011','11011','11011','11111','11111','01010'],N:['10011','11011','11011','11111','11111','11011','11001']};
  return `<svg class="titlePixels" viewBox="0 0 23 16" role="img" aria-label="DEAD TOWN" shape-rendering="crispEdges">${['DEAD','TOWN'].map((word,row)=>`<g fill="${row?'#df4b3f':'#e8e8d5'}">${[...word].map((c,col)=>glyphs[c].map((line,y)=>[...line].map((v,x)=>v==='1'?`<rect x="${col*6+x}" y="${row*9+y}" width="1" height="1"/>`:'').join('')).join('')).join('')}</g>`).join('')}</svg>`;
}
function menuHeader(section,home=false){return `<header class="menuTop"><span class="eyebrow"><i class="signalDot"></i>DEAD TOWN / ${section}</span><span class="version" ${home?'id="homeVersion"':''}>${lang==='zh'?'当前版本':'BUILD'} <b>V${GAME_VERSION}</b></span></header>`;}
function menuFooter(){return `<footer class="menuFooter"><span>${lang==='zh'?'生存行动 · 键盘与鼠标':'SURVIVAL · KEYBOARD + MOUSE'}</span><span>CEDRRRIIICCC / DEAD TOWN</span></footer>`;}
function showMenu(kind,html){const card=$('overlayCard');card.className='card '+kind;card.innerHTML=html;card.scrollTop=0;$('overlay').classList.remove('hidden');}
function formatTime(seconds){const n=Math.max(0,Math.floor(seconds));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function controlGuide(){const zh=lang==='zh';return `<ul class="controlGuide">${[[zh?'移动':'Move','WASD / ↑↓←→'],[zh?'瞄准 / 开火':'Aim / Fire',zh?'鼠标 / 左键':'MOUSE / LMB'],[zh?'换弹':'Reload','R'],[zh?'翻滚':'Dodge','SHIFT'],[zh?'手榴弹':'Grenade',state.keybinds.grenade],[zh?'燃烧瓶':'Molotov',state.keybinds.molotov],[zh?'暂停 / 继续':'Pause / Resume','P / ESC'],[zh?'中英文切换':'Language','L']].map(([label,key])=>`<li><span>${label}</span><kbd>${key}</kbd></li>`).join('')}</ul>`;}
function renderMainMenu(){
  state.overlayScreen='main';
  const t=T[lang],zh=lang==='zh';
  showMenu('mainCard',`${menuHeader(zh?'幸存者终端':'SURVIVOR TERMINAL',true)}<div class="mainGrid"><section class="hero"><div class="eyebrow">${zh?'隔离区 / 无尽尸潮':'QUARANTINE ZONE / ENDLESS HORDE'}</div><h1 class="heroTitle">${pixelTitle()}</h1><div class="heroCopy"><p>${t.start1}</p></div>${Accounts.badge()}<button id="startBtn" class="primary startButton"><span>${t.startBtn}</span><span class="arrow" aria-hidden="true">→</span></button><button id="onlineBtn" class="primary startButton onlineButton"><span>${zh?'多人合作':'Online Co-op'}</span><span>↗</span></button><nav class="menuButtons" aria-label="${zh?'主菜单':'Main menu'}"><button id="renameBtn">${Accounts.user?(zh?'账号资料':'Account Profile'):(zh?'修改名字':'Change Name')}<span class="buttonIndex" aria-hidden="true">01</span></button><button id="openKeybindMenuBtn">${t.openKeybindMenu}<span class="buttonIndex" aria-hidden="true">02</span></button><button id="devUnlockBtn">${state.devMode?(zh?'开发者 · 已解锁':'Developer · unlocked'):t.devUnlock}<span class="buttonIndex" aria-hidden="true">03</span></button><button id="menuLangBtn">${zh?'中文 / EN':'EN / 中文'}<span class="buttonIndex" aria-hidden="true">04</span></button></nav>${AudioEngine.settingsHTML(lang)}</section><aside class="menuSide"><div class="recordStrip"><span class="label">${zh?'个人纪录':'PERSONAL RECORD'}<br>${t.best}</span><strong id="menuBest">${Math.floor(state.best)}</strong></div>${PlayerSkins.markup(player)}<div id="leaderboardPanel" data-leaderboard-panel="main">${leaderboardCardMarkup()}</div><div class="creatorCard"><img class="creditAvatar" src="assets/author-avatar.png" width="64" height="64" alt="CEDRRRIIICCC"><div><span class="label">${t.createdBy}</span><strong class="creatorName">CEDRRRIIICCC</strong><p class="creatorNote">${zh?'本游戏在 ChatGPT 的协助下完成':'Created with the assistance of ChatGPT'}</p></div></div></aside></div>${menuFooter()}`);
  AudioEngine.bindSettings();Accounts.bind($('overlayCard'));
  PlayerSkins.bind($('overlayCard'),player,a=>{Object.assign(player,a);renderMainMenu();});
  $('onlineBtn').onclick=()=>Net.open();
  $('renameBtn').onclick=promptPlayerName;$('startBtn').onclick=handleStartAttempt;
  $('openKeybindMenuBtn').onclick=()=>{state.menuScreen='keybinds';applyLang();};
  $('devUnlockBtn').onclick=unlockDeveloperMode;$('menuLangBtn').onclick=changeLanguage;
  bindLeaderboardRefreshButton();bindMenuButtons();
  if(!state.leaderboardLoaded&&!state.leaderboardLoading)loadLeaderboard();
}
function renderKeybindMenu(){
  state.overlayScreen='keybinds';const t=T[lang];
  showMenu('subCard',`${menuHeader(lang==='zh'?'操作指南':'FIELD MANUAL')}<div class="screenBody"><span class="eyebrow">01 / CONTROLS</span><h2>${t.keybindTitle}</h2><p>${formatKeybindHint()}</p>${controlGuide()}<div class="keybindActions"><button id="grenadeKeyBtn">${t.changeGrenadeKey} <kbd>${state.keybinds.grenade}</kbd></button><button id="molotovKeyBtn">${t.changeMolotovKey} <kbd>${state.keybinds.molotov}</kbd></button></div><div class="controls"><button class="primary" id="backToMainBtn">← ${t.backBtn}</button></div></div>${menuFooter()}`);
  $('grenadeKeyBtn').onclick=()=>promptKeybind('grenade');$('molotovKeyBtn').onclick=()=>promptKeybind('molotov');$('backToMainBtn').onclick=()=>{state.menuScreen='main';applyLang();};bindMenuButtons();
}
function renderPauseMenu(){
  state.overlayScreen='pause';const t=T[lang];
  showMenu('pauseCard',`${menuHeader(lang==='zh'?'战斗暂停':'SESSION PAUSED')}<div class="screenBody"><span class="eyebrow">${t.wave} ${state.wave} / ${formatTime(state.surviveTime)}</span><h2>${t.paused}</h2><p>${t.pauseHint}</p><div class="controls"><button id="resumeBtn" class="primary">${lang==='zh'?'继续战斗':'Resume'}</button><button id="pauseMenuBtn">${t.returnMenu}</button><button id="pauseLangBtn">EN / 中文</button></div>${controlGuide()}${AudioEngine.settingsHTML(lang)}</div>${menuFooter()}`);
  $('resumeBtn').onclick=togglePause;$('pauseMenuBtn').onclick=goToMainMenu;$('pauseLangBtn').onclick=changeLanguage;AudioEngine.bindSettings();bindMenuButtons();
}
function renderGameOverMenu(){
  state.overlayScreen='gameover';const t=T[lang];
  showMenu('reportCard',`${menuHeader(lang==='zh'?'行动记录':'AFTER ACTION REPORT')}<div class="screenBody"><span class="eyebrow">${lang==='zh'?'信号中断':'SIGNAL LOST'}</span><h2 class="deathTitle">${t.dead}</h2><div class="reportColumns"><section><div class="resultsGrid">${[[t.score,Math.floor(state.score)],[t.kills,state.kills],[t.survive,formatTime(state.surviveTime)],[t.best,Math.floor(state.best)]].map(([k,v])=>`<div class="resultStat"><span class="label">${k}</span><strong>${v}</strong></div>`).join('')}</div>${ProgressUI.markup()}<div class="controls"><button id="restartBtn" class="primary">${t.restart} →</button><button id="menuBtn">${t.mainMenu}</button></div><p class="boardNote">${escapeHtml(state.playerName)} / ${t.wave} ${state.wave}</p>${PlayerSkins.markup(player)}</section><div id="leaderboardPanel" data-leaderboard-panel="gameover">${leaderboardCardMarkup()}</div></div></div>${menuFooter()}`);
  PlayerSkins.bind($('overlayCard'),player,a=>{Object.assign(player,a);renderGameOverMenu();});
  ProgressUI.mount();$('restartBtn').onclick=handleStartAttempt;$('menuBtn').onclick=goToMainMenu;bindLeaderboardRefreshButton();bindMenuButtons();
}
function changeLanguage(){lang=lang==='en'?'zh':'en';localStorage.setItem('dead_town_language',lang);applyLang();updateCursorVisibility();}
function applyLang(){
  if(Coop.client){Net.localize();return;}
  FrameStats.localize(lang);
  const t=T[lang];if(document.documentElement)document.documentElement.lang=lang==='zh'?'zh-CN':'en';
  for(const [id,key] of [['lKills','kills'],['lScore','score'],['lHp','hp'],['lAmmo','ammo'],['lWeapon','weapon'],['lReserve','reserve'],['lGrenades','grenades'],['lTime','time'],['lWave','wave'],['lBest','best']])$(id).textContent=t[key];
  $('desc').textContent=formatGameplayDesc()+' '+t.pauseLabel;$('tip').textContent=t.tip;
  $('pauseBtn').innerHTML=`${lang==='zh'?'暂停':'Pause'} <kbd>Esc</kbd>`;
  $('loadingVersion').textContent='V'+GAME_VERSION;
  if(!state.running&&!state.gameOver){
    if(state.overlayScreen==='default-name-warning')showDefaultNameStartPrompt();
    else if(state.menuScreen==='keybinds')renderKeybindMenu();else renderMainMenu();
  }else if(state.gameOver&&state.deathAnim===0)renderGameOverMenu();
  else if(state.paused)renderPauseMenu();
  updateHUD();updateLoadingUI();updateDevPanel();
}
$('langBtn').onclick=changeLanguage;$('pauseBtn').onclick=()=>{togglePause();$('pauseBtn').blur?.();};
let menuDialog=null;
function closeMenuDialog(){
  const previous=menuDialog?.previous;menuDialog=null;$('dialogOverlay').classList.add('hidden');$('dialogOverlay').innerHTML='';
  if(previous?.isConnected)previous.focus();else if(previous?.id)$(previous.id)?.focus();
}
function openMenuDialog(options){
  menuDialog={...options,previous:document.activeElement};const zh=lang==='zh';
  $('dialogOverlay').innerHTML=`<form class="dialogCard" id="menuDialogForm"><span class="eyebrow">DEAD TOWN / ${zh?'设置':'SETUP'}</span><h2 id="dialogTitle">${escapeHtml(options.title)}</h2><label for="dialogInput">${escapeHtml(options.label)}</label><input id="dialogInput" type="${options.type||'text'}" value="${escapeHtml(options.value||'')}" maxlength="${options.maxLength||64}" autocomplete="off" spellcheck="false" aria-describedby="dialogError"><p id="dialogError" class="dialogError" role="alert"></p><div class="controls"><button type="button" class="quiet" id="dialogCancel">${zh?'取消':'Cancel'}</button><button type="submit" class="primary" id="dialogConfirm">${zh?'确认':'Confirm'}</button></div></form>`;
  $('dialogOverlay').classList.remove('hidden');$('dialogInput').focus();$('dialogInput').select?.();
  $('dialogCancel').onclick=closeMenuDialog;
  $('menuDialogForm').onsubmit=e=>{e.preventDefault();const message=menuDialog.submit($('dialogInput').value);if(message){$('dialogError').textContent=message;$('dialogInput').focus();}else{closeMenuDialog();playMenuClick();}};
}
$('dialogOverlay').addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeMenuDialog();}
  if(e.key==='Tab'){
    const nodes=[...$('dialogOverlay').querySelectorAll('button:not([disabled]), input:not([disabled]):not([type=hidden]), select, textarea, [tabindex="0"]')];
    const first=nodes[0],last=nodes[nodes.length-1];if(!first)return;
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
});
function promptPlayerName(){
  if(Accounts.user){Accounts.open('profile');return;}
  openMenuDialog({title:lang==='zh'?'修改名字':'Change Name',label:lang==='zh'?'输入角色名字（最多 20 个字符）':'Character name (up to 20 characters)',value:state.playerName,maxLength:512,submit(value){
    if(!AccountRules.validName(value))return Accounts.errorText({code:'display_name_rule'});const clean=AccountRules.displayName(value);
    state.playerName=clean;localStorage.setItem('dead_town_player_name',clean);state.overlayScreen='main';applyLang();syncPlayerBest();loadLeaderboard(true);return '';
  }});
}
function promptKeybind(type){
  const isGrenade=type==='grenade',storageKey=isGrenade?'dead_town_keybind_grenade':'dead_town_keybind_molotov';
  openMenuDialog({title:T[lang][isGrenade?'changeGrenadeKey':'changeMolotovKey'],label:T[lang][isGrenade?'keyPromptGrenade':'keyPromptMolotov'],value:state.keybinds[type],maxLength:1,submit(value){
    const clean=sanitizeKeybind(value);if(!clean)return T[lang].keyInvalid;
    if(clean===state.keybinds[isGrenade?'molotov':'grenade'])return T[lang].keyConflict;
    state.keybinds[type]=clean;localStorage.setItem(storageKey,clean);applyLang();return '';
  }});
}
addEventListener('keydown',e=>{if(state.loading||ArtStudio.isOpen||menuDialog||['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName))return;if(e.key.toLowerCase()==='l'&&!e.repeat)changeLanguage();});


function rand(a,b){return Math.random()*(b-a)+a;}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function dist(ax,ay,bx,by){return Math.hypot(ax-bx,ay-by);}
function rectsOverlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function pointInRect(x,y,r){return x>=r.x&&y>=r.y&&x<=r.x+r.w&&y<=r.y+r.h;}
function circleRectCollision(cx,cy,r,rect){const nx=clamp(cx,rect.x,rect.x+rect.w),ny=clamp(cy,rect.y,rect.y+rect.h),dx=cx-nx,dy=cy-ny;return dx*dx+dy*dy<r*r;}
function pointInsideBuildingInterior(x,y,b){return x>b.x+6&&y>b.y+6&&x<b.x+b.w-6&&y<b.y+b.h-6;}
function px(v){return Math.round(v);}
function lineSegmentsIntersect(x1,y1,x2,y2,x3,y3,x4,y4){
  const den=(x1-x2)*(y3-y4)-(y1-y2)*(x3-x4);
  if(den===0) return false;
  const t=((x1-x3)*(y3-y4)-(y1-y3)*(x3-x4))/den;
  const u=((x1-x3)*(y1-y2)-(y1-y3)*(x1-x2))/den;
  return t>=0&&t<=1&&u>=0&&u<=1;
}
function lineIntersectsRect(x1,y1,x2,y2,r){
  if(pointInRect(x1,y1,r)||pointInRect(x2,y2,r)) return true;
  return lineSegmentsIntersect(x1,y1,x2,y2,r.x,r.y,r.x+r.w,r.y) ||
         lineSegmentsIntersect(x1,y1,x2,y2,r.x+r.w,r.y,r.x+r.w,r.y+r.h) ||
         lineSegmentsIntersect(x1,y1,x2,y2,r.x+r.w,r.y+r.h,r.x,r.y+r.h) ||
         lineSegmentsIntersect(x1,y1,x2,y2,r.x,r.y+r.h,r.x,r.y);
}


// Audio is implemented in audio.js; original PCM assets load before this file.

// ── World generation ──
function generateWorld(seed){Town.generate(seed);}

function blood(x,y,count=8,color='rgba(120,15,15,0.95)',force=1){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=rand(18,120)*force,life=rand(0.25,0.8);state.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life,maxLife:life,size:rand(1.5,3.5),color});}state.decals.push({x,y,r:rand(5,16),alpha:rand(0.12,0.3)});if(state.decals.length>260)state.decals.shift();}
function addDamageText(x,y,value,color){
  state.damageTexts.push({
    x:x+rand(-6,6),
    y:y+rand(-4,4),
    amount:Math.max(1,Math.round(value)),
    color,
    life:0.7,
    maxLife:0.7,
    dx:rand(-10,10),
    vy:rand(-38,-28)
  });
}

function pushOutCircleRect(obj,rect){const nx=clamp(obj.x,rect.x,rect.x+rect.w),ny=clamp(obj.y,rect.y,rect.y+rect.h);let dx=obj.x-nx,dy=obj.y-ny,d2=dx*dx+dy*dy;if(d2>=obj.radius*obj.radius)return false;if(d2===0){const left=Math.abs(obj.x-rect.x),right=Math.abs(rect.x+rect.w-obj.x),top=Math.abs(obj.y-rect.y),bottom=Math.abs(rect.y+rect.h-obj.y),min=Math.min(left,right,top,bottom);if(min===left)obj.x=rect.x-obj.radius;else if(min===right)obj.x=rect.x+rect.w+obj.radius;else if(min===top)obj.y=rect.y-obj.radius;else obj.y=rect.y+rect.h+obj.radius;return true;}const d=Math.sqrt(d2),overlap=obj.radius-d;obj.x+=(dx/d)*overlap;obj.y+=(dy/d)*overlap;return true;}
function collideWithBuildingWalls(obj,b){
  if(BUILDINGS_CLOSED){if(circleRectCollision(obj.x,obj.y,obj.radius,b))pushOutCircleRect(obj,b);return;}
  for(const r of getBuildingWallRects(b))if(circleRectCollision(obj.x,obj.y,obj.radius,r))pushOutCircleRect(obj,r);
}
function getBuildingWallRects(b){
  if(b.solid)return [b];
  const t=6;
  if(BUILDINGS_CLOSED)return [{x:b.x,y:b.y,w:b.w,h:t},{x:b.x,y:b.y+b.h-t,w:b.w,h:t},{x:b.x,y:b.y,w:t,h:b.h},{x:b.x+b.w-t,y:b.y,w:t,h:b.h}];
  if(b.door.y<b.y+1){
    return [
      {x:b.x,y:b.y,w:b.door.x-b.x,h:t},
      {x:b.door.x+b.door.w,y:b.y,w:b.x+b.w-(b.door.x+b.door.w),h:t},
      {x:b.x,y:b.y,w:t,h:b.h},
      {x:b.x+b.w-t,y:b.y,w:t,h:b.h},
      {x:b.x,y:b.y+b.h-t,w:b.w,h:t}
    ].filter(r=>r.w>0&&r.h>0);
  } else if(b.door.y>b.y+b.h-15){
    return [
      {x:b.x,y:b.y+b.h-t,w:b.door.x-b.x,h:t},
      {x:b.door.x+b.door.w,y:b.y+b.h-t,w:b.x+b.w-(b.door.x+b.door.w),h:t},
      {x:b.x,y:b.y,w:t,h:b.h},
      {x:b.x+b.w-t,y:b.y,w:t,h:b.h},
      {x:b.x,y:b.y,w:b.w,h:t}
    ].filter(r=>r.w>0&&r.h>0);
  } else if(b.door.x<b.x+1){
    return [
      {x:b.x,y:b.y,w:t,h:b.door.y-b.y},
      {x:b.x,y:b.door.y+b.door.h,w:t,h:b.y+b.h-(b.door.y+b.door.h)},
      {x:b.x,y:b.y,w:b.w,h:t},
      {x:b.x,y:b.y+b.h-t,w:b.w,h:t},
      {x:b.x+b.w-t,y:b.y,w:t,h:b.h}
    ].filter(r=>r.w>0&&r.h>0);
  }
  return [
    {x:b.x+b.w-t,y:b.y,w:t,h:b.door.y-b.y},
    {x:b.x+b.w-t,y:b.door.y+b.door.h,w:t,h:b.y+b.h-(b.door.y+b.door.h)},
    {x:b.x,y:b.y,w:b.w,h:t},
    {x:b.x,y:b.y+b.h-t,w:b.w,h:t},
    {x:b.x,y:b.y,w:t,h:b.h}
  ].filter(r=>r.w>0&&r.h>0);
}
function collideWithBuildings(obj){
  for(let pass=0;pass<2;pass++)for(const b of Town.obstacles({x:obj.x-obj.radius,y:obj.y-obj.radius,w:obj.radius*2,h:obj.radius*2})){
    if(!circleRectCollision(obj.x,obj.y,obj.radius,b))continue;
    if(b.solid)pushOutCircleRect(obj,b);else collideWithBuildingWalls(obj,b);
  }
}
function softSeparate(a,b,strength=0.35){
  const dx=a.x-b.x,dy=a.y-b.y;
  let d=Math.hypot(dx,dy);
  const minDist=(a.radius||0)+(b.radius||0);
  if(d===0){
    const ang=Math.random()*Math.PI*2;
    const push=minDist*0.5;
    a.x+=Math.cos(ang)*push;
    a.y+=Math.sin(ang)*push;
    b.x-=Math.cos(ang)*push;
    b.y-=Math.sin(ang)*push;
    return;
  }
  if(d>=minDist) return;
  const overlap=minDist-d;
  const nx=dx/d,ny=dy/d;
  const push=overlap*strength;
  a.x+=nx*push;
  a.y+=ny*push;
  b.x-=nx*push;
  b.y-=ny*push;
}
function updateBuildingRoofs(){for(const b of WORLD.buildings){const inside=!BUILDINGS_CLOSED&&pointInsideBuildingInterior(player.x,player.y,b);b.roofAlpha+=((inside?0.14:1)-b.roofAlpha)*0.12;}}

function moveWithWallCollision(obj,dx,dy){
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/4));
  const stepX=dx/steps,stepY=dy/steps;
  for(let i=0;i<steps;i++){
    obj.x+=stepX;
    obj.x=clamp(obj.x,obj.radius+2,WORLD.w-(obj.radius+2));
    collideWithBuildings(obj);
    obj.y+=stepY;
    obj.y=clamp(obj.y,obj.radius+2,WORLD.h-(obj.radius+2));
    collideWithBuildings(obj);
  }
}

function triggerRocketJump(explosionX,explosionY,maxRadius){
  let dx=player.x-explosionX,dy=player.y-explosionY;
  let d=Math.hypot(dx,dy);
  if(d===0){
    const ang=Math.atan2(player.dashVY||0,player.dashVX||0)||Math.atan2(player.y-explosionY+0.01,player.x-explosionX+0.01)||0;
    dx=Math.cos(ang);
    dy=Math.sin(ang);
    d=1;
  }
  const nx=dx/d,ny=dy/d;
  const proximity=clamp(1-(d/Math.max(1,maxRadius)),0,1);
  const jumpSpeed=ROCKET_JUMP_BASE_SPEED+ROCKET_JUMP_BONUS_SPEED*proximity;
  player.rocketJumpTime=ROCKET_JUMP_DURATION;
  player.rocketJumpVX=nx*jumpSpeed;
  player.rocketJumpVY=ny*jumpSpeed;
  player.dashTime=0;
  player.dashVX=0;
  player.dashVY=0;
  player.hurtTimer=0;
  if(player.rocketJumpVX<0) player.faceDir=-1; else if(player.rocketJumpVX>0) player.faceDir=1;
  state.cameraShake=Math.max(state.cameraShake,8);
  state.screenFlash=Math.max(state.screenFlash,0.26);
  for(let i=0;i<16;i++){
    state.particles.push({x:player.x+rand(-4,4),y:player.y+rand(-4,4),vx:nx*rand(30,90)+rand(-50,50),vy:ny*rand(30,90)+rand(-50,50),life:rand(0.18,0.4),maxLife:0.4,size:rand(3,6),color:Math.random()>0.5?'rgba(255,190,90,0.45)':'rgba(120,120,120,0.35)',drag:0.93});
  }
}

function getPlayerJumpVisual(){
  if(player.rocketJumpTime<=0) return {lift:0, shadowScale:0.86, shadowAlpha:0.2};
  const progress=1-(player.rocketJumpTime/ROCKET_JUMP_DURATION);
  const arc=Math.sin(progress*Math.PI);
  return {lift:arc*48, shadowScale:0.86-arc*0.22, shadowAlpha:0.2};
}

function getWeaponName(){return T[lang][player.weapon]||T[lang].shotgun;}
function reserveKey(kind=player.weapon){return kind==='flamethrower'?'flameAmmo':kind+'Ammo';}
function getReserveText(){return player.weapon==='shotgun'?'∞':String(player[reserveKey()]||0);}
function updateHUD(){
  const text=(id,value)=>{const el=$(id);if(el&&el.textContent!==String(value))el.textContent=value;};
  text('kills',state.kills);text('score',Math.floor(state.score));text('hp',Math.max(0,Math.floor(player.hp)));text('maxHp','/ '+player.maxHp);
  text('ammo',player.reloadTimer>0?T[lang].reload:`${player.mag} / ${player.magSize}`);text('weapon',getWeaponName());text('reserve',getReserveText());
  text('grenades',`${state.keybinds.grenade} ${player.grenades} · ${state.keybinds.molotov} ${player.molotovs}`);text('time',formatTime(state.surviveTime));text('wave',state.wave);text('best',state.best);text('menuBest',Math.floor(state.best));
  $('healthFill').style.width=clamp(player.hp/player.maxHp*100,0,100)+'%';$('vitals').classList.toggle('critical',player.hp/player.maxHp<=.25);
  $('ammoFill').style.width=100*clamp(player.reloadTimer>0?1-player.reloadTimer/WEAPONS[player.weapon].reload:player.mag/player.magSize,0,1)+'%';
  $('ammoFill').parentElement?.classList.toggle('reloading',player.reloadTimer>0);
}

// ── Session lifecycle ──
function resetGame(seed){FrameStats.reset();DevHorde.reset();Burning.clear(player);closeMenuDialog();state.keys.clear();mouseDown=false;generateWorld(seed);BossAttack.reset();PixelArt.reset();Arsenal.reset();Lighting.reset();AudioEngine.reset();Weather.reset();state.menuScreen='main';state.overlayScreen='none';state.running=true;$('overlay').classList.add('hidden');updateCursorVisibility(); const tipEl=$('tip'); if(tipEl) tipEl.style.display='none';state.gameOver=false;state.paused=false;ensureAudio();startBGM();setBGMLevel(0.05);state.pellets=[];state.zombies=[];state.particles=[];state.decals=[];state.pickups=[];state.grenades=[];state.explosions=[];state.airdrops=[];state.rockets=[];state.flameParticles=[];state.fireZones=[];state.damageTexts=[];state.wave=1;state.kills=0;state.score=0;state.surviveTime=0;state.spawnTimer=0;state.waveTimer=0;state.screenFlash=0;state.cameraShake=0;state.bossSpawned=false;state.bossAnnouncement=0;state.airdropAnnouncement=0;state.buffAnnouncement='';state.buffAnnouncementType='upgrade';state.buffAnnouncementTimer=0;state.airdropTimer=35;state.militaryAirdropTimer=60;state.airdropAnnouncementType='standard';state.deathAnim=0;state.time=0;state.nextBossTime=90;player.dead=false;player.downed=false;player.downRemaining=0;player.reviveProgress=0;player.reviverId=null;player.reviveShield=0;player.score=0;player.kills=0;player.x=WORLD.w/2;player.y=WORLD.h/2;player.speedMul=1;player.damageMul=1;player.hp=player.maxHp;player.grenades=1;player.molotovs=0;player.shootCooldown=0;player.reloadTimer=0;player.wasReloading=false;player.dashCooldown=0;player.dashTime=0;player.hurtTimer=0;player.dashVX=0;player.dashVY=0;player.rocketJumpTime=0;player.rocketJumpVX=0;player.rocketJumpVY=0;player.knockbackTime=0;player.knockbackVX=0;player.knockbackVY=0;player.dashFacing=0;player.dashSpinDir=1;player.faceDir=1;player.weapon='shotgun';player.mag=6;player.magSize=6;player.gatlingAmmo=0;player.rocketAmmo=0;player.flameAmmo=0;player.arcAmmo=0;if($('devStormAuto'))$('devStormAuto').checked=true;$('overlay').classList.add('hidden');    updateHUD();updateLoadingUI();updateDevPanel();updateGameUI();}
function endGame(){if(Coop.die())return;if(state.gameOver)return;FrameStats.suspend();DevHorde.reset();Burning.clear(player);PixelArt.playerDeath();Arsenal.stop();Weather.arm(false);AudioEngine.silenceCombat();state.running=false;state.gameOver=true;updateCursorVisibility();state.paused=false;setBGMLevel(0.024);state.deathAnim=1.8;state.keys.clear();mouseDown=false;if(state.score>state.best){state.best=state.score;savePersonalBest();}submitLeaderboardScore(state.score);updateDevPanel();}
function goToMainMenu(){if(Coop.client){Net.leave();return;}FrameStats.suspend();DevHorde.reset();Burning.clear(player);closeMenuDialog();BossAttack.reset();PixelArt.reset();Arsenal.reset();AudioEngine.reset();Weather.reset();state.menuScreen='main';state.overlayScreen='main';state.running=false;state.gameOver=false;state.paused=false;setBGMLevel(0.024);state.deathAnim=0;mouseDown=false;state.keys.clear(); const tipEl=$('tip'); if(tipEl) tipEl.style.display=''; applyLang();$('overlay').classList.remove('hidden');loadLeaderboard(true);syncPlayerBest();updateDevPanel();updateGameUI();}
function showGameOverOverlay(){state.overlayScreen='gameover';applyLang();$('overlay').classList.remove('hidden');}
function togglePause(){
  if(Coop.client){Net.toggleMenu();return;}
  if(ArtStudio.isOpen)return;
  if(!state.running||state.gameOver) return;
  state.paused=!state.paused;FrameStats.suspend();updateCursorVisibility();
  mouseDown=false;
  if(state.paused) state.keys.clear();
  ensureAudio(); startBGM(); setBGMLevel(state.paused?0.018:0.05); playMenuClick(); updateGameUI();
  if(state.paused)renderPauseMenu();else{state.overlayScreen='none';$('overlay').classList.add('hidden');}
}


// ── Enemies and supplies ──
function zombieBase(type){
  if(type==='walker')return{radius:14,speed:rand(36,52)+state.wave*2.2,hp:45+state.wave*4,damage:28+state.wave*0.7,score:10,skin:'#7f8974',shirt:'#54463f',touchTimer:0,touchCooldown:0.55,touchDamageMul:0.12};
  if(type==='runner')return{radius:12,speed:rand(76,102)+state.wave*3.2,hp:30+state.wave*2,damage:24+state.wave*0.6,score:12,skin:'#a48f7e',shirt:'#3d3f42',touchTimer:0,touchCooldown:0.4,touchDamageMul:0.13};
  if(type==='bloater')return{radius:18,speed:rand(24,34)+state.wave*1.5,hp:110+state.wave*12,damage:34+state.wave*0.9,score:22,skin:'#747d63',shirt:'#4d3d33',touchTimer:0,touchCooldown:0.7,touchDamageMul:0.14};
  if(type==='crawler')return{radius:10,speed:rand(44,68)+state.wave*2.3,hp:34+state.wave*3,damage:22+state.wave*0.6,score:14,skin:'#8e6f67',shirt:'#5a5044',crawl:true,touchTimer:0,touchCooldown:0.42,touchDamageMul:0.12};
  if(type==='pouncer')return{radius:12,speed:rand(58,78)+state.wave*2.8,hp:38+state.wave*3,damage:30+state.wave*0.8,score:20,skin:'#9a9189',shirt:'#35312f',pounceCd:rand(1.5,2.8),pounceTime:0,vx:0,vy:0,touchTimer:0,touchCooldown:0.5,touchDamageMul:0.13};
  if(type==='charger')return{radius:16,speed:58+state.wave*2.1,hp:160+state.wave*14,damage:36+state.wave*1.0,score:36,skin:'#8e8675',shirt:'#5d4338',touchTimer:0,touchCooldown:0.75,touchDamageMul:0.10,state:'approach',chargeTimer:0,chargeWindup:0.7,chargeDirX:0,chargeDirY:0,chargeSpeed:470.4,chargeDuration:0.96,chargeTravel:0,carryTime:0,carrying:false,wallHit:false};
  if(type==='boss')return{radius:34,speed:42+state.wave*1.2,hp:2200+state.wave*180,maxHp:2200+state.wave*180,damage:52+state.wave*1.2,score:500,skin:'#6d7262',shirt:'#4b2626',boss:true,bossPhase:'approach',slamCooldown:2.5,bossTimer:0,lift:0,touchTimer:0,touchCooldown:0.6,touchDamageMul:0.13};
}
function spawnCharger(dev=false){
  let x,y,tries=0;
  do{
    if(dev){x=player.x+rand(-220,220); y=player.y+rand(-220,220);} else {
      const side=Math.floor(Math.random()*4),margin=90;
      if(side===0){x=-margin;y=rand(0,WORLD.h);}else if(side===1){x=WORLD.w+margin;y=rand(0,WORLD.h);}else if(side===2){x=rand(0,WORLD.w);y=-margin;}else{x=rand(0,WORLD.w);y=WORLD.h+margin;}
    }
    x=clamp(x,30,WORLD.w-30); y=clamp(y,30,WORLD.h-30); tries++;
  }while((Town.blocked(x,y,21)||dist(x,y,player.x,player.y)<120)&&tries<120);
  if(Town.blocked(x,y,21)||dist(x,y,player.x,player.y)<120)return;
  state.zombies.push({id:state.nextEntityId++,type:'charger',x,y,...zombieBase('charger')});
}
function spawnDevBloater(){
  let angle=Math.random()*Math.PI*2;
  let spawnDist=rand(150,240);
  let x=clamp(player.x+Math.cos(angle)*spawnDist,40,WORLD.w-40);
  let y=clamp(player.y+Math.sin(angle)*spawnDist,40,WORLD.h-40);
  let tries=0;
  while((Town.blocked(x,y,21)||dist(x,y,player.x,player.y)<120)&&tries<80){
    angle=Math.random()*Math.PI*2;
    spawnDist=rand(150,240);
    x=clamp(player.x+Math.cos(angle)*spawnDist,40,WORLD.w-40);
    y=clamp(player.y+Math.sin(angle)*spawnDist,40,WORLD.h-40);
    tries++;
  }
  if(Town.blocked(x,y,21)||dist(x,y,player.x,player.y)<120)return;
  state.zombies.push({id:state.nextEntityId++,type:'bloater',x,y,...zombieBase('bloater')});
}
function spawnZombie(){
  if(Coop.server&&state.zombies.length>=180)return;
  let x,y,valid=false;for(let attempt=0;attempt<24;attempt++){
    const side=Math.floor(Math.random()*4),margin=30;
    if(side===0){x=margin;y=rand(margin,WORLD.h-margin);}else if(side===1){x=WORLD.w-margin;y=rand(margin,WORLD.h-margin);}else if(side===2){x=rand(margin,WORLD.w-margin);y=margin;}else{x=rand(margin,WORLD.w-margin);y=WORLD.h-margin;}
    if(!Town.blocked(x,y,22)&&Coop.living().every(p=>dist(x,y,p.x,p.y)>=480)){valid=true;break;}
  }if(!valid)return;
  const roll=Math.random(),type=roll<0.46?'walker':roll<0.70?'runner':roll<0.84?'crawler':roll<0.93?'bloater':roll<0.985?'pouncer':'charger';
  state.zombies.push({id:state.nextEntityId++,type,x,y,...zombieBase(type)});
}
function spawnBoss(dev=false){
  let x,y,tries=0,valid=false;
  do{
    if(dev){const a=rand(0,Math.PI*2),d=rand(240,340);x=clamp(player.x+Math.cos(a)*d,38,WORLD.w-38);y=clamp(player.y+Math.sin(a)*d,38,WORLD.h-38);}
    else{x=rand(120,WORLD.w-120);y=rand(120,WORLD.h-120);}
    valid=!Town.blocked(x,y,37)&&dist(x,y,player.x,player.y)>=(dev?180:700);tries++;
  }while(!valid&&tries<300);
  if(!valid)return;
  state.bossSpawned=true;state.bossAnnouncement=3;
  state.zombies.push({id:state.nextEntityId++,type:'boss',x,y,...zombieBase('boss')});
}
function spawnAirdrop(kind='standard',dev=false){
  if(!AIRDROP_LOOT[kind]||state.airdrops.some(a=>(a.kind||'standard')===kind))return null;
  let x,y,valid=false;
  for(let tries=0;tries<300;tries++){
    if(dev){const angle=rand(0,Math.PI*2),distance=rand(200,280);x=clamp(player.x+Math.cos(angle)*distance,60,WORLD.w-60);y=clamp(player.y+Math.sin(angle)*distance,60,WORLD.h-60);}
    else{x=rand(120,WORLD.w-120);y=rand(120,WORLD.h-120);}
    valid=!Town.blocked(x,y,38)&&dist(x,y,player.x,player.y)>=(dev?160:380)&&!state.airdrops.some(a=>dist(a.x,a.y,x,y)<100);
    if(valid)break;
  }
  if(!valid)return null;
  const pool=AIRDROP_LOOT[kind],loot=pool[Math.floor(Math.random()*pool.length)];
  const drop={kind,loot,x,y,landed:false,fallY:y-320,smoke:0,parachute:true,beaconPhase:rand(0,1.4)};
  state.airdrops.push(drop);state.airdropAnnouncement=3;state.airdropAnnouncementType=kind;return drop;
}
function giveAirdropWeapon(choice=null,kind='standard'){
  const options=AIRDROP_LOOT[kind]||AIRDROP_LOOT.standard;choice=choice||options[Math.floor(Math.random()*options.length)];
  if(choice==='drone')Arsenal.deploy();else setWeaponLoadout(choice);
  state.buffAnnouncement=(lang==='zh'?'空投：':'Airdrop: ')+T[lang][choice];state.buffAnnouncementType='equipment';state.buffAnnouncementTimer=2.6;Coop.emit('notice',{id:player.id,kind:'equipment',value:choice});return choice;
}

function camera(){if(Coop.client&&player.hp<=0&&!player.downed){const p=Coop.living()[0]||player;return {x:clamp(p.x-SW/2,0,Math.max(0,WORLD.w-SW)),y:clamp(p.y-SH/2,0,Math.max(0,WORLD.h-SH))};}const shakeX=state.cameraShake>0?Math.sin(state.time*113.3)*state.cameraShake:0,shakeY=state.cameraShake>0?Math.cos(state.time*137.7)*state.cameraShake:0;return{x:clamp(player.x-SW/2+shakeX,0,WORLD.w-SW),y:clamp(player.y-SH/2+shakeY,0,WORLD.h-SH)};}
function worldToScreen(wx,wy,cam){return{x:wx-cam.x,y:wy-cam.y};}

// ── Weapons and damage ──
// Keep muzzle-born projectiles on the near side of walls, including sealed doors.
function safeMuzzle(mx,my,source=player){
  const walls=Town.walls({x:Math.min(mx,source.x)-1,y:Math.min(my,source.y)-1,w:Math.abs(mx-source.x)+2,h:Math.abs(my-source.y)+2}),steps=Math.max(1,Math.ceil(Math.hypot(mx-source.x,my-source.y)/2));
  let x=source.x,y=source.y;
  for(let i=1;i<=steps;i++){const nx=source.x+(mx-source.x)*i/steps,ny=source.y+(my-source.y)*i/steps;
    if(walls.some(r=>lineIntersectsRect(x,y,nx,ny,r)))break;x=nx;y=ny;}
  return {x,y};
}
function shoot(){
  if(player.hp<=0)return;
  if(!state.running||state.gameOver||player.shootCooldown>0||player.reloadTimer>0||player.mag<=0)return;
  const kind=player.weapon,spec=WEAPONS[kind],aim=PixelArt.aimPose(player,camera());
  const origin=safeMuzzle(aim.muzzleX,aim.muzzleY);player.shotSerial=(player.shotSerial||0)+1;PixelArt.shot(aim.angle,kind);
  if(kind!=='arc')Lighting.flash(aim.angle,kind,origin);
  player.mag--;player.shootCooldown=spec.cooldown;
  state.cameraShake=Math.max(state.cameraShake,kind==='shotgun'?3.5:kind==='gatling'?1.6:kind==='rocket'?2:0);
  Arsenal.fire(kind,origin,aim.angle,{x:aim.targetX,y:aim.targetY});
  if(kind!=='shotgun'&&player[reserveKey(kind)]<=0&&player.mag<=0){player.weapon='shotgun';player.magSize=6;player.mag=6;player.reloadTimer=0;player.wasReloading=false;}
}
function startReload(){
  if(player.reloadTimer>0||player.mag===player.magSize||(player.weapon!=='shotgun'&&player[reserveKey()]<=0))return;
  player.reloadTimer=WEAPONS[player.weapon].reload;player.wasReloading=true;playReload(player.weapon);
}
function throwThrowable(kind='grenade'){
  if(!state.running||state.gameOver||player.hp<=0)return;
  const isMolotov=kind==='molotov';
  if(isMolotov&&player.molotovs<=0)return;
  if(!isMolotov&&player.grenades<=0)return;
  const cam=camera(),aim=Coop.aim(player,cam),worldMouseX=aim.x,worldMouseY=aim.y;
  let dx=worldMouseX-player.x,dy=worldMouseY-player.y;
  const maxDist=isMolotov?420:340;
  const d=Math.hypot(dx,dy)||1;
  if(d>maxDist){dx=dx/d*maxDist;dy=dy/d*maxDist;}
  const targetX=clamp(player.x+dx,10,WORLD.w-10),targetY=clamp(player.y+dy,10,WORLD.h-10);
  if(isMolotov)player.molotovs--;else player.grenades--;
  playThrow();
  state.grenades.push({owner:player.id||'player',damageMul:player.damageMul,type:isMolotov?'molotov':'grenade',x:player.x,y:player.y,startX:player.x,startY:player.y,targetX,targetY,progress:0,timer:isMolotov?0.82:0.95,total:isMolotov?0.82:0.95,radius:5,arc:isMolotov?62:54,drawX:player.x,drawY:player.y,height:0});
}
// Persistent ground fire belongs only to an actual Molotov impact.
function createMolotovFire(g){const zone={x:g.x,y:g.y,radius:96,life:6,maxLife:6,hitTick:0,damageMul:g.damageMul??player.damageMul,owner:g.owner||'player',creditPlayer:g.creditPlayer!==false,source:g.source||'molotov'};state.fireZones.push(zone);for(let k=0;k<46;k++){const a=Math.random()*Math.PI*2,s=rand(40,220),life=rand(0.35,0.9);state.particles.push({x:g.x,y:g.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-rand(20,80),life,maxLife:life,size:rand(3,8),color:Math.random()>0.45?'rgba(255,210,70,0.95)':'rgba(255,120,30,0.85)',drag:0.93});}for(let k=0;k<24;k++){const life=rand(0.8,1.8);state.particles.push({x:g.x+rand(-12,12),y:g.y+rand(-8,8),vx:rand(-20,20),vy:rand(-65,-20),life,maxLife:life,size:rand(8,18),color:'rgba(70,70,70,0.32)',drag:0.97,floaty:true});}state.explosions.push({x:g.x,y:g.y,radius:0,maxRadius:84,life:0.34,maxLife:0.34,ring:0,rocket:false,molotov:true});state.cameraShake=Math.max(state.cameraShake,5);state.screenFlash=Math.max(state.screenFlash,0.18);playBoom(g.x,g.y,'molotov');return zone;}
// Snapshot area-damage targets: chained deaths may remove earlier array entries.
function explode(g,kind='normal'){const rocket=kind==='rocket';const molotov=kind==='molotov';if(molotov)return createMolotovFire(g);state.explosions.push({x:g.x,y:g.y,radius:0,maxRadius:rocket?150:128,life:rocket?0.56:0.42,maxLife:rocket?0.56:0.42,ring:0,rocket});for(let k=0;k<(rocket?42:26);k++){const a=Math.random()*Math.PI*2,s=rand(70,rocket?340:260);state.particles.push({x:g.x,y:g.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rocket?rand(0.35,0.6):0.35,maxLife:rocket?0.6:0.35,size:rand(2,rocket?6:5),color:Math.random()>0.45?'rgba(255,150,60,0.95)':'rgba(80,80,80,0.65)'});}for(let k=0;k<22;k++){const a=Math.random()*Math.PI*2,s=rand(20,95);state.particles.push({x:g.x+rand(-8,8),y:g.y+rand(-8,8),vx:Math.cos(a)*s,vy:Math.sin(a)*s-rand(10,45),life:rand(0.65,1.2),maxLife:rand(0.65,1.2),size:rand(6,12),color:'rgba(70,70,70,0.55)'});}for(let k=0;k<36;k++){const a=Math.random()*Math.PI*2,s=rand(10,55);const life=rand(0.9,1.8);state.particles.push({x:g.x+rand(-10,10),y:g.y+rand(-10,10),vx:Math.cos(a)*s,vy:Math.sin(a)*s-rand(22,70),life,maxLife:life,size:rand(8,18),color:Math.random()>0.5?'rgba(65,65,65,0.58)':'rgba(110,110,110,0.32)',drag:0.965,floaty:true});}for(let k=0;k<18;k++){const life=rand(1.2,2.1);state.particles.push({x:g.x+rand(-14,14),y:g.y+rand(-10,10),vx:rand(-18,18),vy:rand(-55,-22),life,maxLife:life,size:rand(10,22),color:'rgba(58,58,58,0.26)',drag:0.975,floaty:true});}state.cameraShake=Math.max(state.cameraShake,rocket?9:14);state.screenFlash=Math.max(state.screenFlash,rocket?0.34:0.28);playBoom(g.x,g.y,kind);blood(g.x,g.y,20,'rgba(180,60,24,0.95)',1.5);const rad=rocket?150:128;
  Coop.each(()=>{
  const pd=dist(player.x,player.y,g.x,g.y);
  if(g.owner!=='drone'&&pd<rad+player.radius&&Town.lineClear(g.x,g.y,player.x,player.y)){
    if(rocket) triggerRocketJump(g.x,g.y,rad);
    else {
      const baseDamage=rocket?175:125;
      const dealt=Math.max(rocket?80:30,baseDamage-pd*0.78);
      const selfDamage=dealt*SELF_EXPLOSIVE_DAMAGE_MULT;
      damagePlayer(selfDamage,g.x,g.y,{ignoreInvincibility:true});
    }
  }
  });
  for(const z of [...state.zombies].reverse()){if(z.hp<=0||!state.zombies.includes(z)||BossAttack.airborne(z))continue;const d=dist(g.x,g.y,z.x,z.y);if(d<rad&&Town.lineClear(g.x,g.y,z.x,z.y)){let dealt;if(rocket&&z.type==='boss'){dealt=Math.max(140,300-d*0.6)*(g.damageMul??player.damageMul);}else{dealt=Math.max(rocket?80:30,(rocket?175:125)-d*0.78)*(g.damageMul??player.damageMul);}z.hp-=dealt;PixelArt.hit(z);playHit(z.x,z.y,rocket?'rocket':'grenade');addDamageText(z.x+rand(-8,8),z.y-z.radius-10,dealt,'#ffd84d');if(z.hp<=0){handleZombieDeath(state.zombies.indexOf(z),true,'normal',g.owner||player.id||'player');}}}}
function maybeSpawnPickup(x,y){const r=Math.random();if(r<0.04)state.pickups.push({type:'med',x,y,radius:8,ttl:40});else if(r<0.09)state.pickups.push({type:'grenade',x,y,radius:8,ttl:40});else if(r<0.135)state.pickups.push({type:'molotov',x,y,radius:10,phase:Math.random()*Math.PI*2,ttl:40});}
function damagePlayer(amount,sourceX=null,sourceY=null,options={}){if(state.gameOver||player.hp<=0||amount<=0||player.reviveShield>0)return;const ignoreInvincibility=!!options.ignoreInvincibility;if((!ignoreInvincibility&&(player.hurtTimer>0||player.dashTime>0||player.rocketJumpTime>0))||state.deathAnim>0)return;player.hp-=amount;PixelArt.hit(player);AudioEngine.variant('hit',3,{volume:0.3,group:'hurt',interval:0.15});addDamageText(player.x+rand(-8,8),player.y-player.radius-10,amount,'#ff6767');player.hurtTimer=0.28;const isBossHit=sourceX!==null&&sourceY!==null&&state.zombies.some(z=>z.type==='boss'&&dist(z.x,z.y,sourceX,sourceY)<160);state.cameraShake=Math.max(state.cameraShake,options.fire ? .35 : isBossHit ? 9 : 1.8);state.screenFlash=Math.max(state.screenFlash,isBossHit?0.24:0.14);if(!options.fire)blood(player.x,player.y,12,'rgba(150,24,24,0.95)',1.1);if(player.hp<=0){player.hp=0;endGame();}}

// ── Keyboard and mouse input ──
let mouseDown=false;
addEventListener('mousemove',e=>{state.mouse.x=e.clientX;state.mouse.y=e.clientY;});
addEventListener('mousedown',e=>{
  if((Coop.client&&SquadUI.typing)||ArtStudio.isOpen||e.target!==canvas||e.button!==0||!state.running||state.gameOver||state.paused)return;
  ensureAudio();startBGM();state.mouse.x=e.clientX;state.mouse.y=e.clientY;
  if(Weather.armed&&state.devMode){const cam=camera();Weather.arm(false);devStrike(cam.x+e.clientX,cam.y+e.clientY);mouseDown=false;updateDevPanel();return;}
  mouseDown=true;if(Coop.client)Net.action('shoot');
});
addEventListener('mouseup',()=>{mouseDown=false;if(Coop.client)Net.flushInput();});
addEventListener('keydown',e=>{if(state.loading||ArtStudio.isOpen||menuDialog) return;
  if(e.target&&['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault();
  const k=e.key.toLowerCase();
  if(e.key==='Escape'&&Weather.armed){Weather.arm(false);updateDevPanel();return;}
  if(state.gameOver&&state.deathAnim===0){return;}
  if((k==='p'||e.key==='Escape')&&state.running&&!state.gameOver){if(!e.repeat)togglePause();return;}
  if(state.paused) return;
  state.keys.add(k);
  if(e.key==='Shift') state.keys.add('shift');
  if(Coop.client){if(!e.repeat){if(k==='shift')Net.action('dash');if(k==='r')Net.action('reload');if(k===state.keybinds.grenade.toLowerCase())Net.action('grenade');if(k===state.keybinds.molotov.toLowerCase())Net.action('molotov');Net.flushInput();}return;}
  if(k==='r') startReload();
  if(k===state.keybinds.grenade.toLowerCase()) throwThrowable('grenade');
  if(k===state.keybinds.molotov.toLowerCase()) throwThrowable('molotov');
});
addEventListener('keyup',e=>{state.keys.delete(e.key.toLowerCase());if(e.key==='Shift')state.keys.delete('shift');if(Coop.client)Net.flushInput();});

// ── Enemy behavior ──
function updateCharger(z,dt){
  const dx=player.x-z.x,dy=player.y-z.y,d=Math.hypot(dx,dy)||1;
  if(z.state==='approach'){
    Town.chase(z,dt);
    if(d<170&&Town.lineClear(z.x,z.y,player.x,player.y,z.radius)){
      z.state='windup';
      z.chargeTimer=z.chargeWindup;
      z.chargeDirX=dx/d;
      z.chargeDirY=dy/d;
    }
  } else if(z.state==='windup'){
    z.chargeTimer-=dt;
    if(z.chargeTimer<=0){
      const nd=Math.hypot(player.x-z.x,player.y-z.y)||1;
      z.chargeDirX=(player.x-z.x)/nd;
      z.chargeDirY=(player.y-z.y)/nd;
      z.state='charge';
      z.chargeTimer=z.chargeDuration;
      z.chargeTravel=0;
      z.carrying=false;
      z.wallHit=false;
    }
  } else if(z.state==='charge'){
    const stepX=z.chargeDirX*z.chargeSpeed*dt;
    const stepY=z.chargeDirY*z.chargeSpeed*dt;
    const prevX=z.x,prevY=z.y;
    moveWithWallCollision(z,stepX,stepY);
    const moved=Math.hypot(z.x-prevX,z.y-prevY);
    z.chargeTravel+=moved;
    z.chargeTimer-=dt;
    if(!z.carrying && player.dashTime<=0 && player.rocketJumpTime<=0 && dist(z.x,z.y,player.x,player.y)<z.radius+player.radius+3){
      z.carrying=true;
      z.carryTime=0.32;
      damagePlayer(z.damage*0.09,z.x,z.y,{ignoreInvincibility:true});
    }
    if(z.carrying){
      const carryX=z.x+z.chargeDirX*(z.radius+player.radius-1);
      const carryY=z.y+z.chargeDirY*(z.radius+player.radius-1);
      const oldPX=player.x, oldPY=player.y;
      player.x=carryX; player.y=carryY; collideWithBuildings(player);
      if(Math.hypot(player.x-carryX,player.y-carryY)>1.5){
        z.wallHit=true;
      }
      if(z.wallHit){
        damagePlayer(z.damage*0.31,z.x,z.y,{ignoreInvincibility:true});
        launchPlayerKnockback(z.chargeDirX,z.chargeDirY,360,0.32);
        z.carrying=false;
        z.state='recover';
        z.chargeTimer=0.55;
      }
    }
    if(z.chargeTimer<=0 || z.chargeTravel>=450){
      if(z.carrying){
        launchPlayerKnockback(z.chargeDirX,z.chargeDirY,420,0.42);
        z.carrying=false;
      }
      z.state='recover';
      z.chargeTimer=0.8;
    }
  } else if(z.state==='recover'){
    z.chargeTimer-=dt;
    if(z.chargeTimer<=0) z.state='approach';
  }
}


function launchPlayerKnockback(dirX,dirY,speed,time){
  player.rocketJumpTime=0;
  player.rocketJumpVX=0;
  player.rocketJumpVY=0;
  player.knockbackTime=time;
  player.knockbackVX=dirX*speed;
  player.knockbackVY=dirY*speed;
  if(player.knockbackVX<0) player.faceDir=-1; else if(player.knockbackVX>0) player.faceDir=1;
}

// ── Simulation ──
function updateSurvivor(dt){
  player.reviveShield=Math.max(0,(player.reviveShield||0)-dt);
  if(player.downed){SurvivorMotion.step(player,dt,{keys:state.keys,aimX:player.aimX});return;}
  if(player.hp<=0)return;
  let pressedShot=false,pressedDash=false;
  if(Coop.server){
    state.buffAnnouncementTimer=Math.max(0,state.buffAnnouncementTimer-dt);
    state.cameraShake=Math.max(0,state.cameraShake-dt*18);state.screenFlash=Math.max(0,state.screenFlash-dt*1.2);
    const actions=player.input?.actions||[];if(player.input)player.input.actions=[];
    for(const action of actions){if(action==='shoot')pressedShot=true;else if(action==='dash')pressedDash=true;else if(action==='reload')startReload();else if(action==='grenade'||action==='molotov')throwThrowable(action);}
  }
  player.shootCooldown=Math.max(0,player.shootCooldown-dt);player.reloadTimer=Math.max(0,player.reloadTimer-dt);player.hurtTimer=Math.max(0,player.hurtTimer-dt);
  if(player.wasReloading&&player.reloadTimer===0){
    player.wasReloading=false;
    if(player.weapon==='shotgun')player.mag=player.magSize;
    else {const key=reserveKey(),load=Math.min(player.magSize-player.mag,player[key]||0);player.mag+=load;player[key]-=load;}
  }
  if(player.mag===0&&player.reloadTimer===0)startReload();
  const dashed=SurvivorMotion.step(player,dt,{keys:state.keys,dash:pressedDash,aimX:Coop.aim(player,camera()).x});
  if(dashed)playDash();
  if(player.dashTime>0&&player.rocketJumpTime<=0&&player.knockbackTime<=0&&Math.random()<.95){
    for(let d=0;d<2;d++)state.particles.push({x:player.x-rand(-6,6),y:player.y+10-rand(0,4),vx:rand(-40,40)-player.dashVX*.05,vy:rand(-18,6),life:rand(.18,.38),maxLife:.38,size:rand(4,7),color:Math.random()>.5?'rgba(168,142,98,0.34)':'rgba(110,102,88,0.30)',drag:.92,floaty:true});
  }
  if((mouseDown||pressedShot)&&!Weather.armed){shoot();if(player.mag===0&&player.reloadTimer<=0)startReload();}
}


function update(dt){
  if(Coop.client){Net.update(dt);return;}
  updateCursorVisibility();
  Weather.update(dt);
  if(state.gameOver){BossAttack.updateEffects(dt);PixelArt.updateDeaths(dt);Arsenal.effects(dt);state.cameraShake=Math.max(0,state.cameraShake-dt*10);state.deathAnim=Math.max(0,state.deathAnim-dt);if(state.deathAnim===0&&$('overlay').classList.contains('hidden'))showGameOverOverlay();return;}
  if(!state.running)return;
  if(state.paused)return;
  state.time+=dt;state.surviveTime+=dt;state.waveTimer+=dt;state.spawnTimer+=dt;state.airdropTimer-=dt;state.militaryAirdropTimer-=dt;state.buffAnnouncementTimer=Math.max(0,state.buffAnnouncementTimer-dt);state.cameraShake=Math.max(0,state.cameraShake-dt*18);state.screenFlash=Math.max(0,state.screenFlash-dt*1.2);state.bossAnnouncement=Math.max(0,state.bossAnnouncement-dt);state.airdropAnnouncement=Math.max(0,state.airdropAnnouncement-dt);
  if(state.waveTimer>=18){state.waveTimer=0;state.wave+=1;}
  if(state.surviveTime>=state.nextBossTime){spawnBoss();state.nextBossTime+=70;}
  if(state.airdropTimer<=0){state.airdropTimer=rand(50,75);spawnAirdrop('standard');}
  if(state.militaryAirdropTimer<=0){state.militaryAirdropTimer=rand(80,110);spawnAirdrop('military');}
  const spawnRate=Math.max(0.22,1.0-state.wave*0.05);while(state.spawnTimer>=spawnRate){state.spawnTimer-=spawnRate;spawnZombie();}
  for(const p of Coop.survivors())Coop.withPlayer(p,()=>updateSurvivor(dt));
  DevHorde.update(dt);
  Burning.update(dt);if(state.gameOver)return;
  Arsenal.update(dt);if(state.gameOver)return;
  const projectileTargets=Crowd.index(state.zombies);

  for(let i=state.airdrops.length-1;i>=0;i--){const a=state.airdrops[i];if(!a.landed){a.fallY+=190*dt; if(a.fallY>=a.y){a.fallY=a.y;a.landed=true;a.parachute=false;}}else{a.smoke+=dt;const recipient=Coop.nearest(a,p=>dist(a.x,a.y,p.x,p.y)<28);if(recipient)Coop.withPlayer(recipient,()=>{giveAirdropWeapon(a.loot||null,a.kind||'standard');state.airdrops.splice(i,1);playPickup();});}}
  for(let i=state.grenades.length-1;i>=0;i--){const g=state.grenades[i];g.timer-=dt;g.progress=clamp(1-g.timer/g.total,0,1);g.x=g.startX+(g.targetX-g.startX)*g.progress;g.y=g.startY+(g.targetY-g.startY)*g.progress;g.height=Math.sin(g.progress*Math.PI)*g.arc;g.drawX=g.x;g.drawY=g.y-g.height; if(g.timer<=0){g.x=g.targetX;g.y=g.targetY;g.drawX=g.targetX;g.drawY=g.targetY;explode(g,g.type==='molotov'?'molotov':'normal');state.grenades.splice(i,1);}}
  for(let i=state.explosions.length-1;i>=0;i--){const e=state.explosions[i];e.life-=dt;const t=1-e.life/e.maxLife;e.radius=e.maxRadius*t;e.ring=24+e.maxRadius*t*0.65;if(e.life<=0)state.explosions.splice(i,1);}for(let i=state.rockets.length-1;i>=0;i--){
    const r=state.rockets[i];r.life-=dt;const steps=Math.max(1,Math.ceil(Math.hypot(r.vx,r.vy)*dt/4));let done=false;
    for(let step=0;step<steps;step++){
      const x=r.x+r.vx*dt/steps,y=r.y+r.vy*dt/steps;
      if(Town.walls({x:x-4,y:y-4,w:8,h:8}).some(w=>circleRectCollision(x,y,4,w))){done=true;break;}
      r.x=x;r.y=y;
      if(dist(r.x,r.y,r.targetX,r.targetY)<14||r.x<0||r.y<0||r.x>WORLD.w||r.y>WORLD.h||projectileTargets.query(r.x,r.y,r.radius+2).some(z=>z.hp>0&&!BossAttack.airborne(z)&&dist(z.x,z.y,r.x,r.y)<z.radius+r.radius+2)){done=true;break;}
    }
    for(let t=0;t<2;t++)state.particles.push({x:r.x-r.vx*.01*t+rand(-1.5,1.5),y:r.y-r.vy*.01*t+rand(-1.5,1.5),vx:rand(-12,12),vy:rand(-12,12),life:rand(.18,.3),maxLife:.3,size:rand(2,4),color:Math.random()>.5?'rgba(255,180,90,0.75)':'rgba(80,80,80,0.5)',drag:.95});
    if(done||r.life<=0){explode({x:clamp(r.x,10,WORLD.w-10),y:clamp(r.y,10,WORLD.h-10),owner:r.owner,damageMul:r.damageMul},'rocket');state.rockets.splice(i,1);}
  }
  for(let i=state.fireZones.length-1;i>=0;i--){
    const zone=state.fireZones[i];zone.life-=dt;
    if(zone.life<=0){state.fireZones.splice(i,1);continue;}
    zone.hitTick=(zone.hitTick||0)-dt;const hit=zone.hitTick<=0,mult=zone.damageMul??player.damageMul;
    Coop.each(()=>{
    if(player.rocketJumpTime<=0&&dist(zone.x,zone.y,player.x,player.y)<zone.radius+player.radius&&Town.lineClear(zone.x,zone.y,player.x,player.y)){
      Burning.ignite(player);
      if(hit)damagePlayer(18*SELF_EXPLOSIVE_DAMAGE_MULT,zone.x,zone.y,{ignoreInvincibility:true,fire:true});
    }
    });
    for(const z of projectileTargets.query(zone.x,zone.y,zone.radius)){
      if(z.hp<=0||!state.zombies.includes(z)||BossAttack.airborne(z))continue;
      if(dist(zone.x,zone.y,z.x,z.y)<zone.radius+z.radius&&Town.lineClear(zone.x,zone.y,z.x,z.y)){
        Burning.ignite(z,mult,zone.creditPlayer!==false,zone.owner);if(hit)Burning.hitZombie(z,18*mult,mult,zone.creditPlayer!==false,true,zone.owner);
      }
    }
    if(hit)zone.hitTick+=.18;
    for(let n=0;n<2;n++){const a=Math.random()*Math.PI*2,r=Math.random()*zone.radius*.9;state.particles.push({x:zone.x+Math.cos(a)*r,y:zone.y+Math.sin(a)*r,vx:rand(-16,16),vy:rand(-36,-8),life:rand(.16,.34),maxLife:.34,size:rand(4,8),color:Math.random()>.45?'rgba(255,210,70,0.82)':'rgba(255,110,30,0.72)',drag:.92});}
  }
  if(state.gameOver)return;
  for(let i=state.flameParticles.length-1;i>=0;i--){const f=state.flameParticles[i];const prevFX=f.x,prevFY=f.y;const v=Math.hypot(f.vx,f.vy)||1;const sideX=-f.vy/v,sideY=f.vx/v;f.vx+=sideX*(f.swirl||0)*dt;f.vy+=sideY*(f.swirl||0)*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;const flameDamping=Math.pow(FLAME_VELOCITY_DAMPING_PER_SECOND,dt);f.vx*=flameDamping;f.vy*=flameDamping;f.vy-=30*dt*(f.heat||1);f.life-=dt;f.hitTick=(f.hitTick||0)-dt;f.size+=dt*8;f.swirl=(f.swirl||0)*Math.pow(0.7,dt*60);for(const b of Town.obstacles({x:Math.min(f.x,prevFX)-f.size,y:Math.min(f.y,prevFY)-f.size,w:Math.abs(f.x-prevFX)+f.size*2,h:Math.abs(f.y-prevFY)+f.size*2})){for(const wr of getBuildingWallRects(b)){if(lineIntersectsRect(prevFX,prevFY,f.x,f.y,wr)||circleRectCollision(f.x,f.y,f.size*0.35,wr)){f.life=0;break;}}if(f.life<=0)break;}if(f.life>0){
      if(f.hitTick<=0)for(const z of projectileTargets.query(f.x,f.y,f.size,true)){
        if(z.hp<=0||BossAttack.airborne(z)||!state.zombies.includes(z))continue;
        if(dist(z.x,z.y,f.x,f.y)<z.radius+f.size&&Town.lineClear(f.x,f.y,z.x,z.y)&&f.hitTick<=0){
          f.hitTick=.06;Burning.hitZombie(z,f.damage,f.damageMul??f.damage/.8,true,true,f.owner);break;
        }
      }
      if(Math.random()<0.72)state.particles.push({x:f.x,y:f.y,vx:rand(-28,28),vy:rand(-42,-6),life:rand(0.1,0.24),maxLife:0.24,size:rand(3,7),color:Math.random()>0.6?'rgba(255,210,120,0.66)':Math.random()>0.45?'rgba(255,130,35,0.74)':'rgba(255,90,20,0.68)',drag:0.88});
    }
    if(f.life<=0)state.flameParticles.splice(i,1);
  }
  for(let i=state.pellets.length-1;i>=0;i--){
    const p=state.pellets[i], prevX=p.x, prevY=p.y;
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt;
    let removed=false;
    for(const b of Town.obstacles({x:Math.min(prevX,p.x)-p.radius,y:Math.min(prevY,p.y)-p.radius,w:Math.abs(prevX-p.x)+p.radius*2,h:Math.abs(prevY-p.y)+p.radius*2})){
      for(const wr of getBuildingWallRects(b)){
        if(lineIntersectsRect(prevX,prevY,p.x,p.y,wr) || circleRectCollision(p.x,p.y,p.radius,wr)){
          state.particles.push({x:p.x,y:p.y,vx:rand(-20,20),vy:rand(-20,20),life:0.12,maxLife:0.12,size:1.5,color:'rgba(255,200,120,0.85)'});
          state.pellets.splice(i,1);
          removed=true;
          break;
        }
      }
      if(removed) break;
    }
    if(removed) continue;
    if(p.life<=0||p.x<-20||p.x>WORLD.w+20||p.y<-20||p.y>WORLD.h+20){state.pellets.splice(i,1);continue;}
    let hit=false;
    for(const z of projectileTargets.query(p.x,p.y,p.radius+1,true)){
      if(z.hp<=0||BossAttack.airborne(z))continue;
      if((!p.hitIds || !p.hitIds.includes(z.id)) && dist(z.x,z.y,p.x,p.y)<z.radius+p.radius+1){
        z.hp-=p.damage;PixelArt.hit(z);
        addDamageText(z.x+rand(-16,16),z.y-z.radius-10,p.damage,'#ffd84d');
        blood(p.x,p.y,5,'rgba(120,20,20,0.9)',0.55);
        playHit(z.x,z.y,p.weapon||'shotgun');
        hit=true;
        p.hitIds = p.hitIds || [];
        p.hitIds.push(z.id);
        if(z.hp<=0){
          handleZombieDeath(state.zombies.indexOf(z),true,'normal',p.owner);
        }
        if(p.penetration!=null){
          p.penetration--;
          if(p.penetration<=0){
            state.pellets.splice(i,1);
          }
        }else{
          state.pellets.splice(i,1);
        }
        break;
      }
    }
    if(hit) continue;
  }
  for(let i=state.zombies.length-1;i>=0;i--){
    const z=state.zombies[i];
    Coop.target(z,()=>{
    z.touchTimer=Math.max(0,(z.touchTimer||0)-dt);
    if((z.slamPushTime||0)>0){
      z.slamPushTime=Math.max(0,z.slamPushTime-dt);
      moveWithWallCollision(z,z.slamVX*dt,z.slamVY*dt);
      const damping=Math.pow(0.06,dt);z.slamVX*=damping;z.slamVY*=damping;
    }else if(z.type==='boss'){
      BossAttack.update(z,dt);
    }else if(z.type==='charger'){
      updateCharger(z,dt);
    } else if(z.type==='pouncer'){
      z.pounceCd-=dt;
      if(z.pounceTime>0){
        z.pounceTime-=dt;
        moveWithWallCollision(z,z.vx*dt,z.vy*dt);
      }else{
        const dx=player.x-z.x,dy=player.y-z.y,d=Math.hypot(dx,dy)||1;
        Town.chase(z,dt);
        const triggerDist=240;
        if(d<triggerDist&&z.pounceCd<=0&&Town.lineClear(z.x,z.y,player.x,player.y,z.radius)){
          z.pounceCd=rand(2.2,3.4);
          z.pounceTime=0.28;
          const leap=360;
          z.vx=dx/d*leap;
          z.vy=dy/d*leap;
        }
      }
    }else{
      const dx=player.x-z.x,dy=player.y-z.y,d=Math.hypot(dx,dy)||1;
      Town.chase(z,dt);
    }
    if(BossAttack.airborne(z))return;
    z.x=clamp(z.x,z.radius+2,WORLD.w-z.radius-2);
    z.y=clamp(z.y,z.radius+2,WORLD.h-z.radius-2);
    collideWithBuildings(z);
    if(!BossAttack.fixed(z)&&z.type!=='charger' && player.rocketJumpTime<=0&&player.dashTime<=0&&dist(z.x,z.y,player.x,player.y)<z.radius+player.radius+1&&z.touchTimer<=0){
      let contactDamage;
      if(state.wave<=5){
        contactDamage=1;
      }else{
        const earlyWaveFactor=0.22+Math.min(state.wave,20)*0.014;
        contactDamage=Math.max(1,z.damage*(z.touchDamageMul||0.14)*earlyWaveFactor);
      }
      damagePlayer(contactDamage,z.x,z.y,{ignoreInvincibility:true});
      z.touchTimer=z.touchCooldown||(z.type==='boss'?0.6:z.type==='bloater'?0.7:z.type==='runner'?0.4:0.55);
    }
    });
  }
  Coop.each(()=>{
  if(player.hp>0&&player.rocketJumpTime<=0){
  for(let i=0;i<state.zombies.length;i++){
    const z=state.zombies[i];
    if(BossAttack.fixed(z))continue;
    if(Math.hypot(player.x-z.x,player.y-z.y)>=player.radius+z.radius)continue;
    softSeparate(player,z,z.type==='boss'?0.22:0.18);
    player.x=clamp(player.x,player.radius+2,WORLD.w-(player.radius+2));
    player.y=clamp(player.y,player.radius+2,WORLD.h-(player.radius+2));
    z.x=clamp(z.x,z.radius+2,WORLD.w-z.radius-2);
    z.y=clamp(z.y,z.radius+2,WORLD.h-z.radius-2);
    collideWithBuildings(z);
    collideWithBuildings(player);
  }
  }
  });
  Crowd.separate(state.zombies);
  for(const z of state.zombies)if(!BossAttack.airborne(z))collideWithBuildings(z);
  Coop.updateRescue(dt);
  updatePickups(dt);
  VisualEffects.update(dt);
  if(state.running&&Math.random()<0.16&&state.deathAnim<=0){state.particles.push({x:player.x+10,y:player.y-4,vx:rand(-6,10),vy:rand(-28,-14),life:0.45,maxLife:0.45,size:rand(3,5),color:'rgba(110,110,110,0.35)',drag:0.98,floaty:true});}
  BossAttack.updateEffects(dt);PixelArt.update(dt);
  updateBuildingRoofs();bindMenuButtons();
updateHUD();
}

const PICKUP_MAGNET_RADIUS=110,PICKUP_MAGNET_RATE=7;
function canPickUp(item){
  if(player.hp<=0)return false;
  if(item.type==='med')return player.hp<player.maxHp;
  if(item.type==='grenade')return player.grenades<8;
  if(item.type==='molotov')return player.molotovs<5;
  return item.type==='serum';
}
function updatePickups(dt){
  if(!state.running||state.paused||state.gameOver||!Number.isFinite(dt)||dt<=0)return;
  const pull=1-Math.exp(-PICKUP_MAGNET_RATE*dt);
  for(let i=state.pickups.length-1;i>=0;i--){
    const item=state.pickups[i];item.ttl=(item.ttl??40)-dt;
    if(item.ttl<=0){state.pickups.splice(i,1);continue;}
    const recipient=Coop.nearest(item,p=>Coop.withPlayer(p,()=>canPickUp(item))&&Town.lineClear(item.x,item.y,p.x,p.y,Math.min(item.radius,p.radius)));
    if(!recipient)continue;
    Coop.withPlayer(recipient,()=>{
    // Recheck after each collection, so the last available slot stops the rest.
    if(!canPickUp(item))return;
    const dx=player.x-item.x,dy=player.y-item.y,d=Math.hypot(dx,dy);
    if(d>PICKUP_MAGNET_RADIUS||!Town.lineClear(item.x,item.y,player.x,player.y,Math.min(item.radius,player.radius)))return;
    item.x+=dx*pull;item.y+=dy*pull;
    if(d*(1-pull)>item.radius+player.radius+3)return;
    if(item.type==='med')player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.10);
    else if(item.type==='grenade')player.grenades++;
    else if(item.type==='molotov')player.molotovs++;
    else applySerumBuff(item.buff);
    state.pickups.splice(i,1);
    if(item.type!=='serum')playPickup();
    });
  }
}

// ── Rendering ──
function pxRect(x,y,w,h,c,a=1){ctx.globalAlpha=a;ctx.fillStyle=c;ctx.fillRect(px(x),px(y),px(w),px(h));ctx.globalAlpha=1;}
function drawGround(cam){PixelArt.ground(cam);}
function drawBuildings(cam){PixelArt.buildings(cam);}
function drawPlayer(cam){PixelArt.actor(player,cam,true);}
function drawZombie(z,cam){PixelArt.actor(z,cam);}
function drawZombies(cam){for(const z of state.zombies)PixelArt.actor(z,cam);}
function drawPellets(cam){PixelArt.pelletTrail(cam);}
function drawRockets(cam){PixelArt.rockets(cam);}
function drawGrenades(cam){PixelArt.grenades(cam);}
function drawExplosions(cam){PixelArt.explosions(cam);}
function drawParticles(cam){PixelArt.particles(cam);}
function drawPickups(cam){PixelArt.pickups(cam);}
function drawAirdrops(cam){PixelArt.airdrops(cam);}
function drawPlayerStatus(cam,offset=0){
  if(!state.running||state.gameOver||(player.hp<=0&&!player.downed))return;
  const x=Math.round(player.x-cam.x),y=Math.round(player.y-cam.y-getPlayerJumpVisual().lift-(player.downed?25:44)-offset),w=44,h=6;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#07100e';ctx.fillRect(x-w/2-1,y-1,w+2,h+2);
  ctx.fillStyle='#39443b';ctx.fillRect(x-w/2,y,w,h);ctx.fillStyle=player.hp<25?'#e55c50':'#aac28d';
  ctx.fillRect(x-w/2,y,Math.round(w*clamp(player.hp/player.maxHp,0,1)),h);
  ctx.font='bold 11px "Courier New","Microsoft YaHei",monospace';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.lineWidth=3;ctx.strokeStyle='#08100d';
  ctx.strokeText(state.playerName,x,y-5);ctx.fillStyle=!Coop.client||player.id===Net.id?'#ffffff':'#7ec5ff';ctx.fillText(state.playerName,x,y-5);ctx.restore();
}
function drawSurvivorStatus(cam){
  if(!Coop.client){drawPlayerStatus(cam);return;}
  const labels=[];ctx.save();ctx.font='bold 11px "Courier New","Microsoft YaHei",monospace';
  for(const p of Coop.survivors())Coop.withPlayer(p,()=>{
    const x=p.x-cam.x,y=p.y-cam.y-getPlayerJumpVisual().lift-(p.downed?25:44),w=Math.max(48,Math.min(160,ctx.measureText(p.name||'').width+8));
    if(x<-100||x>SW+100||y<-100||y>SH+100)return;
    let offset=0;while(labels.some(r=>Math.abs(r.x-x)<(r.w+w)/2&&Math.abs(r.y-(y-offset))<25))offset+=27;
    labels.push({x,y:y-offset,w});drawPlayerStatus(cam,offset);
  });ctx.restore();
}
function lowHealthIntensity(){return state.running&&!state.gameOver&&player.hp>0&&player.hp<25 ? .16+(25-player.hp)/25*.22 : 0;}
function drawLowHealthVignette(){
  const strength=lowHealthIntensity();if(!strength)return;
  const pulse=.92+.08*Math.sin(state.time*2.4),cx=SW/2,cy=SH/2;
  ctx.save();const g=ctx.createRadialGradient(cx,cy,Math.min(SW,SH)*.15,cx,cy,Math.hypot(SW,SH)*.55);
  g.addColorStop(0,'rgba(130,0,8,0.018)');g.addColorStop(.5,`rgba(145,3,12,${strength*.2*pulse})`);g.addColorStop(1,`rgba(170,4,16,${strength*pulse})`);
  ctx.fillStyle=g;ctx.fillRect(0,0,SW,SH);ctx.restore();
}
function drawCrosshair(){if(!state.running||state.gameOver||player.hp<=0||(Coop.client&&SquadUI.typing)) return; const x=px(state.mouse.x),y=px(state.mouse.y);ctx.strokeStyle='rgba(240,220,210,0.85)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x-16,y);ctx.lineTo(x-6,y);ctx.moveTo(x+6,y);ctx.lineTo(x+16,y);ctx.moveTo(x,y-16);ctx.lineTo(x,y-6);ctx.moveTo(x,y+6);ctx.lineTo(x,y+16);ctx.stroke();if(player.reloadTimer>0){const total=WEAPONS[player.weapon].reload,ratio=clamp(1-player.reloadTimer/total,0,1);ctx.strokeStyle='rgba(0,0,0,0.45)';ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,y,18,-Math.PI/2,Math.PI*1.5);ctx.stroke();ctx.strokeStyle='rgba(255,176,124,0.95)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,18,-Math.PI/2,-Math.PI/2+Math.PI*2*ratio);ctx.stroke();}}
function drawFog(cam){ Lighting.render(cam); }
function drawReloadBar(){if(player.reloadTimer<=0)return;const total=WEAPONS[player.weapon].reload,ratio=1-player.reloadTimer/total,w=180,h=10,x=SW/2-w/2,y=SH-32;pxRect(x,y,w,h,'rgba(255,255,255,0.12)');pxRect(x,y,w*ratio,h,'#ffb07c');}
function drawBossHealthBars(cam){
  const bosses=state.zombies.filter(z=>z.type==='boss');
  if(!bosses.length)return;
  const prevAlign=ctx.textAlign;
  for(const boss of bosses){
    if(boss.x<cam.x-140||boss.y<cam.y-140||boss.x>cam.x+SW+140||boss.y>cam.y+SH+140) continue;
    const s=worldToScreen(boss.x,boss.y,cam);
    const w=88,h=6,x=s.x-w/2,y=s.y-(boss.lift||0)-62;
    pxRect(x,y,w,h,'rgba(0,0,0,0.55)');
    pxRect(x+1,y+1,(w-2)*Math.max(0,boss.hp/boss.maxHp),h-2,'#9d2d2d');
    ctx.fillStyle='#f0e6d8';
    ctx.font='10px Courier New';
    ctx.textAlign='center';
    ctx.fillText(`${Math.max(0,Math.ceil(boss.hp))}/${boss.maxHp}`,s.x,y-4);
  }
  ctx.textAlign=prevAlign;
}
// In-game notices share the menu/HUD palette and integer-edged panel treatment.
function drawAnnouncementIcon(x,y,kind,color){
  ctx.fillStyle='#1c2421';ctx.fillRect(x,y,28,28);
  ctx.strokeStyle='#353d37';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,27,27);
  ctx.fillStyle=color;
  if(kind==='boss'){
    ctx.fillRect(x+12,y+6,4,10);ctx.fillRect(x+12,y+19,4,4);
  }else if(kind==='upgrade'){
    ctx.fillRect(x+12,y+6,4,16);ctx.fillRect(x+6,y+12,16,4);
  }else{
    // Supply crate: block corners, a reinforced lid and a central latch.
    ctx.fillRect(x+6,y+10,16,2);ctx.fillRect(x+6,y+12,2,9);
    ctx.fillRect(x+20,y+12,2,9);ctx.fillRect(x+8,y+19,12,2);
    ctx.fillRect(x+12,y+10,4,5);
    if(kind==='airdrop'){
      ctx.fillRect(x+13,y+3,2,4);ctx.fillRect(x+11,y+5,6,2);
    }else{
      ctx.fillRect(x+9,y+6,10,2);
    }
  }
}
function drawAnnouncementPanel(y,message,label,kind,remaining,duration,accent){
  const w=Math.min(360,SW-32),h=54,x=Math.floor((SW-w)/2),textX=x+54,textWidth=w-68;
  ctx.save();
  ctx.globalAlpha*=Math.min(1,remaining/.24); // Uses game time, so pause freezes the fade.
  ctx.fillStyle='#00000040';ctx.fillRect(x+3,y+3,w,h);
  ctx.fillStyle='#101813ed';ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='#495345';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
  ctx.fillStyle=accent;ctx.fillRect(x,y+1,2,h-2);
  drawAnnouncementIcon(x+12,y+12,kind,accent);
  ctx.textAlign='left';ctx.textBaseline='alphabetic';
  ctx.font='10px "Courier New","Microsoft YaHei",monospace';
  ctx.fillStyle=accent;ctx.fillText(label,textX,y+18);
  let size=14;
  ctx.font=`bold ${size}px "Courier New","Microsoft YaHei",monospace`;
  while(size>11&&ctx.measureText(message).width>textWidth){
    size--;ctx.font=`bold ${size}px "Courier New","Microsoft YaHei",monospace`;
  }
  // Keep translated or edited strings inside the card without stretching glyphs.
  let visible=message;
  if(ctx.measureText(visible).width>textWidth){
    while(visible.length&&ctx.measureText(visible+'…').width>textWidth)visible=visible.slice(0,-1);
    visible+='…';
  }
  ctx.fillStyle='#e8e8d5';ctx.fillText(visible,textX,y+38);
  ctx.fillStyle='#353d37';ctx.fillRect(textX,y+46,textWidth,1);
  ctx.fillStyle=accent;ctx.fillRect(textX,y+46,Math.round(textWidth*clamp(remaining/duration,0,1)),1);
  ctx.restore();
}
function drawAnnouncement(){
  if(!state.running||state.gameOver)return;
  const zh=lang==='zh',olive='#b8bc88',red='#df4b3f';
  // The narrow HUD wraps its controls onto a second row.
  let y=SW<=580?150:96;
  if(state.bossAnnouncement>0){
    drawAnnouncementPanel(y,T[lang].boss,zh?'威胁警报':'THREAT DETECTED','boss',state.bossAnnouncement,3,red);y+=61;
  }
  if(state.airdropAnnouncement>0){
    const military=state.airdropAnnouncementType==='military';
    drawAnnouncementPanel(y,T[lang][military?'militaryAirdrop':'airdrop'],zh?(military?'军用补给信号':'补给信号'):(military?'MILITARY SUPPLY':'SUPPLY SIGNAL'),'airdrop',state.airdropAnnouncement,3,military?red:olive);y+=61;
  }
  if(state.buffAnnouncementTimer>0&&state.buffAnnouncement){
    const equipment=state.buffAnnouncementType==='equipment';
    drawAnnouncementPanel(y,state.buffAnnouncement,zh?(equipment?'装备已获取':'强化已应用'):(equipment?'EQUIPMENT RECEIVED':'UPGRADE APPLIED'),equipment?'equipment':'upgrade',state.buffAnnouncementTimer,2.6,olive);
  }
}

function drawMinimap(cam){
  if(!state.running || state.gameOver) return;
  const mw=180, mh=120;
  const mx=SW-mw-14, my=SH-mh-14;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.beginPath();ctx.rect(mx,my,mw,mh);ctx.clip();
  pxRect(mx,my,mw,mh,'rgba(10,10,10,0.72)');
  const sx=mw/WORLD.w, sy=mh/WORLD.h;
  TownArt.minimap(mx,my,sx,sy);
  ctx.strokeStyle='rgba(255,255,255,0.4)';
  ctx.strokeRect(mx+cam.x*sx,my+cam.y*sy,SW*sx,SH*sy);
  ctx.fillStyle='#ff5555';
  for(const z of state.zombies)if(z.hp>0)ctx.fillRect(mx+z.x*sx,my+z.y*sy,z.type==='boss'?4:2,z.type==='boss'?4:2);
  ctx.fillStyle='#7fc4ff';
  for(const a of state.airdrops)ctx.fillRect(mx+a.x*sx-2,my+a.y*sy-2,5,5);
  if(Coop.client){ctx.fillStyle='#b6dc8a';for(const p of Coop.survivors())if(p!==player)ctx.fillRect(mx+p.x*sx-2,my+p.y*sy-2,4,4);}
  const px=clamp(Math.round(mx+player.x*sx),mx+3,mx+mw-4),py=clamp(Math.round(my+player.y*sy),my+3,my+mh-4);
  ctx.fillStyle='#101719';ctx.fillRect(px-3,py-3,7,7);
  ctx.fillStyle='#ffda55';ctx.fillRect(px-2,py-2,5,5);
  ctx.restore();
  ctx.save();ctx.strokeStyle='rgba(255,255,255,0.25)';ctx.strokeRect(mx-.5,my-.5,mw+1,mh+1);ctx.restore();
}

let vhsScanlines=null;
function drawVHSOverlay(){
  const t=state.vhsTime || 0;
  const bandY=((t*85)% (SH+120)) - 120;
  ctx.save();
  ctx.globalCompositeOperation='screen';
  if(!vhsScanlines||vhsScanlines.height!==SH){
    vhsScanlines=document.createElement('canvas');vhsScanlines.width=1;vhsScanlines.height=SH;const c=vhsScanlines.getContext('2d');
    for(let y=0;y<SH;y+=4){c.fillStyle=`rgba(255,255,255,${(y/4)%2===0?0.018:0.008})`;c.fillRect(0,y,1,1);}
  }
  ctx.drawImage(vhsScanlines,0,0,SW,SH);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle='rgba(255,255,255,0.06)';
  ctx.strokeRect(6,6,SW-12,SH-12);
  ctx.restore();

  for(let i=0;i<10;i++){
    const nx=(Math.sin(t*3.3+i*17.1)*0.5+0.5)*SW;
    const ny=(Math.cos(t*4.1+i*11.7)*0.5+0.5)*SH;
    ctx.fillStyle='rgba(255,255,255,0.035)';
    ctx.fillRect(nx,ny,2,2);
  }
}

function render(){updateGameUI(); const tipEl=$('tip'); if(tipEl) tipEl.style.display=(state.running && !state.gameOver)?'none':''; ctx.clearRect(0,0,SW,SH);const cam=camera();drawGround(cam);drawBuildings(cam);TownArt.props(cam);PixelArt.drawCorpses(cam);BossAttack.drawWorld(cam);drawPickups(cam);drawAirdrops(cam);drawGrenades(cam);drawPellets(cam);drawRockets(cam);Arsenal.drawMissiles(cam);PixelArt.drawActors(cam);Burning.draw(cam);Arsenal.drawDrones(cam);TownArt.canopies(cam);TownLights.drawAtmosphere(cam);drawExplosions(cam);Arsenal.drawImpacts(cam);drawParticles(cam);drawFog(cam);TownLights.drawEmissive(cam);PixelArt.airdropBeacons(cam);PixelArt.equipmentBeacons(cam);Weather.drawRain(cam);Weather.drawStrikes(cam);Arsenal.drawArcs(cam);Weather.drawController(cam);BossAttack.drawWarnings(cam);drawLowHealthVignette();drawSurvivorStatus(cam);SquadUI.draw(cam);drawCrosshair();drawBossHealthBars(cam);drawAnnouncement();drawMinimap(cam);Arsenal.drawHUD();TownArt.location();drawVHSOverlay();if(state.deathAnim>0){const a=state.deathAnim/1.8;ctx.fillStyle=`rgba(120,0,0,${0.5*(1-a)})`;ctx.fillRect(0,0,SW,SH);}}
// ── Main loop ──
let last=performance.now();
function loop(now){
  FrameStats.sample(now,state.running&&!state.gameOver&&!state.paused&&!state.loading&&!ArtStudio.isOpen&&!document.hidden);
  if(ArtStudio.isOpen){last=now;requestAnimationFrame(loop);return;}
  const dt=Math.min(Coop.client?.1:.033,(now-last)/1000);last=now;
  const workStarted=performance.now();
  state.vhsTime += dt;
  if(state.loading){
    // Startup owns completion. Time passing must never finish a pending load.
    requestAnimationFrame(loop);return;
  }else{
    update(dt);
  }
  AudioEngine.update(dt);
  const drawStarted=performance.now();
  render();
  if(state.running&&!state.gameOver&&!state.paused&&!document.hidden)FrameStats.record(drawStarted-workStarted,performance.now()-drawStarted);
  requestAnimationFrame(loop);
}
// Called only after all required scripts, styles and the portrait have loaded.
async function prepareClient(task){
  await task('audio',report=>AudioEngine.preload(report));
  await task('menu',()=>{restoreLeaderboardStorage();resize();applyLang();});
  await task('frame',()=>render());
}
let clientStarted=false;
function startClient(){
  if(Coop.server||clientStarted)return;clientStarted=true;
  state.loadProgress=1;state.loadDone=true;state.loading=false;
  updateLoadingUI();updateCursorVisibility();last=performance.now();requestAnimationFrame(loop);
  // Online rankings are optional, and audio is unlocked by the first user gesture.
  loadLeaderboard();Accounts.refresh().then(()=>flushLeaderboardScores());
}
