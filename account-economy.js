// Shared catalog and daily calendar. Only the server commits balances and rewards.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AccountEconomy=factory();})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const DEFAULT='ranger/0',PRICE=100,LEVEL_TOKENS=150,ZONE='America/New_York';
  const catalog=Object.freeze(['ranger','medic','scavenger','engineer'].flatMap(skinId=>Array.from({length:4},(_,colorId)=>Object.freeze({id:skinId+'/'+colorId,skinId,colorId,price:skinId==='ranger'&&colorId===0?0:PRICE,rarity:skinId==='ranger'&&colorId===0?'starter':'blue'}))));
  const get=id=>catalog.find(s=>s.id===id);
  const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
  function parts(time){return Object.fromEntries(formatter.formatToParts(new Date(time)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));}
  const dateKey=day=>new Date(day).toISOString().slice(0,10);
  function eight(day){const noon=day+12*3600000;return noon+(8-parts(noon).hour)*3600000;}
  function period(now=Date.now()){
    const p=parts(now);let day=Date.UTC(p.year,p.month-1,p.day);if(p.hour<8)day-=86400000;
    return {key:dateKey(day),startsAt:eight(day),nextResetAt:eight(day+86400000),timeZone:ZONE};
  }
  function tasks(key){
    const n=Math.abs(Math.floor(Date.parse(key+'T00:00:00Z')/86400000))%3;
    return [
      {id:'finish',difficulty:'easy',metric:'matches',target:1,reward:15},
      {id:'scout',difficulty:'easy',metric:'kills',target:[20,25,30][n],reward:15},
      {id:'hold',difficulty:'easy',metric:'seconds',target:[60,90,120][n],reward:15},
      {id:'clear',difficulty:'medium',metric:'kills',target:[100,120,150][n],reward:30},
      {id:'supply',difficulty:'medium',metric:'score',target:[5000,6000,7500][n],reward:30},
      {id:'elite',difficulty:'hard',metric:'bestScore',target:[10000,12000,15000][n],reward:50}
    ];
  }
  function initial(level=1){return {version:1,revision:1,tokens:Math.max(0,Math.min(99,level-1))*LEVEL_TOKENS,owned:[DEFAULT],equipped:DEFAULT,days:{}};}
  function daily(economy,now){
    const p=period(now),record=economy?.days?.[p.key];
    return {...p,tasks:tasks(p.key).map(t=>({...t,progress:Math.min(t.target,record?.progress?.[t.metric]||0),claimed:!!record?.claimed?.includes(t.id)}))};
  }
  function settle(economy,stats,completedAt){
    const before=daily(economy,completedAt),key=before.key;
    const record=economy.days[key]||(economy.days[key]={progress:{},claimed:[]});
    for(const metric of ['matches','kills','seconds','score'])record.progress[metric]=(record.progress[metric]||0)+(stats[metric]||0);
    record.progress.bestScore=Math.max(record.progress.bestScore||0,stats.score||0);
    let tokens=0;const completed=[];
    for(const task of tasks(key))if(record.progress[task.metric]>=task.target&&!record.claimed.includes(task.id)){record.claimed.push(task.id);tokens+=task.reward;completed.push(task.id);}
    economy.tokens+=tokens;
    for(const old of Object.keys(economy.days).sort().slice(0,-8))delete economy.days[old];
    return {tokens,completed,before,after:daily(economy,completedAt)};
  }
  return {DEFAULT,PRICE,LEVEL_TOKENS,ZONE,catalog,get,period,tasks,initial,daily,settle};
});
