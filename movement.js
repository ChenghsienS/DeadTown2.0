// The same movement/collision rules serve solo, server authority and client replay.
// Replay changes only the supplied actor: no damage, pickups, audio or particles.
const SurvivorMotion=(()=>{
  const fields=['x','y','radius','speed','speedMul','downed','faceDir','dashCooldown','dashTime','dashVX','dashVY','dashFacing','dashSpinDir','rocketJumpTime','rocketJumpVX','rocketJumpVY','knockbackTime','knockbackVX','knockbackVY'];
  function copy(p){const result={};for(const k of fields)result[k]=p[k];return result;}
  function step(p,dt,input){
    for(const k of ['dashCooldown','dashTime','rocketJumpTime','knockbackTime'])p[k]=Math.max(0,(p[k]||0)-dt);
    const keys=input.keys;let mx=0,my=0;
    if(keys.has('w')||keys.has('arrowup'))my--;
    if(keys.has('s')||keys.has('arrowdown'))my++;
    if(keys.has('a')||keys.has('arrowleft'))mx--;
    if(keys.has('d')||keys.has('arrowright'))mx++;
    const len=Math.hypot(mx,my)||1;mx/=len;my/=len;
    if(p.downed){p.dashTime=p.rocketJumpTime=p.knockbackTime=0;moveWithWallCollision(p,mx*Coop.rescue.crawlSpeed*dt,my*Coop.rescue.crawlSpeed*dt);if(mx)p.faceDir=mx<0?-1:1;return false;}
    let dashed=false;
    if((input.dash||keys.has('shift'))&&p.dashCooldown<=0&&(mx||my)){
      p.dashCooldown=1.3;p.dashTime=.18;p.dashVX=mx*460;p.dashVY=my*460;p.dashFacing=Math.atan2(my,mx);
      p.dashSpinDir=mx<0?-1:mx>0?1:(input.aimX<p.x?-1:1);dashed=true;
    }
    if(input.aimX<p.x-2)p.faceDir=-1;else if(input.aimX>p.x+2)p.faceDir=1;
    if(p.rocketJumpTime>0){
      moveWithWallCollision(p,p.rocketJumpVX*dt,p.rocketJumpVY*dt);
      const damping=Math.pow(ROCKET_JUMP_DAMPING_PER_SECOND,dt);p.rocketJumpVX*=damping;p.rocketJumpVY*=damping;
    }else if(p.knockbackTime>0){
      moveWithWallCollision(p,p.knockbackVX*dt,p.knockbackVY*dt);
      const damping=Math.pow(.08,dt);p.knockbackVX*=damping;p.knockbackVY*=damping;
    }else if(p.dashTime>0)moveWithWallCollision(p,p.dashVX*dt,p.dashVY*dt);
    else moveWithWallCollision(p,mx*p.speed*(p.speedMul||1)*dt,my*p.speed*(p.speedMul||1)*dt);
    return dashed;
  }
  return {copy,step,fields};
})();
