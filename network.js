// Browser transport and presentation only. All gameplay results come from /ws.
const Net=(()=>{
  let socket=null,id='',rooms=[],room=null,serverName='',screen='',status='',connected=false,menu=false;
  let originalPlayer=null,originalDev=false,sequence=0,actions=[],lastEvent=0,packetAt=0,ping=0,lastPing=0,endAt=0;
  let lastTransmit=0,flushTimer=null,countdownRemaining=0,countdownAt=0;
  let inputTimer=null,connectTimer=null,lastSnapshot=null,round=0,disconnectReason='';
  const targets=new Map(),zh=()=>lang==='zh',tr=(a,b)=>zh()?a:b;
  const errors={chat_fast:['发送太快，请稍等一秒。','Please wait a second before sending again.'],version:['版本不一致，请刷新网页后重试。','Version mismatch. Refresh this page.'],name:['请输入昵称。','Enter a nickname.'],room_name:['请输入房间名。','Enter a room name.'],capacity:['房间人数只能为 2–4 人。','Capacity must be 2–4.'],password:['房间密码不正确。','Incorrect room password.'],room_full:['房间已满。','Room is full.'],server_full:['服务器房间已满。','Server room limit reached.'],room_missing:['房间已经关闭。','Room no longer exists.'],in_progress:['这一局已经开始，请等待下一局。','This match has started. Wait for the next round.'],host_only:['只有房主可以执行此操作。','Only the room leader can do this.'],slow_down:['操作太快，请稍后重试。','Please wait a moment and try again.'],room_failed:['房间启动失败，可以重新准备后重试。','Room failed to start. Ready up and try again.']};
  function send(data){if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(data));}
  function notice(text){status=text;const el=$('netMessage');if(el)el.textContent=text;}
  function chrome(title,body){showMenu('netCard',`${menuHeader(title)}<div class="screenBody">${body}<p id="netMessage" class="netMessage" role="status" aria-live="polite">${escapeHtml(status)}</p></div>${menuFooter()}`);updateCursorVisibility();}
  function open(){
    originalPlayer=player;originalDev=state.devMode;state.devMode=false;Coop.setClient(true);Coop.setRoster([player]);
    state.running=false;state.gameOver=false;state.paused=false;state.overlayScreen='network';status='';screen='connect';renderConnect();updateDevPanel();
  }
  function renderConnect(){
    screen='connect';const file=location.protocol==='file:';
    chrome(tr('多人合作','ONLINE CO-OP'),`<span class="eyebrow">COOPERATIVE SURVIVAL / 01</span><h2>${tr('连接幸存者网络','Join the survivor network')}</h2><p>${file?tr('请先在开服电脑运行 Start-Server.bat，然后在下方打开服务器网址。','Run Start-Server.bat on the host computer, then open its address below.'):tr('输入昵称进入大厅。你可以创建自己的房间，或加入其他人的队伍。','Choose a nickname, then create a room or join a squad.')}</p><form id="netConnectForm" class="netForm"><label>${tr(file?'服务器网址':'昵称',file?'Server address':'Nickname')}<input id="netName" maxlength="${file?240:18}" value="${escapeHtml(file?'http://localhost:8080':state.playerName)}" required autocomplete="off"></label><div class="controls"><button class="primary" id="netConnect" type="submit">${tr(file?'打开服务器':'进入大厅',file?'Open server':'Enter lobby')} →</button><button type="button" id="netBack">${tr('返回','Back')}</button></div></form><p class="boardNote">${tr('2–4 人合作 · 房间独立 · 服务器计算战斗','2–4 SURVIVORS · INDEPENDENT ROOMS · SERVER SIMULATION')}</p>`);
    $('netBack').onclick=exit;
    $('netConnectForm').onsubmit=e=>{e.preventDefault();const value=$('netName').value.trim();if(file){try{const url=new URL(value);if(!['http:','https:'].includes(url.protocol))throw Error();location.assign(url.href);}catch{notice(tr('请输入 http:// 或 https:// 开头的网址。','Enter an http:// or https:// address.'));}return;}if(!value)return;state.playerName=value.slice(0,18);localStorage.setItem('dead_town_player_name',state.playerName);connect();};
  }
  function connect(){
    if(socket)socket.close();connected=false;disconnectReason='';notice(tr('正在连接服务器…','Connecting…'));$('netConnect').disabled=true;
    const ws=socket=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws');
    connectTimer=setTimeout(()=>{if(!connected&&socket===ws){ws.close();notice(tr('连接超时，请检查开服窗口和网址。','Connection timed out. Check the host and address.'));$('netConnect')&&($('netConnect').disabled=false);}},10000);
    ws.onopen=()=>{if(socket===ws)send({type:'hello',name:state.playerName,version:GAME_VERSION,appearance:PlayerSkins.load()});};
    ws.onmessage=e=>{if(socket!==ws)return;try{receive(JSON.parse(e.data));}catch(err){console.error('Multiplayer message:',err);notice(tr('接收游戏数据失败，请重新连接。','Could not read game data. Reconnect.'));}};
    ws.onerror=()=>notice(tr('无法连接服务器，请确认开服窗口仍在运行。','Cannot connect. Check that the server is running.'));
    ws.onclose=()=>{if(socket!==ws)return;clearTimeout(connectTimer);clearInterval(inputTimer);connected=false;lastSnapshot=null;SquadUI.reset();$('netStatus')?.classList.add('hidden');state.keys.clear();mouseDown=false;actions=[];state.running=false;state.paused=false;state.gameOver=false;room=null;menu=false;status=disconnectReason||tr('连接已断开。重新连接后可加入等待中的房间。','Disconnected. Reconnect to join a waiting room.');renderConnect();};
  }
  function roomRows(){
    if(!rooms.length)return `<div class="netEmpty"><span class="signalDot"></span><strong>${tr('暂无房间','No rooms yet')}</strong><p>${tr('创建一支队伍，等待朋友加入。','Create a squad and invite your friends.')}</p></div>`;
    return rooms.map(r=>`<div class="netRoomRow"><div><strong>${escapeHtml(r.name)}</strong><small>${r.id} · ${r.count}/${r.capacity} · ${r.locked?tr('需要密码','PASSWORD'):tr('公开','PUBLIC')}</small></div><span class="netState">${r.status==='waiting'?tr('等待中','WAITING'):r.status==='ended'?tr('已结束','ENDED'):tr('战斗中','IN MATCH')}</span><button data-join="${r.id}" ${r.status!=='waiting'||r.count>=r.capacity?'disabled':''}>${tr('加入','Join')} →</button></div>`).join('');
  }
  function bindJoin(){for(const b of document.querySelectorAll('[data-join]'))b.onclick=()=>{
    const r=rooms.find(r=>r.id===b.dataset.join);if(!r)return;
    if(r.locked)openMenuDialog({title:tr('加入房间','Join room'),label:tr('房间密码','Room password'),type:'password',maxLength:32,submit:password=>{send({type:'join',id:r.id,password});return '';}});
    else send({type:'join',id:r.id});
  };}
  function renderLobby(){
    if(screen==='lobby'&&$('netRoomList')){$('netRoomList').innerHTML=roomRows();bindJoin();return;}
    screen='lobby';status='';
    chrome(tr('幸存者大厅','SURVIVOR LOBBY'),`<div class="netHeading"><div><span class="eyebrow">${escapeHtml(serverName)} / ONLINE</span><h2>${tr('寻找你的队伍','Find your squad')}</h2></div><span class="netIdentity">${escapeHtml(state.playerName)}</span></div><div class="netColumns"><section><div class="netSection"><span class="label">${tr('房间列表','ROOMS')}</span><button id="netRefresh" class="quiet">${tr('刷新','Refresh')}</button></div><div id="netRoomList">${roomRows()}</div></section><aside class="netCreate"><span class="eyebrow">NEW OPERATION</span><h3>${tr('创建房间','Create a room')}</h3><form id="netCreateForm" class="netForm"><label>${tr('房间名称','Room name')}<input id="netRoomName" maxlength="32" value="${escapeHtml(state.playerName)}${tr('的队伍',"'s squad")}" required></label><label>${tr('人数上限','Capacity')}<select id="netCapacity"><option value="4">4 ${tr('人','players')}</option><option value="3">3 ${tr('人','players')}</option><option value="2">2 ${tr('人','players')}</option></select></label><label>${tr('房间密码（可留空）','Password (optional)')}<input type="password" id="netPassword" maxlength="32" autocomplete="new-password"></label><button class="primary" type="submit">${tr('创建队伍','Create squad')} →</button></form></aside></div><div class="controls"><button id="netDisconnect">${tr('断开并返回主菜单','Disconnect / Main menu')}</button><button id="netLanguage">EN / 中文</button></div>`);
    $('netCreateForm').onsubmit=e=>{e.preventDefault();send({type:'create',name:$('netRoomName').value,capacity:Number($('netCapacity').value),password:$('netPassword').value});};
    $('netRefresh').onclick=()=>send({type:'list'});$('netDisconnect').onclick=exit;$('netLanguage').onclick=changeLanguage;bindJoin();
  }
  function renderRoom(){
    if(!room)return;const chatFocused=SquadUI.typing;screen='room';const own=room.members.find(p=>p.id===id),host=room.hostId===id;
    const waiting=room.status==='waiting',starting=room.status==='starting',ended=room.status==='ended';
    chrome(tr('行动准备','SQUAD BRIEFING'),`<span class="eyebrow">ROOM ${room.id} / ${room.members.length} OF ${room.capacity}</span><h2>${escapeHtml(room.name)}</h2><p>${tr('同一座小镇，共同抵抗尸潮。拾取物先到先得，燃烧和爆炸仍会伤及队友。','One town, one squad. Supplies go to the first eligible survivor. Fire and explosions can affect teammates.')}</p><div class="netMembers">${room.members.map((p,i)=>`<div class="netMember"><canvas class="netPortrait" width="72" height="84" data-member-preview="${p.id}"></canvas><strong class="${p.id===id?'selfName':'allyName'}">${escapeHtml(p.name)} ${p.id===id?tr('（你）','(you)'):''}<small>${p.id===room.hostId?tr('房主','SQUAD LEADER'):tr('幸存者','SURVIVOR')}</small></strong><span class="netState ${p.ready?'ready':''}">${p.ready?tr('已准备','READY'):tr('未准备','NOT READY')}</span></div>`).join('')}</div>${waiting||ended?PlayerSkins.markup(own||PlayerSkins.load()):''}${ended&&room.result?`<div class="netResult"><strong>${Math.floor(room.result.score)} <small>${tr('团队分数','TEAM SCORE')}</small></strong><span>${room.result.kills} ${tr('击杀','KILLS')} · ${formatTime(room.result.time)}</span></div>${SquadUI.result(room.result.ranking)}<p class="boardNote">${tr('合作成绩不计入单人排行榜。阵亡玩家在下一局重新加入。','Co-op scores do not enter the solo leaderboard. Fallen survivors return next round.')}</p>`:''}${waiting&&room.startsInMs>0?`<div class="netCountdown" role="status" aria-live="polite"><strong id="netCountdownValue">${Math.ceil(room.startsInMs/1000)}</strong><span>${tr('全员准备完毕，即将开始','Everyone is ready. Starting soon.')}<br><small>${tr('取消准备可停止倒计时','Cancel ready to stop the countdown.')}</small></span></div>`:''}<div class="controls">${waiting?`<button id="netReady" class="primary">${own?.ready?tr('取消准备','Cancel ready'):tr('准备','Ready up')}</button>${host?`<button id="netStart">${tr('立即开始','Start now')} →</button>`:''}`:starting?`<button disabled>${tr('正在生成小镇…','Generating town…')}</button>`:ended&&host?`<button id="netRematch" class="primary">${tr('准备下一局','Next round')} →</button>`:''}<button id="netLeave">${tr('离开房间','Leave room')}</button></div><div id="roomChatMount"></div><p class="boardNote">${waiting?tr('房主可随时立即开始。全员准备后自动倒计时 5 秒；取消准备或人员变动会重置倒计时。开局后不可加入。','The leader can start anytime. Everyone ready starts a 5-second countdown; readiness or roster changes reset it. No joining during a match.'):ended&&!host?tr('等待房主开启下一局。','Waiting for the leader to open the next round.'):''}</p>`);
    for(const c of document.querySelectorAll('[data-member-preview]')){const p=room.members.find(p=>p.id===c.dataset.memberPreview),g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(PixelArt.sprite('player','idle',0,0,0,false,p),0,0,72,84);}
    PlayerSkins.bind($('overlayCard'),own||PlayerSkins.load(),appearance=>{if(originalPlayer)Object.assign(originalPlayer,appearance);send({type:'appearance',appearance});});SquadUI.mount(chatFocused);
    $('netReady')&&($('netReady').onclick=()=>send({type:'ready'}));$('netStart')&&($('netStart').onclick=()=>send({type:'start'}));$('netRematch')&&($('netRematch').onclick=()=>send({type:'rematch'}));$('netLeave').onclick=leave;
  }
  function renderMenu(){
    screen='game-menu';chrome(tr('联机菜单','ONLINE MENU'),`<span class="eyebrow">${escapeHtml(room?.name||'')} / ${Math.round(ping)} MS</span><h2>${tr('行动仍在继续','The match continues')}</h2><p>${tr('此菜单不会暂停服务器。关闭菜单后恢复操作。','The server continues while this menu is open. Close it to resume control.')}</p><div class="controls"><button id="netResume" class="primary">${tr('返回战斗','Return to match')}</button><button id="netLeave">${tr('离开房间','Leave room')}</button><button id="netLanguage">EN / 中文</button></div>${controlGuide()}${AudioEngine.settingsHTML(lang)}`);
    $('netResume').onclick=toggleMenu;$('netLeave').onclick=leave;$('netLanguage').onclick=changeLanguage;AudioEngine.bindSettings();
  }
  function toggleMenu(){
    if(!room||room.status!=='playing')return;
    SquadUI.closeInput();menu=!menu;state.paused=menu;state.keys.clear();mouseDown=false;actions=[];transmit();
    if(menu)renderMenu();else{screen='game';$('overlay').classList.add('hidden');}SquadUI.mount();SquadUI.team();updateGameUI();updateCursorVisibility();
  }
  function resetVisuals(){BossAttack.reset();PixelArt.reset();Arsenal.reset();Weather.reset();Lighting.reset();state.keys.clear();mouseDown=false;actions=[];targets.clear();NetPrediction.reset();clearTimeout(flushTimer);flushTimer=null;}
  function begin(s){
    SquadUI.closeInput();if(room)room.status='playing';round++;lastEvent=0;lastSnapshot=null;sequence=0;endAt=0;menu=false;screen='game';status='';resetVisuals();
    player={...originalPlayer,maxHp:100,hp:100};Coop.setRoster([player]);resetGame(s.seed);state.devMode=false;state.loading=false;state.loadDone=true;
    state.paused=false;$('overlay').classList.add('hidden');applySnapshot(s,true);localize();SquadUI.mount();SquadUI.team();FrameStats.reset();
  }
  function actorList(incoming,old,key,initial){
    const previous=new Map(old.map(o=>[o.id,o]));
    return incoming.map(o=>{let p=previous.get(o.id);const oldDown=!!p?.downed;const x=p?.x??o.x,y=p?.y??o.y;
      if(!p)p={};const art={};for(const k of ['artX','artY','animPhase','artFacing','artMoving','artRecoil','artShotUntil','artShotAngle','artShotKind','artDownAge'])if(k in p)art[k]=p[k];
      Object.assign(p,o,art);
      const previousTarget=targets.get(key+o.id),time=performance.now(),elapsed=previousTarget?(time-previousTarget.at)/1000:0;
      const vx=elapsed>.025&&elapsed<.5?(o.x-previousTarget.x)/elapsed:0,vy=elapsed>.025&&elapsed<.5?(o.y-previousTarget.y)/elapsed:0;
      const future={...o};
      if(Math.hypot(vx,vy)<650){
        if(key==='d'||BossAttack.airborne(o)){future.x+=vx*.065;future.y+=vy*.065;}
        else if(key!=='p'||o.id!==id)moveWithWallCollision(future,vx*.065,vy*.065);
      }
      targets.set(key+o.id,{x:o.x,y:o.y,at:time,vx,vy,futureX:future.x,futureY:future.y});
      if(!initial){p.x=x;p.y=y;}
      if(key==='p'&&o.id===id)NetPrediction.reconcile(o,p,initial||oldDown!==!!o.downed);
      return p;
    });
  }
  function applySnapshot(s,initial=false){
    if(s.version!==GAME_VERSION)return;packetAt=performance.now();lastSnapshot=s;
    const players=actorList(s.players,Coop.all(),'p',initial);Coop.setRoster(players);player=players.find(p=>p.id===id)||players[0]||player;
    for(const [key,value] of Object.entries(s.world)){
      if(key==='zombies')state.zombies=actorList(value,state.zombies,'z',initial);
      else state[key]=value;
    }
    state.paused=menu;
    if(player.ui){state.cameraShake=player.ui.cameraShake||0;state.screenFlash=player.ui.screenFlash||0;}
    const enemies=new Map(state.zombies.map(z=>[z.id,z]));for(const arc of s.arsenal.arcs){if(arc.entity)arc.entity=enemies.get(arc.entity.id)||arc.entity;if(arc.sourceEntity)arc.sourceEntity=enemies.get(arc.sourceEntity.id)||arc.sourceEntity;}
    s.arsenal.drones=actorList(s.arsenal.drones,Arsenal.drones,'d',initial);
    Arsenal.applySnapshot(s.arsenal);
    const keep=new Set([...players.map(p=>'p'+p.id),...state.zombies.map(z=>'z'+z.id),...Arsenal.drones.map(d=>'d'+d.id)]);for(const key of targets.keys())if(!keep.has(key))targets.delete(key);
    Weather.applySnapshot(s.weather);BossAttack.impacts.splice(0,BossAttack.impacts.length,...s.bossImpacts);
    for(const e of s.events){if(e.n<=lastEvent)continue;lastEvent=e.n;effect(e);}
    if(s.world.gameOver&&!endAt){endAt=performance.now()+1800;state.paused=false;menu=false;}
    updateHUD();updateDevPanel();
  }
  function suppressArcAudio(){return NetPrediction.shotConfirmed({shotId:player.shotSerial,kind:'arc'});}
  function effect(e){
    const d=e.data;
    if(e.type==='death')PixelArt.death(d.z,d.cause);
    else if(e.type==='playerDown'){const p=Coop.byId(d.id);if(p){p.artDownAge=0;PixelArt.revive(p.id);}SquadUI.announce('down',d);}
    else if(e.type==='playerRevive'){PixelArt.revive(d.id);SquadUI.announce('revive',d);}
    else if(e.type==='playerDeath'){const p=Coop.byId(d.id);if(p)Coop.withPlayer(p,()=>PixelArt.playerDeath());}
    else if(e.type==='shot'){if(d.id===id&&NetPrediction.shotConfirmed(d))return;const p=Coop.byId(d.id);if(p)Coop.withPlayer(p,()=>{PixelArt.shot(d.angle,d.kind);if(d.kind!=='arc')AudioEngine.shot(d.kind);if(d.id===id&&d.kind!=='arc')Lighting.flash(d.angle,d.kind);});}
    else if(e.type==='audio'){if(d.ownerId===id&&((d.name==='roll'&&performance.now()-NetPrediction.lastDashAt<1000)||(d.name==='arc_shot'&&suppressArcAudio())))return;if(d.count)AudioEngine.variant(d.name,d.count,d.options);else AudioEngine.play(d.name,d.options);}
    else if(e.type==='thunder')AudioEngine.thunder(d.x,d.y,d.grounded);
    else if(e.type==='notice'&&d.id===id){state.buffAnnouncementType=d.kind==='serum'?'upgrade':'equipment';state.buffAnnouncement=d.kind==='serum'?T[lang]['serum'+({damage:'Damage',speed:'Speed',health:'Health'}[d.value])]:tr('空投：','Airdrop: ')+T[lang][d.value];state.buffAnnouncementTimer=2.6;}
  }
  function receive(m){
    if(m.type==='welcome'){clearTimeout(connectTimer);connected=true;id=m.id;serverName=m.name;status='';inputTimer=setInterval(transmit,33);screen='';}
    else if(m.type==='lobby'){rooms=m.rooms;serverName=m.name;if(!room)renderLobby();}
    else if(m.type==='room'){const old=room;room=m.room;countdownRemaining=room.startsInMs||0;countdownAt=performance.now();if(room.status==='waiting'||room.status==='starting')renderRoom();else if(room.status==='ended'&&!endAt){endAt=performance.now()+1800;}else if(old?.hostId!==room.hostId&&menu)renderMenu();}
    else if(m.type==='chat')SquadUI.receive(m.message);
    else if(m.type==='chatHistory')SquadUI.history(m.messages);
    else if(m.type==='start')begin(m.snapshot);
    else if(m.type==='snapshot')applySnapshot(m.snapshot);
    else if(m.type==='left'){lastSnapshot=null;SquadUI.reset();$('netStatus')?.classList.add('hidden');resetVisuals();room=null;menu=false;screen='';state.running=false;state.gameOver=false;state.paused=false;endAt=0;Coop.setRoster([player]);}
    else if(m.type==='reset'){lastSnapshot=null;SquadUI.reset(false);$('netStatus')?.classList.add('hidden');resetVisuals();state.running=false;state.gameOver=false;state.paused=false;endAt=0;screen='';}
    else if(m.type==='error'){const pair=errors[m.code];if(m.code==='chat_fast')SquadUI.error(pair[zh()?0:1]);notice(pair?pair[zh()?0:1]:tr('操作失败，请重试。','Operation failed. Try again.'));if(m.code==='version'){disconnectReason=status;connected=false;socket?.close();}if(m.code==='room_failed'){lastSnapshot=null;state.running=false;state.gameOver=false;state.paused=false;menu=false;resetVisuals();$('netStatus')?.classList.add('hidden');}}
    else if(m.type==='pong'&&Number.isFinite(m.at))ping=Math.max(0,Date.now()-m.at);
  }
  function transmit(){
    clearTimeout(flushTimer);flushTimer=null;
    if(!connected)return;lastTransmit=performance.now();
    if(Date.now()-lastPing>2000){lastPing=Date.now();send({type:'ping',at:lastPing});}
    if(room?.status!=='playing'||!lastSnapshot)return;
    const stale=performance.now()-packetAt>1500,active=!menu&&!SquadUI.typing&&!document.hidden&&!stale&&(player.hp>0||player.downed);
    const aim=Coop.aim(player,camera());
    NetPrediction.remember(++sequence);
    send({type:'input',seq:sequence,keys:active?[...state.keys]:[],aimX:aim.x,aimY:aim.y,fire:active&&!player.downed&&mouseDown,actions:active&&!player.downed?actions.splice(0):[]});if(!active)actions=[];
  }
  function flushInput(){
    if(!connected)return;
    // Send edges promptly; coalesce same-frame events instead of flooding the socket.
    const wait=12-(performance.now()-lastTransmit);
    if(wait<=0)transmit();else if(!flushTimer)flushTimer=setTimeout(transmit,wait);
  }
  function action(kind){
    if(menu||SquadUI.typing||player.hp<=0||performance.now()-packetAt>1500)return;
    if(actions.length<5)actions.push(kind);NetPrediction.action(kind);flushInput();
  }
  function update(dt){
    const counter=$('netCountdownValue');if(counter)counter.textContent=String(Math.max(1,Math.ceil((countdownRemaining-(performance.now()-countdownAt))/1000)));
    if(!lastSnapshot)return;
    const lag=performance.now()-packetAt;
    if(lag<2000&&state.running){state.time+=dt;state.surviveTime+=dt;}
    NetPrediction.update(dt,!menu&&!SquadUI.typing&&!document.hidden&&state.running,lag<350&&state.running);
    const blend=1-Math.exp(-32*dt);
    for(const [list,key] of [[Coop.all(),'p'],[state.zombies,'z'],[Arsenal.drones,'d']])for(const p of list){
      if(key==='p'&&p.id===id)continue;
      const t=targets.get(key+p.id);if(!t)continue;
      // Short, bounded extrapolation keeps remote movement fluid between packets.
      const ahead=Math.min(.065,Math.max(0,(performance.now()-t.at)/1000)),speed=Math.hypot(t.vx,t.vy);
      const allowed=lag<250&&speed<650&&(p.hp!==0||p.downed)&&p.connected!==false;
      const x=t.x+(allowed?(t.futureX-t.x)*ahead/.065:0),y=t.y+(allowed?(t.futureY-t.y)*ahead/.065:0);
      if(Math.hypot(x-p.x,y-p.y)>200){p.x=t.x;p.y=t.y;}
      else{p.x+=(x-p.x)*blend;p.y+=(y-p.y)*blend;}
    }
    // Advance visual ordnance between authoritative packets, never collision damage.
    if(lag<120){
      for(const p of [...state.pellets,...state.rockets,...state.flameParticles]){
        const nx=p.x+p.vx*dt,ny=p.y+p.vy*dt;if(Town.lineClear(p.x,p.y,nx,ny)){p.x=nx;p.y=ny;}
      }
      for(const m of Arsenal.missiles){const x=m.x+Math.cos(m.angle)*m.speed*dt,y=m.y+Math.sin(m.angle)*m.speed*dt;if(Town.lineClear(m.x,m.y,x,y)){m.x=x;m.y=y;}}
      for(const g of state.grenades){g.timer=Math.max(0,g.timer-dt);g.progress=clamp(1-g.timer/g.total,0,1);g.x=g.startX+(g.targetX-g.startX)*g.progress;g.y=g.startY+(g.targetY-g.startY)*g.progress;g.height=Math.sin(g.progress*Math.PI)*g.arc;g.drawX=g.x;g.drawY=g.y-g.height;}
      for(const a of state.airdrops)if(!a.landed)a.fallY=Math.min(a.y,a.fallY+190*dt);
      for(const e of state.explosions){e.life=Math.max(0,e.life-dt);const t=1-e.life/e.maxLife;e.radius=e.maxRadius*t;e.ring=24+e.maxRadius*t*.65;}
    }
    for(const p of state.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}state.particles=state.particles.filter(p=>p.life>0);
    for(const p of state.damageTexts){p.x+=(p.dx||0)*dt;p.y+=p.vy*dt;p.life-=dt;}state.damageTexts=state.damageTexts.filter(p=>p.life>0);
    state.buffAnnouncementTimer=Math.max(0,state.buffAnnouncementTimer-dt);state.cameraShake=Math.max(0,state.cameraShake-dt*18);
    PixelArt.update(dt);BossAttack.updateEffects(dt);Arsenal.effects(dt);Weather.update(dt);updateHUD();SquadUI.update();
    if(endAt&&performance.now()>=endAt&&room?.status==='ended'&&screen!=='room'){renderRoom();endAt=0;}
    const bar=$('netStatus');if(bar){bar.classList.remove('hidden');bar.textContent=lag>1500&&room?.status==='playing'?tr('等待服务器… 输入已停止','WAITING FOR SERVER… INPUT STOPPED'):player.downed&&state.running?tr(`倒地 · ${Math.ceil(player.downRemaining)} 秒 · WASD 匍匐 / Enter 聊天`,`DOWN · ${Math.ceil(player.downRemaining)}s · WASD CRAWL / ENTER CHAT`):player.hp<=0&&state.running?tr('已阵亡 · 正在观战队友 · Esc 打开菜单','FALLEN · SPECTATING · ESC MENU'):`${room?.id||''} · ${Coop.living().length}/${Coop.all().length} · ${Math.round(ping)} ms`;
      bar.classList.toggle('warning',lag>1500&&room?.status==='playing');}
  }
  function leave(){state.keys.clear();mouseDown=false;send({type:'leave'});}
  function exit(){
    const ws=socket;socket=null;ws?.close();clearInterval(inputTimer);clearTimeout(connectTimer);clearTimeout(flushTimer);flushTimer=null;NetPrediction.reset();connected=false;room=null;lastSnapshot=null;menu=false;endAt=0;status='';screen='';
    resetVisuals();SquadUI.reset();Coop.setClient(false);if(originalPlayer)player=originalPlayer;state.devMode=originalDev;state.paused=false;$('netStatus')?.classList.add('hidden');goToMainMenu();
  }
  function localize(){FrameStats.localize(lang);if(document.documentElement)document.documentElement.lang=zh()?'zh-CN':'en';for(const [el,key] of [['lKills','kills'],['lScore','score'],['lHp','hp'],['lAmmo','ammo'],['lWeapon','weapon'],['lReserve','reserve'],['lGrenades','grenades'],['lTime','time'],['lWave','wave'],['lBest','best']])$(el).textContent=T[lang][key];$('pauseBtn').textContent=tr('菜单 Esc','Menu Esc');if(menu)renderMenu();else if(screen==='connect')renderConnect();else if(screen==='lobby'){screen='';renderLobby();}else if(screen==='room')renderRoom();SquadUI.mount();SquadUI.team();updateHUD();}
  const release=()=>{state.keys.clear();mouseDown=false;actions=[];flushInput();};
  addEventListener('blur',()=>{if(Coop.client)release();});
  document.addEventListener('visibilitychange',()=>{if(Coop.client&&document.hidden)release();});
  return {open,update,action,releaseControls:release,chat:text=>send({type:'chat',text}),flushInput,leave,exit,toggleMenu,localize,get connected(){return connected;},get room(){return room;},get id(){return id;},get ping(){return ping;}};
})();
