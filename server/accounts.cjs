'use strict';
const fs=require('node:fs'),fsp=fs.promises,path=require('node:path'),os=require('node:os');
const {randomBytes,randomUUID,createHash,scrypt,timingSafeEqual}=require('node:crypto');
const {promisify}=require('node:util');
const Rules=require('../account-rules.js');
const Progress=require('../account-progress.js');
const Economy=require('../account-economy.js');
const DEVELOPER_ID='a3f337f5-dd2d-4cf9-9d17-3cab03af0329';
const ensureEconomy=u=>u.economy||(u.economy=Economy.initial(Progress.info(u.totalXp).level));
const derive=promisify(scrypt),SESSION_MS=7*86400000,RUN_MS=86400000;
const hash=value=>createHash('sha256').update(value).digest('hex');
const fault=(code,status=400)=>Object.assign(new Error(code),{code,status});
const empty=()=>({schema:1,users:[],sessions:[],runs:[]});
const summary=(u,now=Date.now())=>({id:u.id,username:u.username,displayName:u.displayName,avatarId:u.avatarId,canDevelop:u.id===DEVELOPER_ID,bestScore:u.bestScore||0,...Progress.info(u.totalXp),nameChangeAvailableAt:u.nameChangedAt?u.nameChangedAt+Progress.RENAME_MS:0,serverTime:now,tokens:ensureEconomy(u).tokens,ownedSkins:[...u.economy.owned],equippedSkin:Economy.get(u.economy.equipped)||Economy.get(Economy.DEFAULT),economyRevision:u.economy.revision,daily:Economy.daily(u.economy,now)});
class AccountStore{
  constructor({directory=process.env.DEADTOWN_DATA_DIR||path.join(os.homedir(),'.local','share','deadtown'),now=Date.now}={}){
    this.directory=path.resolve(directory);this.file=path.join(this.directory,'accounts.json');this.lock=path.join(this.directory,'accounts.lock');this.now=now;this.data=empty();this.queue=Promise.resolve();this.opened=false;this.busy=0;this.closed=false;
  }
  open(){
    if(this.opened)return;if(this.closed)throw fault('service_unavailable',503);
    fs.mkdirSync(this.directory,{recursive:true,mode:0o700});
    try{this.fd=fs.openSync(this.lock,'wx',0o600);}catch(e){
      if(e.code!=='EEXIST')throw e;
      const pid=Number(fs.readFileSync(this.lock,'utf8'));let alive=true;
      if(Number.isSafeInteger(pid)&&pid>0){try{process.kill(pid,0);}catch(err){if(err.code==='ESRCH')alive=false;}}
      if(alive)throw fault('storage_locked',503);
      fs.unlinkSync(this.lock);this.fd=fs.openSync(this.lock,'wx',0o600);
    }
    fs.writeFileSync(this.fd,String(process.pid));
    try{
      try{this.data=JSON.parse(fs.readFileSync(this.file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
      if(this.data.schema!==1||!Array.isArray(this.data.users)||!Array.isArray(this.data.sessions)||!Array.isArray(this.data.runs))throw Error('Invalid account database; restore a backup.');
      for(const u of this.data.users)ensureEconomy(u);
      this.opened=true;
    }catch(e){fs.closeSync(this.fd);fs.unlinkSync(this.lock);throw e;}
  }
  async change(fn){
    const job=this.queue.then(async()=>{
      this.open();const data=structuredClone(this.data),now=this.now();
      data.sessions=data.sessions.filter(s=>s.expires>now);data.runs=data.runs.filter(r=>r.expires>now);
      const result=fn(data),temporary=path.join(this.directory,`accounts-${randomBytes(8).toString('hex')}.tmp`);
      try{
        const file=await fsp.open(temporary,'wx',0o600);
        try{await file.writeFile(JSON.stringify(data));await file.sync();}finally{await file.close();}
        await fsp.rename(temporary,this.file);
        this.data=data;
        if(process.platform!=='win32'){const dir=await fsp.open(this.directory,'r');try{await dir.sync();}finally{await dir.close();}}
        return result;
      }finally{await fsp.unlink(temporary).catch(()=>{});}
    });this.queue=job.catch(()=>{});return job;
  }
  session(token){
    if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return null;this.open();
    const s=this.data.sessions.find(s=>s.tokenHash===hash(token)&&s.expires>this.now());
    const u=s&&this.data.users.find(u=>u.id===s.userId);return u?summary(u,this.now()):null;
  }
  async password(password,salt){
    if(this.busy>=3)throw fault('busy',429);this.busy++;
    try{return await derive(password,salt,32,{N:32768,r:8,p:3,maxmem:64*1024*1024});}finally{this.busy--;}
  }
  newSession(data,user){
    const token=randomBytes(32).toString('hex');
    const own=data.sessions.filter(s=>s.userId===user.id).sort((a,b)=>b.expires-a.expires);
    const keep=new Set(own.slice(0,4).map(s=>s.tokenHash));
    data.sessions=data.sessions.filter(s=>s.userId!==user.id||keep.has(s.tokenHash));
    data.sessions.push({tokenHash:hash(token),userId:user.id,expires:this.now()+SESSION_MS});
    return {user:summary(user,this.now()),token};
  }
  async register(fields,previousToken){
    const error=Rules.validate(fields);if(error)throw fault(error);this.open();
    const key=fields.username.toLowerCase();if(this.data.users.some(u=>u.key===key))throw fault('username_taken',409);
    const salt=randomBytes(16).toString('hex'),passwordHash=(await this.password(fields.password,salt)).toString('hex');
    return this.change(data=>{
      if(data.users.some(u=>u.key===key))throw fault('username_taken',409);
      const u={id:randomUUID(),key,username:fields.username,displayName:Rules.displayName(fields.displayName),avatarId:fields.avatarId,salt,passwordHash,bestScore:0,totalXp:0,nameChangedAt:0,created:this.now()};
      data.users.push(u);if(previousToken)data.sessions=data.sessions.filter(s=>s.tokenHash!==hash(previousToken));return this.newSession(data,u);
    });
  }
  async login(fields,previousToken){
    if(!Rules.validUsername(fields.username)||typeof fields.password!=='string'||fields.password.length>64)throw fault('invalid_credentials',401);
    this.open();const u=this.data.users.find(u=>u.key===fields.username.toLowerCase());
    // The same expensive KDF also runs for unknown names.
    const actual=await this.password(fields.password,u?.salt||'d4e86ac3e79a4094b62e98c1adf8b142');
    const expected=u?Buffer.from(u.passwordHash,'hex'):Buffer.alloc(32);
    if(expected.length!==actual.length||!timingSafeEqual(actual,expected)||!u)throw fault('invalid_credentials',401);
    return this.change(data=>{if(previousToken)data.sessions=data.sessions.filter(s=>s.tokenHash!==hash(previousToken));return this.newSession(data,data.users.find(v=>v.id===u.id));});
  }
  async logout(token){if(!token)return;return this.change(data=>{data.sessions=data.sessions.filter(s=>s.tokenHash!==hash(token));});}
  async profile(token,fields){
    const error=Rules.validate(fields,false);if(error)throw fault(error);
    return this.change(data=>{
      const user=this.session(token);if(!user)throw fault('auth_required',401);const u=data.users.find(u=>u.id===user.id),name=Rules.displayName(fields.displayName),now=this.now();
      if(name!==u.displayName){
        const availableAt=u.nameChangedAt?u.nameChangedAt+Progress.RENAME_MS:0;
        if(now<availableAt)throw Object.assign(fault('name_cooldown',409),{availableAt,serverTime:now});
        u.displayName=name;u.nameChangedAt=now;
      }
      u.avatarId=fields.avatarId;return summary(u,now);
    });
  }
  async purchase(token,skin){
    if(!Economy.get(skin)||skin===Economy.DEFAULT)throw fault('skin_invalid');
    return this.change(data=>{
      const session=this.session(token);if(!session)throw fault('auth_required',401);
      const u=data.users.find(u=>u.id===session.id),e=ensureEconomy(u);
      if(e.owned.includes(skin))return {user:summary(u,this.now()),purchased:false};
      if(e.tokens<Economy.PRICE)throw fault('tokens_insufficient',409);
      e.tokens-=Economy.PRICE;e.owned.push(skin);e.revision++;
      return {user:summary(u,this.now()),purchased:true};
    });
  }
  async equip(token,skin){
    if(!Economy.get(skin))throw fault('skin_invalid');
    return this.change(data=>{
      const session=this.session(token);if(!session)throw fault('auth_required',401);
      const u=data.users.find(u=>u.id===session.id),e=ensureEconomy(u);
      if(!e.owned.includes(skin))throw fault('skin_locked',403);
      if(e.equipped!==skin){e.equipped=skin;e.revision++;}
      return summary(u,this.now());
    });
  }
  async developerAdjust(token,{kind,delta,requestId}){
    return this.change(data=>{
      const session=this.session(token);if(!session)throw fault('auth_required',401);
      if(session.id!==DEVELOPER_ID)throw fault('developer_forbidden',403);
      if(!['xp','tokens'].includes(kind)||!Number.isSafeInteger(delta)||delta===0||Math.abs(delta)>1000000||typeof requestId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(requestId))throw fault('developer_invalid');
      const u=data.users.find(u=>u.id===session.id),e=ensureEconomy(u);
      const receipts=u.developerAdjustments||(u.developerAdjustments=[]),previous=receipts.find(r=>r.id===requestId);
      if(previous){
        if(previous.kind!==kind||previous.delta!==delta)throw fault('developer_conflict',409);
        return {user:summary(u,this.now()),applied:false};
      }
      // Debug changes never settle a run, alter a score, or issue level/task rewards.
      if(kind==='xp')u.totalXp=Progress.total(Progress.total(u.totalXp)+delta);
      else e.tokens=Math.max(0,Math.min(1000000000,e.tokens+delta));
      e.revision++;receipts.push({id:requestId,kind,delta,at:this.now()});
      if(receipts.length>128)receipts.splice(0,receipts.length-128);
      return {user:summary(u,this.now()),applied:true};
    });
  }
  leaderboard(){this.open();return this.data.users.filter(u=>u.bestScore>0).sort((a,b)=>b.bestScore-a.bestScore||a.bestAt-b.bestAt||a.id.localeCompare(b.id)).slice(0,10).map(u=>({accountId:u.id,player_name:u.displayName,avatarId:u.avatarId,level:Progress.info(u.totalXp).level,best_score:u.bestScore,updated_at:new Date(u.bestAt).toISOString()}));}
  async beginRun(token,accountId){
    return this.change(data=>{
      const u=this.session(token);if(!u)throw fault('auth_required',401);
      if(accountId&&accountId!==u.id)throw fault('account_changed',409);
      const keep=new Set(data.runs.filter(r=>r.userId===u.id).sort((a,b)=>b.started-a.started).slice(0,127).map(r=>r.id));
      data.runs=data.runs.filter(r=>r.userId!==u.id||keep.has(r.id));const runId=randomBytes(24).toString('hex');
      data.runs.push({id:runId,userId:u.id,mode:'solo',started:this.now(),expires:this.now()+RUN_MS,finished:false});return {runId,accountId:u.id};
    });
  }
  async finishRun(token,{accountId,runId,score,duration,developer,completed,kills=0}){
    if(!Number.isSafeInteger(score)||score<0||score>100000000||!Number.isFinite(duration)||duration<0||duration>86400||developer!==false)throw fault('invalid_score');
    if(!Number.isSafeInteger(kills)||kills<0||kills>10000000)throw fault('invalid_score');
    return this.change(data=>{
      const user=this.session(token);if(!user)throw fault('auth_required',401);
      if(accountId!==user.id)throw fault('account_changed',409);
      const run=data.runs.find(r=>r.id===runId&&r.userId===user.id);if(!run)throw fault('run_invalid',409);
      if(run.mode==='coop')throw fault('run_invalid',409);
      if(run.mode==='solo'&&completed!==true)throw fault('run_incomplete',400);
      if(duration>(this.now()-run.started)/1000+5)throw fault('invalid_score');
      const u=data.users.find(u=>u.id===user.id);
      if(run.finished){if(run.score!==score||(run.duration!==undefined&&run.duration!==duration))throw fault('run_invalid',409);return {user:summary(u,this.now()),reward:run.reward||null};}
      run.finished=true;run.score=score;run.duration=duration;
      if(score>u.bestScore){u.bestScore=score;u.bestAt=this.now();}
      // Pre-upgrade queued runs retain their ranking, but never invent old XP.
      if(run.mode==='solo')run.reward=this.award(u,runId,'solo',score,{kills,seconds:Math.floor(duration)});
      return {user:summary(u,this.now()),reward:run.reward||null};
    });
  }
  award(user,id,mode,score,stats={},completedAt=this.now()){
    const e=ensureEconomy(user),reward={id,accountId:user.id,mode,score,...Progress.reward(user.totalXp,score),completedAt};
    reward.levelTokens=(reward.afterLevel-reward.beforeLevel)*Economy.LEVEL_TOKENS;
    e.tokens+=reward.levelTokens;
    reward.daily=Economy.settle(e,{matches:1,score,kills:stats.kills||0,seconds:stats.seconds||0},completedAt);
    reward.taskTokens=reward.daily.tokens;reward.gainedTokens=reward.levelTokens+reward.taskTokens;reward.balance=e.tokens;
    e.revision++;user.totalXp=reward.afterXp;return reward;
  }
  // Internal only: the authoritative room worker supplies final personal scores.
  async finishCoop(matchId,entries,completedAt=this.now()){
    if(typeof matchId!=='string'||!/^[a-f0-9]{48}$/.test(matchId))throw fault('run_invalid',409);
    const scores=new Map();
    for(const entry of entries){
      if(typeof entry.accountId!=='string'||!Number.isSafeInteger(entry.score)||entry.score<0||entry.score>100000000)throw fault('invalid_score');
      const previous=scores.get(entry.accountId);if(!previous||entry.score>previous.score)scores.set(entry.accountId,{score:entry.score,kills:Number.isSafeInteger(entry.kills)?Math.max(0,entry.kills):0,seconds:Number.isFinite(entry.duration)?Math.max(0,Math.floor(entry.duration)):0});
    }
    if(!scores.size)return [];
    return this.change(data=>[...scores].flatMap(([accountId,stats])=>{
      const score=stats.score;
      const user=data.users.find(u=>u.id===accountId);if(!user)return [];
      const id='coop:'+matchId+':'+accountId,existing=data.runs.find(r=>r.id===id);
      if(existing){if(existing.score!==score)throw fault('run_invalid',409);return [{user:summary(user,this.now()),reward:existing.reward}];}
      const reward=this.award(user,matchId,'coop',score,stats,completedAt);
      data.runs.push({id,userId:accountId,mode:'coop',score,finished:true,reward,started:this.now(),expires:this.now()+RUN_MS});
      return [{user:summary(user,this.now()),reward}];
    }));
  }
  async close(){await this.queue;this.closed=true;if(this.opened){fs.closeSync(this.fd);fs.unlinkSync(this.lock);this.opened=false;}}
}
function cookieToken(req){const match=String(req.headers.cookie||'').match(/(?:^|;\s*)dt_session=([a-f0-9]{64})(?:;|$)/);return match?.[1]||'';}
const loopback=ip=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(ip);
function secure(req){return !!req.socket.encrypted||(loopback(req.socket.remoteAddress)&&req.headers['x-forwarded-proto']==='https');}
function sameOrigin(req){
  if(req.headers['sec-fetch-site']==='cross-site')return false;
  if(!req.headers.origin)return true;
  try{const origin=new URL(req.headers.origin);return origin.host===req.headers.host&&origin.protocol===(secure(req)?'https:':'http:');}catch{return false;}
}
function createAccountAPI(store,{changed=()=>{},signedOut=()=>{},signedIn=()=>{}}={}){
  const limits=new Map();
  function limit(key,max,window){const now=Date.now();if(limits.size>10000)for(const [k,v] of limits)if(v.until<=now)limits.delete(k);const entry=limits.get(key);if(entry&&entry.until>now){if(entry.count>=max)throw fault('slow_down',429);entry.count++;}else limits.set(key,{count:1,until:now+window});}
  function clientIP(req){const remote=req.socket.remoteAddress;return loopback(remote)&&req.headers['x-real-ip']?String(req.headers['x-real-ip']).slice(0,64):remote;}
  function setCookie(res,token,req){res.setHeader('Set-Cookie',`dt_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token?SESSION_MS/1000:0}${secure(req)?'; Secure':''}`);}
  async function body(req){
    if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw fault('json_required',415);
    if(Number(req.headers['content-length'])>4096)throw fault('body_too_large',413);
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>4096)throw fault('body_too_large',413);chunks.push(chunk);}
    let value;try{value=JSON.parse(Buffer.concat(chunks).toString());}catch{throw fault('invalid_json');}
    if(!value||typeof value!=='object'||Array.isArray(value))throw fault('invalid_json');return value;
  }
  return async(req,res,url)=>{
    const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(JSON.stringify(data));};
    try{
      if(!sameOrigin(req))throw fault('origin',403);
      const token=cookieToken(req),route=url.pathname,method=req.method;
      if(method==='GET'&&route==='/api/account'){return reply(200,{user:store.session(token)});}
      if(method==='GET'&&route==='/api/leaderboard'){limit('read:'+clientIP(req),120,60000);return reply(200,{rows:store.leaderboard()});}
      if(!['POST','PATCH'].includes(method))throw fault('not_found',404);
      if(!secure(req)&&!loopback(req.socket.remoteAddress))throw fault('https_required',403);
      const fields=await body(req),ip=clientIP(req);
      limit('write:'+ip,60,60000);
      if(method==='POST'&&(route==='/api/register'||route==='/api/login')){
        limit('auth:'+ip,25,15*60000);
        if(route==='/api/register'){const invalid=Rules.validate(fields);if(invalid)throw fault(invalid);limit('register:'+ip,6,3600000);}
        else if(typeof fields.username==='string')limit('login:'+fields.username.toLowerCase().slice(0,25),15,15*60000);
        const result=route==='/api/register'?await store.register(fields,token):await store.login(fields,token);
        signedIn(result.user,result.token,req);if(token)signedOut(token);setCookie(res,result.token,req);return reply(route==='/api/register'?201:200,{user:result.user});
      }
      if(method==='POST'&&route==='/api/logout'){await store.logout(token);setCookie(res,'',req);if(token)signedOut(token);return reply(200,{user:null});}
      const user=store.session(token);if(!user)throw fault('auth_required',401);
      if(method==='PATCH'&&route==='/api/profile'){const updated=await store.profile(token,fields);changed(updated);return reply(200,{user:updated});}
      if(method==='POST'&&route==='/api/shop/purchase'){const result=await store.purchase(token,fields.skin);changed(result.user);return reply(200,result);}
      if(method==='PATCH'&&route==='/api/appearance'){const updated=await store.equip(token,fields.skin);changed(updated);return reply(200,{user:updated});}
      if(method==='POST'&&route==='/api/developer/adjust'){const result=await store.developerAdjust(token,fields);changed(result.user);return reply(200,result);}
      if(method==='POST'&&route==='/api/runs'){limit('run:'+user.id,12,60000);return reply(201,await store.beginRun(token,fields.accountId));}
      if(method==='POST'&&route==='/api/scores'){const result=await store.finishRun(token,fields);changed(result.user);return reply(200,result);}
      throw fault('not_found',404);
    }catch(e){if(!e.status)console.error('Account storage error:',e.message);if(!res.headersSent)reply(e.status||503,{error:e.status?e.code:'service_unavailable',...(e.code==='name_cooldown'?{availableAt:e.availableAt,serverTime:e.serverTime}:{})});else res.end();}
  };
}
module.exports={AccountStore,createAccountAPI,cookieToken,sameOrigin,SESSION_MS};
