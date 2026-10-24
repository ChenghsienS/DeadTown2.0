// Shared progression rules. Account totals and rewards are committed by the server.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AccountProgress=factory();})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const MAX_LEVEL=100,RENAME_MS=3*86400000,SCORE_PER_XP=10;
  const costs=Array.from({length:MAX_LEVEL-1},(_,i)=>500+100*i+5*i*i);
  const thresholds=[0];for(const cost of costs)thresholds.push(thresholds.at(-1)+cost);
  const MAX_XP=thresholds.at(-1);
  function total(value){return Math.min(MAX_XP,Math.max(0,Number.isFinite(value)?Math.floor(value):0));}
  function info(value){
    const totalXp=total(value);let level=1;
    while(level<MAX_LEVEL&&totalXp>=thresholds[level])level++;
    const maxed=level===MAX_LEVEL,levelXp=maxed?0:totalXp-thresholds[level-1],nextLevelXp=maxed?0:costs[level-1];
    return {level,totalXp,levelXp,nextLevelXp,maxed,progress:maxed?1:levelXp/nextLevelXp};
  }
  function earned(score){return Number.isSafeInteger(score)&&score>=0?Math.floor(score/SCORE_PER_XP):0;}
  function reward(value,score){const before=info(value),earnedXp=earned(score),after=info(before.totalXp+earnedXp);return {beforeXp:before.totalXp,afterXp:after.totalXp,beforeLevel:before.level,afterLevel:after.level,earnedXp,gainedXp:after.totalXp-before.totalXp};}
  return {MAX_LEVEL,MAX_XP,RENAME_MS,SCORE_PER_XP,info,earned,reward,total,thresholds:Object.freeze(thresholds),costs:Object.freeze(costs)};
});
