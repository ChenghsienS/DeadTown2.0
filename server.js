'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {randomBytes,scryptSync,timingSafeEqual}=require('node:crypto');
const {Worker}=require('node:worker_threads');
const {WebSocketServer,WebSocket}=require('./server/vendor/ws');
const PlayerSkins=require('./player-skins');
const AccountRules=require('./account-rules');
const {AccountStore,createAccountAPI,cookieToken}=require('./server/accounts.cjs');
const {SnapshotStream}=require('./server/snapshot-stream.cjs');
const version=require('./package.json').version;
const root=__dirname,KEYS=new Set(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright','shift']);
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.wav':'audio/wav'};
const publicFiles=new Set(['index.html',...fs.readdirSync(root).filter(f=>/\.(js|css)$/.test(f)&&f!=='server.js')]);
function clean(value,max){return typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max):'';}
function createHost(options={}){
  const rooms=new Map(),clients=new Map();let closed=false;
  const accounts=new AccountStore({directory:options.dataDir});
  function identity(c){return {name:c.name,accountId:c.user?.id||null,avatarId:c.user?.avatarId||'guest',level:c.user?.level||null};}
  function updateIdentity(c,user){const active=rooms.get(c.room);if(!active||['waiting','ended'].includes(active.status))c.appearance=PlayerSkins.normalize(user.equippedSkin);c.user=user;c.name=user.displayName;send(c,{type:'identity',self:identity(c)});const r=rooms.get(c.room);if(r){r.worker?.postMessage({type:'identity',id:c.id,...identity(c)});if(r.result?.ranking)for(const p of r.result.ranking)if(p.id===c.id){p.name=user.displayName;p.avatarId=user.avatarId;p.accountId=user.id;p.level=user.level;}}return r;}
  function accountChanged(user,reward=null){const changedRooms=new Set();for(const c of clients.values())if(c.user?.id===user.id){const r=updateIdentity(c,user);send(c,{type:'accountProgress',user,...(reward?{reward}:{})});if(r)changedRooms.add(r);}for(const r of changedRooms)announceRoom(r);}
  const accountAPI=createAccountAPI(accounts,{signedIn(user,token,req){
    const binding=req.headers['x-deadtown-connection'];if(typeof binding!=='string'||binding.length!==48)return;
    const c=[...clients.values()].find(c=>c.binding===binding&&c.hello);if(!c)return;c.sessionToken=token;const r=updateIdentity(c,user);if(r)announceRoom(r);
  },changed:accountChanged,signedOut(token){for(const c of clients.values())if(c.sessionToken===token)c.ws.close(1008,'Session ended');}});
  const maxRooms=Math.max(1,Math.min(12,Number(options.maxRooms??process.env.MAX_ROOMS)||4));
  const hostName=clean(options.name??process.env.SERVER_NAME,40)||'Dead Town';
  const server=http.createServer((req,res)=>{
    let url;try{url=new URL(req.url,'http://localhost');}catch{res.writeHead(400);return res.end();}
    if(url.pathname.startsWith('/api/')){accountAPI(req,res,url);return;}
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});return res.end();}
    let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';}catch{res.writeHead(400);return res.end();}
    if(name==='health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({ok:true,version,rooms:rooms.size,players:clients.size}));}
    if(!publicFiles.has(name)&&!/^assets\/[\w/.-]+\.(png|wav|js)$/.test(name)){res.writeHead(404);return res.end('Not found');}
    const file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||name.split('/').some(p=>p.startsWith('.'))){res.writeHead(403);return res.end();}
    fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(req.method==='HEAD'?undefined:data);});
  });
  const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:{threshold:1024,serverNoContextTakeover:true,clientNoContextTakeover:true,concurrencyLimit:4}});
  function send(c,data){if(c.ws.readyState===WebSocket.OPEN)c.ws.send(JSON.stringify(data));}
  function error(c,code){send(c,{type:'error',code});}
  const publicRoom=r=>({id:r.id,name:r.name,capacity:r.capacity,count:r.members.size,locked:!!r.password,status:r.status,hostId:r.hostId});
  function roomInfo(r,viewer){return {...publicRoom(r),members:[...r.members.values()].map(c=>({id:c.id,...identity(c),ready:c.ready,...c.appearance})),result:r.result?{...r.result,rewards:(r.result.rewards||[]).filter(reward=>reward.accountId===viewer?.user?.id)}:null,startsInMs:r.countdownEnd?Math.max(0,r.countdownEnd-Date.now()):0};}
  function announceRoom(r){for(const c of r.members.values())send(c,{type:'room',room:roomInfo(r,c)});}
  function lobby(c){send(c,{type:'lobby',name:hostName,rooms:[...rooms.values()].map(publicRoom)});}
  function announceLobby(){for(const c of clients.values())if(c.hello&&!c.room)lobby(c);}
  function cancelCountdown(r){clearInterval(r.countdownTimer);r.countdownTimer=null;r.countdownEnd=0;}
  function checkCountdown(r){
    if(r.status!=='waiting'||![...r.members.values()].every(c=>c.ready)||r.members.size<2){cancelCountdown(r);return;}
    if(r.countdownTimer)return;
    r.countdownEnd=Date.now()+5000;let displayed=5;
    r.countdownTimer=setInterval(()=>{
      if(closed||!rooms.has(r.id)||r.status!=='waiting'||r.members.size<2||![...r.members.values()].every(c=>c.ready)){cancelCountdown(r);return;}
      const left=Math.ceil((r.countdownEnd-Date.now())/1000);
      if(left<=0){start(r);return;}
      if(left!==displayed){displayed=left;announceRoom(r);}
    },100);
    r.countdownTimer.unref();
  }
  function leave(c,notify=true){
    c.stream?.reset();
    const r=rooms.get(c.room);c.room=null;c.ready=false;
    if(r){cancelCountdown(r);r.members.delete(c.id);r.worker?.postMessage({type:'disconnect',id:c.id});
      if(!r.members.size){const w=r.worker;r.worker=null;w?.terminate();rooms.delete(r.id);}
      else{if(r.hostId===c.id)r.hostId=r.members.keys().next().value;checkCountdown(r);announceRoom(r);}}
    if(notify){send(c,{type:'left'});lobby(c);}announceLobby();
  }
  const settlements=new Set();
  function settleRound(r,matchId,entries,completedAt){
    // Freeze who actually completed the match before any player leaves the report.
    const job={r,matchId,entries,timer:null,promise:null};settlements.add(job);
    const attempt=()=>{
      if(closed)return;
      job.promise=accounts.finishCoop(matchId,entries,completedAt).then(results=>{
        settlements.delete(job);
        if(r.result?.matchId===matchId){r.result.rewards=results.map(v=>v.reward);r.result.rewardState='saved';}
        for(const {user,reward} of results)accountChanged(user,reward);
        if(rooms.get(r.id)===r&&r.result?.matchId===matchId)announceRoom(r);
      }).catch(err=>{
        console.error('Account match settlement:',err.code||err.message);
        if(!closed){job.timer=setTimeout(attempt,5000);job.timer.unref();}
      });
    };attempt();
  }
  function start(r){
    if(r.status!=='waiting'||r.members.size<2)return;cancelCountdown(r);
    for(const c of r.members.values())c.appearance=PlayerSkins.normalize(c.user?.equippedSkin);
    r.status='starting';r.result=null;r.matchId=randomBytes(24).toString('hex');r.participants=new Map([...r.members.values()].map(c=>[c.id,c.user?.id||null]));announceRoom(r);announceLobby();
    const worker=r.worker=new Worker(path.join(root,'server/room-worker.cjs'),{workerData:{members:[...r.members.values()].map(c=>({id:c.id,...identity(c),...c.appearance})),seed:randomBytes(4).readUInt32LE()}});
    let failed=false;
    function failure(err){if(failed||r.worker!==worker||!rooms.has(r.id))return;failed=true;console.error('Room '+r.id+':',err);worker.terminate();r.worker=null;r.status='waiting';for(const c of r.members.values()){c.ready=false;error(c,'room_failed');}announceRoom(r);announceLobby();}
    worker.on('error',failure);worker.on('exit',code=>{if(code!==0&&r.worker===worker)failure('Worker exited '+code);});
    worker.on('message',m=>{
      if(r.worker!==worker||!rooms.has(r.id))return;
      if(m.type==='started'){r.status='playing';for(const c of r.members.values()){c.stream.reset();c.sequence=-1;send(c,{type:'start',snapshot:m.snapshot,matchId:r.matchId});}announceRoom(r);announceLobby();}
      else if(m.type==='snapshot'){const message=JSON.parse(m.payload);for(const c of r.members.values())c.stream.offer(message);}
      else if(m.type==='ended'){
        const entries=m.ranking.filter(p=>p.connected!==false&&r.participants.get(p.id)&&r.members.get(p.id)?.user?.id===r.participants.get(p.id)).map(p=>({accountId:r.participants.get(p.id),score:Math.floor(p.score),kills:p.kills||0,duration:m.time}));
        r.result={score:m.score,kills:m.kills,time:m.time,ranking:m.ranking,matchId:r.matchId,rewards:[],rewardState:entries.length?'pending':'saved'};r.status='ended';r.worker=null;worker.terminate();for(const c of r.members.values())c.ready=false;announceRoom(r);announceLobby();
        if(entries.length)settleRound(r,r.matchId,entries,accounts.now());
      }
    });
  }
  function dispatch(c,m){
    if(!m||typeof m!=='object'||typeof m.type!=='string')return error(c,'bad_message');
    if(m.type==='hello'){
      if(m.version!==version)return error(c,'version');
      if(c.hello)return;c.user=c.sessionToken?accounts.session(c.sessionToken):null;const name=c.user?.displayName||AccountRules.guestName(m.name);if(!name)return error(c,'name');
      c.hello=true;c.name=name;c.appearance=PlayerSkins.normalize(c.user?.equippedSkin);if(m.snapshotCodec===1)c.stream.enableCodec();send(c,{type:'welcome',id:c.id,version,name:hostName,maxRooms,self:identity(c),binding:c.binding});return lobby(c);
    }
    if(!c.hello)return error(c,'hello_first');
    if(m.type==='ping')return send(c,{type:'pong',at:m.at});
    if(m.type==='list')return lobby(c);
    if(m.type==='leave')return leave(c);
    if(m.type==='create'||m.type==='join'){
      const now=Date.now();if(now-c.lastJoin<700)return error(c,'slow_down');c.lastJoin=now;
      if(c.room)return error(c,'already_in_room');let r;
      if(m.type==='create'){
        if(rooms.size>=maxRooms)return error(c,'server_full');
        const name=clean(m.name,32);if(!name)return error(c,'room_name');
        const capacity=Number(m.capacity);if(!Number.isInteger(capacity)||capacity<2||capacity>4)return error(c,'capacity');
        let id;do{id=randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(id));
        const password=clean(m.password,32),salt=randomBytes(16);
        r={id,name,capacity,password:password?scryptSync(password,salt,32):null,salt,hostId:c.id,members:new Map(),status:'waiting',worker:null,chat:[],chatSerial:0};rooms.set(id,r);
      }else{
        r=rooms.get(clean(m.id,6).toUpperCase());if(!r)return error(c,'room_missing');
        if(r.status!=='waiting')return error(c,'in_progress');
        if(r.members.size>=r.capacity)return error(c,'room_full');
        if(r.password&&!timingSafeEqual(r.password,scryptSync(clean(m.password,32),r.salt,32)))return error(c,'password');
      }
      cancelCountdown(r);c.room=r.id;c.ready=false;r.members.set(c.id,c);announceRoom(r);send(c,{type:'chatHistory',messages:r.chat});announceLobby();return;
    }
    const r=rooms.get(c.room);if(!r)return error(c,'not_in_room');
    if(m.type==='resync'){if(Date.now()-(c.lastResync||0)>1000){c.lastResync=Date.now();c.stream.keyframe();}return;}
    if(m.type==='appearance'){
      if(!['waiting','ended'].includes(r.status))return error(c,'in_progress');
      const look=PlayerSkins.normalize(m.appearance);if(!c.user)return error(c,'auth_required');
      c.user=accounts.session(c.sessionToken);if(!c.user)return error(c,'auth_required');
      if(!c.user.ownedSkins.includes(PlayerSkins.key(look)))return error(c,'skin_locked');
      // Changes are persisted via the authenticated HTTP appearance endpoint.
      c.appearance=PlayerSkins.normalize(c.user.equippedSkin);announceRoom(r);return;
    }
    if(m.type==='chat'){
      const text=clean(m.text,160).replace(/[\u202a-\u202e\u2066-\u2069]/g,'');if(!text)return;
      const now=Date.now();c.chatTokens=Math.min(4,c.chatTokens+(now-c.chatAt)/1200);c.chatAt=now;
      if(c.chatTokens<1)return error(c,'chat_fast');c.chatTokens--;
      const message={id:++r.chatSerial,playerId:c.id,name:c.name,text,at:now};r.chat.push(message);if(r.chat.length>50)r.chat.shift();
      for(const peer of r.members.values())send(peer,{type:'chat',message});return;
    }
    if(m.type==='ready'){if(r.status!=='waiting')return; c.ready=!c.ready;checkCountdown(r);return announceRoom(r);}
    if(m.type==='start'){
      if(c.id!==r.hostId)return error(c,'host_only');
      if(r.status!=='waiting')return error(c,'in_progress');
      if(r.members.size<2)return error(c,'need_players');
      return start(r);
    }
    if(m.type==='rematch'){
      if(c.id!==r.hostId)return error(c,'host_only');if(r.status!=='ended')return;
      r.status='waiting';r.result=null;for(const p of r.members.values()){p.stream.reset();p.ready=false;send(p,{type:'reset'});}announceRoom(r);announceLobby();return;
    }
    if(m.type==='input'){
      if(r.status!=='playing'||!r.worker)return;
      if(!Number.isSafeInteger(m.seq)||m.seq<=c.sequence||!Number.isFinite(m.aimX)||!Number.isFinite(m.aimY)||!Array.isArray(m.keys)||m.keys.length>9)return;
      c.sequence=m.seq;
      const input={seq:m.seq,keys:[...new Set(m.keys.filter(k=>KEYS.has(k)))],aimX:Math.max(0,Math.min(3600,m.aimX)),aimY:Math.max(0,Math.min(2400,m.aimY)),fire:m.fire===true,actions:Array.isArray(m.actions)?[...new Set(m.actions.filter(a=>['reload','grenade','molotov','shoot','dash'].includes(a)))].slice(0,5):[]};
      r.worker.postMessage({type:'input',id:c.id,input});return;
    }
    error(c,'unknown');
  }
  server.on('upgrade',(req,socket,head)=>{
    const ip=req.socket.remoteAddress;
    // TLS may terminate at the existing reverse proxy. Validate the WS host as
    // before; account HTTP mutations separately enforce HTTPS and its scheme.
    let validOrigin=req.headers['sec-fetch-site']!=='cross-site';
    try{if(req.headers.origin){const origin=new URL(req.headers.origin);validOrigin=validOrigin&&['http:','https:'].includes(origin.protocol)&&origin.host===req.headers.host;}}catch{validOrigin=false;}
    if(req.url!=='/ws'||!validOrigin||clients.size>=64||[...clients.values()].filter(c=>c.ip===ip).length>=32){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return socket.destroy();}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
  });
  wss.on('connection',(ws,req)=>{
    const c={ws,binding:randomBytes(24).toString('hex'),sessionToken:cookieToken(req),user:null,id:randomBytes(8).toString('hex'),ip:req.socket.remoteAddress,hello:false,room:null,name:'',ready:false,alive:true,sequence:-1,tokens:180,tokenTime:Date.now(),lastJoin:0,appearance:PlayerSkins.normalize(),chatTokens:4,chatAt:Date.now()};c.stream=new SnapshotStream(ws);clients.set(c.id,c);
    ws.on('pong',()=>c.alive=true);
    ws.on('message',data=>{try{const now=Date.now();c.tokens=Math.min(180,c.tokens+(now-c.tokenTime)*.09)-1;c.tokenTime=now;if(c.tokens<0)return ws.close(1008,'Rate limit');dispatch(c,JSON.parse(data));}catch{error(c,'bad_message');}});
    ws.on('error',()=>{});ws.on('close',()=>{clients.delete(c.id);leave(c,false);});
    const timer=setTimeout(()=>{if(!c.hello)ws.close(1008,'Hello timeout');},10000);timer.unref();ws.on('close',()=>clearTimeout(timer));
  });
  const heartbeat=setInterval(()=>{for(const c of clients.values()){if(c.user&&!accounts.session(c.sessionToken)){c.ws.close(1008,'Session expired');continue;}if(!c.alive){c.ws.terminate();continue;}c.alive=false;c.ws.ping();}},15000);heartbeat.unref();
  async function close(){if(closed)return;closed=true;clearInterval(heartbeat);for(const job of settlements)clearTimeout(job.timer);for(const r of rooms.values()){cancelCountdown(r);const w=r.worker;r.worker=null;await w?.terminate();}rooms.clear();for(const c of clients.values())c.ws.terminate();await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>server.close(resolve));await Promise.allSettled([...settlements].map(j=>j.promise));await accounts.close();}
  return {server,rooms,clients,accounts,close,listen(port=Number(process.env.PORT)||8080,host=process.env.HOST||'0.0.0.0'){return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,()=>{server.removeListener('error',reject);resolve(server.address());});});}};
}
if(require.main===module){
  const app=createHost();app.listen().then(address=>{
    console.log(`\nDEAD TOWN V${version} | Cooperative survival\nLocal: http://localhost:${address.port}`);
    for(const entries of Object.values(os.networkInterfaces()))for(const a of entries||[])if(a.family==='IPv4'&&!a.internal)console.log(`LAN:   http://${a.address}:${address.port}`);
    console.log('Keep this window open. Ctrl+C stops all rooms.\n');
  }).catch(e=>{console.error('Could not start server:',e.message);process.exitCode=1;});
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close().then(()=>process.exit(0)));
}
module.exports={createHost};
