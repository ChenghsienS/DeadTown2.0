// Original sampled sound bank, spatial attenuation, occlusion and restrained mix.
const FOOTSTEPS = {
  stride: 50,
  profiles: {
    concrete: {variants:4,volume:0.30,reverb:false},
    wood: {variants:4,volume:0.30,reverb:true},
    grass: {variants:4,volume:0.28,reverb:false}
  }
};

const AudioEngine = (() => {
  const defaults={master:0.68,effects:0.82,ambience:0.30};
  let settings={...defaults};
  try{const saved=JSON.parse(localStorage.getItem('deadtown_audio_v2')||'{}');for(const key of Object.keys(defaults))if(Number.isFinite(saved[key]))settings[key]=Math.max(0,Math.min(1,saved[key]));}catch{}
  let a,master,fx,ambience,reverbSend,compressor,ready=false;
  const buffers={},voices=new Set(),loops={},lastPlay={};
  let lastFlame=-10,flameActive=false,stepDistance=0,lastX=null,lastY=null,groanTimer=2,foot=0;
  const pendingHits=new Map();
  const lastStepVariant={};
  const hitProfiles={
    shotgun:{base:'impact_shotgun',volume:0.38,interval:0.08},
    gatling:{base:'impact_gatling',volume:0.27,interval:0.05},
    rocket:{base:'impact_rocket',volume:0.36,interval:0.12},
    grenade:{base:'impact_grenade',volume:0.32,interval:0.12},
    flamethrower:{base:'impact_flame',volume:0.23,interval:0.19},
    molotov:{base:'impact_burn',volume:0.20,interval:0.24}
  };
  let hidden=false;
  function init(){
    if(a){if(a.state==='suspended')a.resume().catch(()=>{});return a;}
    const Type=window.AudioContext||window.webkitAudioContext;if(!Type)return null;
    try{a=new Type();}catch{return null;}
    window._actx=a;
    master=a.createGain();fx=a.createGain();ambience=a.createGain();
    compressor=a.createDynamicsCompressor();compressor.threshold.value=-13;compressor.knee.value=14;compressor.ratio.value=3.5;compressor.attack.value=0.004;compressor.release.value=0.2;
    const limiter=a.createDynamicsCompressor();limiter.threshold.value=-2;limiter.knee.value=0;limiter.ratio.value=16;limiter.attack.value=0.001;limiter.release.value=0.12;
    fx.connect(compressor);ambience.connect(compressor);compressor.connect(master);master.connect(limiter);limiter.connect(a.destination);
    const highpass=a.createBiquadFilter();highpass.type='highpass';highpass.frequency.value=65;
    const reverb=a.createConvolver();const ir=a.createBuffer(2,Math.floor(a.sampleRate*0.62),a.sampleRate);
    let seed=314159;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296*2-1;};
    for(let ch=0;ch<2;ch++){
      const data=ir.getChannelData(ch);let v=0;
      for(let i=0;i<data.length;i++){v+=0.2*(rand()-v);const t=i/a.sampleRate;data[i]=t>0.025?v*Math.exp(-t*8)*0.32:0;}
      for(const [t,g] of [[0.038,0.12],[0.071,0.08],[0.117,0.045]])data[Math.floor((t+ch*0.003)*a.sampleRate)]+=g;
    }
    reverb.buffer=ir;reverbSend=a.createGain();reverbSend.gain.value=0.14;
    reverbSend.connect(highpass);highpass.connect(reverb);reverb.connect(fx);
    for(const [name,encoded] of Object.entries(DEADTOWN_AUDIO_BANK.samples)){
      const bytes=atob(encoded);const b=a.createBuffer(1,bytes.length/2,DEADTOWN_AUDIO_BANK.sampleRate);const data=b.getChannelData(0);
      for(let i=0;i<data.length;i++){let n=bytes.charCodeAt(i*2)|(bytes.charCodeAt(i*2+1)<<8);if(n>=32768)n-=65536;data[i]=n/32768;}
      buffers[name]=b;
    }
    // Short deterministic electrical discharge: crackle, coil whine and a decaying zap.
    const electric=a.createBuffer(1,Math.floor(a.sampleRate*0.25),a.sampleRate),samples=electric.getChannelData(0);
    let noiseSeed=8191,phase=0;
    for(let i=0;i<samples.length;i++){
      const t=i/a.sampleRate;noiseSeed=(Math.imul(noiseSeed,1664525)+1013904223)>>>0;
      const noise=noiseSeed/4294967296*2-1;phase+=(1500*Math.exp(-t*15)+160)/a.sampleRate*Math.PI*2;
      const envelope=Math.min(1,t/0.003)*Math.exp(-t*19),pulse=0.55+0.45*Math.sin(t*255);
      samples[i]=(Math.sin(phase)*0.25+Math.sin(phase*2.03)*0.12+noise*pulse*0.4)*envelope;
    }
    buffers.arc_shot=electric;
    ready=true;applySettings();if(a.state==='suspended')a.resume().catch(()=>{});return a;
  }
  function applySettings(){
    if(!a)return;
    master.gain.setTargetAtTime(settings.master,a.currentTime,0.025);
    fx.gain.setTargetAtTime(settings.effects,a.currentTime,0.025);
    ambience.gain.setTargetAtTime(settings.ambience,a.currentTime,0.1);
  }
  function spatial(x,y){
    if(x==null||y==null)return {gain:1,pan:0,cutoff:13000};
    const dx=x-player.x,dy=y-player.y,d=Math.hypot(dx,dy);
    if(d>1200)return {gain:0,pan:0,cutoff:13000};
    const blocked=d>35 && !Town.lineClear(player.x,player.y,x,y);
    return {gain:(blocked?0.52:1)/(1+(d/320)**2),pan:Math.max(-0.85,Math.min(0.85,dx/440)),cutoff:blocked?1550:Math.max(2600,13000-d*8)};
  }
  function play(name,options={}){
    if(!init()||!ready||hidden||settings.master===0)return;
    if(options.gameplay!==false && (!state.running||state.paused||state.gameOver))return;
    const now=a.currentTime;
    if(options.group && now-(lastPlay[options.group]??-100)<(options.interval||0))return;
    if(options.group)lastPlay[options.group]=now;
    const buffer=buffers[name];if(!buffer)return;
    const sp=options.weather?weatherSpatial(options.x,options.y):spatial(options.x,options.y);if(sp.gain<0.015)return;
    if(voices.size>=36){const first=voices.values().next().value;stopVoice(first);}
    const source=a.createBufferSource();source.buffer=buffer;source.playbackRate.value=options.rate||0.96+Math.random()*0.08;
    const gain=a.createGain();gain.gain.value=(options.volume??0.3)*sp.gain;
    const filter=a.createBiquadFilter();filter.type='lowpass';filter.frequency.value=sp.cutoff;
    const pan=a.createStereoPanner();pan.pan.value=sp.pan;
    source.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(options.bus==='ambience'?ambience:fx);
    if(options.reverb!==false)pan.connect(reverbSend);
    const voice={name,source,gain,filter,pan,weather:!!options.weather,gameplay:options.gameplay!==false};voices.add(voice);
    source.onended=()=>{voices.delete(voice);source.disconnect();filter.disconnect();gain.disconnect();pan.disconnect();};
    source.start(now);
    return voice;
  }
  function variant(base,count,options){return play(base+'_'+(1+Math.floor(Math.random()*count)),options);}
  function stopVoice(v){if(!v||!a)return;try{v.gain.gain.setTargetAtTime(0,a.currentTime,0.008);v.source.stop(a.currentTime+0.035);}catch{}voices.delete(v);}
  function silenceCombat(){for(const v of [...voices])if(v.gameplay)stopVoice(v);}
  function silenceWeather(){for(const v of [...voices])if(v.weather)stopVoice(v);}
  function loop(name,volume,options={}){
    if(!a||!ready)return;
    let n=loops[name];
    if(!n){
      if(volume<=0)return;
      const source=a.createBufferSource();source.buffer=buffers[name];source.loop=true;
      const gain=a.createGain();gain.gain.value=0;
      const pan=a.createStereoPanner();const filter=a.createBiquadFilter();filter.type='lowpass';filter.frequency.value=8000;
      source.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(name==='rain_loop'?ambience:fx);
      source.start();n=loops[name]={source,gain,pan,filter};
    }
    const sp=spatial(options.x,options.y);
    n.gain.gain.setTargetAtTime(hidden?0:volume*sp.gain,a.currentTime,options.fade||0.08);
    n.pan.pan.setTargetAtTime(sp.pan,a.currentTime,0.12);
    n.filter.frequency.setTargetAtTime(options.cutoff??sp.cutoff,a.currentTime,0.15);
  }
  function hit(kind,x,y){
    if(!state.running||state.paused||state.gameOver)return;
    const profile=hitProfiles[kind];if(!profile)return;
    const distance=Math.hypot(x-player.x,y-player.y),old=pendingHits.get(kind);
    // Nine pellets, penetration and overlapping flame particles share one cue.
    if(!old||distance<old.distance)pendingHits.set(kind,{x,y,distance});
  }
  function weatherSpatial(x,y){
    const dx=x-player.x,dy=y-player.y,d=Math.hypot(dx,dy);
    const indoors=WORLD.buildings.some(b=>pointInsideBuildingInterior(player.x,player.y,b));
    return {gain:(indoors?0.65:1)/(1+(d/2000)**2),pan:Math.max(-0.65,Math.min(0.65,dx/1800)),cutoff:indoors?1600:Math.max(1800,6000-d)};
  }
  function thunder(x,y,grounded){
    return variant(grounded?'thunder_strike':'thunder_distant',3,{x,y,weather:true,gameplay:false,bus:'ambience',volume:grounded?0.52:0.36,rate:0.94+Math.random()*0.08,reverb:false});
  }
  function shot(kind){
    if(kind==='flamethrower'){
      if(!flameActive||state.time-lastFlame>0.16)play('flame_ignite',{volume:0.24,group:'flame_ignite',interval:0.18});
      lastFlame=state.time;flameActive=true;return;
    }
    const counts={shotgun:3,gatling:4,rocket:2};
    variant(kind,counts[kind]||1,{volume:kind==='gatling'?0.36:kind==='rocket'?0.46:0.54});
  }
  function surfaceAt(x,y){
    // Floors take precedence at doorways and anywhere a road crosses a footprint.
    if(WORLD.buildings.some(b=>pointInsideBuildingInterior(x,y,b)))return 'wood';
    if(WORLD.road.some(r=>pointInRect(x,y,r))||Town.isPaved(x,y))return 'concrete';
    return 'grass';
  }
  function footstep(){
    const material=surfaceAt(player.x,player.y),profile=FOOTSTEPS.profiles[material];
    const previous=lastStepVariant[material];
    let sample=1+Math.floor(Math.random()*(profile.variants-(previous?1:0)));
    if(previous&&sample>=previous)sample++;
    lastStepVariant[material]=sample;foot++;
    play('step_'+material+'_'+sample,{volume:profile.volume*(0.93+Math.random()*0.14),rate:0.96+Math.random()*0.08,
      x:player.x+(foot%2?8:-8),y:player.y,reverb:profile.reverb});
  }
  function update(dt){
    if(!a){pendingHits.clear();return;}
    const live=state.running&&!state.paused&&!state.gameOver&&!state.loading&&!hidden;
    const indoors=live&&WORLD.buildings.some(b=>pointInsideBuildingInterior(player.x,player.y,b));
    loop('rain_loop',live?(indoors?0.032:0.065):0.018,{cutoff:indoors?1700:6200,fade:0.35});
    if(!live){pendingHits.clear();silenceCombat();if(state.paused||hidden||!state.gameOver)silenceWeather();loop('flame_loop',0);loop('fire_loop',0);flameActive=false;lastFlame=-10;stepDistance=0;lastX=player.x;lastY=player.y;return;}
    for(const [kind,position] of pendingHits){const p=hitProfiles[kind];variant(p.base,3,{x:position.x,y:position.y,volume:p.volume,group:'impact_'+kind,interval:p.interval,reverb:false});}
    pendingHits.clear();
    const firing=state.time-lastFlame<0.11;
    loop('flame_loop',firing?0.22:0,{fade:0.045});
    if(flameActive&&!firing){play('flame_release',{volume:0.18,reverb:false});flameActive=false;}
    let nearest=null,best=Infinity;
    for(const f of state.fireZones){const d=Math.hypot(f.x-player.x,f.y-player.y);if(d<best){nearest=f;best=d;}}
    loop('fire_loop',nearest?0.24*Math.min(1,nearest.life/0.7):0,nearest||{});
    if(lastX!==null && player.dashTime<=0 && player.rocketJumpTime<=0 && player.knockbackTime<=0){
      const distance=Math.hypot(player.x-lastX,player.y-lastY);
      if(distance<30)stepDistance+=distance;else stepDistance=0;
      if(stepDistance>=FOOTSTEPS.stride){stepDistance%=FOOTSTEPS.stride;footstep();}
    }else stepDistance=0;
    lastX=player.x;lastY=player.y;
    groanTimer-=dt;
    if(groanTimer<=0){
      groanTimer=2.2+Math.random()*2.2;
      const near=state.zombies.filter(z=>z.hp>0&&Math.hypot(z.x-player.x,z.y-player.y)<540);
      if(near.length){const z=near[Math.floor(Math.random()*near.length)];variant('groan',3,{x:z.x,y:z.y,volume:z.type==='boss'?0.24:0.13,rate:z.type==='boss'?0.72:0.9+Math.random()*0.15});}
    }
  }
  function reset(){silenceCombat();silenceWeather();pendingHits.clear();lastFlame=-10;flameActive=false;lastX=null;lastY=null;stepDistance=0;foot=0;groanTimer=2;for(const key of Object.keys(lastStepVariant))delete lastStepVariant[key];for(const key of Object.keys(lastPlay))delete lastPlay[key];loop('flame_loop',0);loop('fire_loop',0);}
  function settingsHTML(language){
    const zh=language==='zh',labels=zh?['总音量','音效','环境音']:['Master','Effects','Ambience'];
    return `<details class="audioSettings"><summary>${zh?'声音设置':'Sound settings'}</summary>${Object.keys(defaults).map((key,i)=>`<label>${labels[i]}<input type="range" id="audio-${key}" min="0" max="100" value="${Math.round(settings[key]*100)}"><span id="audio-${key}-value">${Math.round(settings[key]*100)}%</span></label>`).join('')}</details>`;
  }
  function bindSettings(){for(const key of Object.keys(defaults)){const input=document.getElementById('audio-'+key);if(!input)continue;input.oninput=()=>{init();settings[key]=Number(input.value)/100;document.getElementById('audio-'+key+'-value').textContent=input.value+'%';applySettings();try{localStorage.setItem('deadtown_audio_v2',JSON.stringify(settings));}catch{}};}}
  document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden){silenceCombat();silenceWeather();for(const name of Object.keys(loops))loop(name,0);}});
  return {init,play,variant,shot,hit,thunder,update,reset,silenceCombat,settingsHTML,bindSettings,spatial,weatherSpatial,surfaceAt,
    ambientLevel(value){if(!a)return;loop('rain_loop',value<=0.024?0.018:0.065,{cutoff:6200,fade:0.35});},
    get settings(){return {...settings};},get voiceCount(){return voices.size;}};
})();

// Compatibility names used by the single-player simulation.
function ensureAudio(){return AudioEngine.init();}
function startBGM(){ensureAudio();AudioEngine.ambientLevel(state.paused||!state.running?0.018:0.05);}
function setBGMLevel(value){AudioEngine.ambientLevel(value);}
function playMenuOpen(){ensureAudio();startBGM();}
function playMenuClick(){AudioEngine.play('click',{volume:0.24,gameplay:false,reverb:false});}
function playShot(kind){AudioEngine.shot(kind);}
function playReload(kind){AudioEngine.play('reload_'+(kind==='arc'?'rocket':kind),{volume:0.38,rate:1});}
function playBoom(x,y,kind='normal'){if(kind==='molotov')AudioEngine.play('glass',{x,y,volume:0.42});else AudioEngine.variant('explosion',2,{x,y,volume:kind==='rocket'?0.6:0.5});}
function playHit(x,y,weapon='shotgun'){AudioEngine.hit(weapon,x,y);}
function playGore(x,y){AudioEngine.variant('gore',3,{x,y,volume:0.25,group:'gore',interval:0.075});}
function playPickup(){AudioEngine.play('pickup',{volume:0.3,group:'pickup',interval:0.08});}
function playDash(){AudioEngine.play('roll',{volume:0.34});}
function playThrow(){AudioEngine.play('throw',{volume:0.25});}
