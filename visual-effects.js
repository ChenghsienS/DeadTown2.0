// Cosmetic particles have the same time-based motion in solo and co-op. The
// server sends each birth once; receiving a world never rewinds their lifetime.
const VisualEffects=(()=>{
  function advance(p,dt,text=false){
    if(text){p.x+=(p.dx||0)*dt;p.y+=p.vy*dt;}
    else{
      const drag=p.drag||.95,k=-30*Math.log(drag),factor=Math.exp(-k*dt),travel=Math.abs(k)<1e-8?dt:(1-factor)/k,g=p.floaty?-18:0;
      p.x+=p.vx*travel;p.y+=p.vy*travel+(Math.abs(k)<1e-8?g*dt*dt/2:g/k*(dt-travel));
      p.vx*=factor;p.vy=p.vy*factor+g*travel;
    }
    p.life-=dt;
  }
  function list(items,dt,text){let out=0;for(const p of items){advance(p,dt,text);if(p.life>0)items[out++]=p;}items.length=out;}
  function update(dt){list(state.particles,dt,false);list(state.damageTexts,dt,true);}
  function receive(batch,serverTime){
    const age=Math.max(0,serverTime-batch.time);
    for(const key of ['particles','damageTexts'])for(const source of batch[key]||[]){
      if(source.life<=age)continue;const p={...source};if(age)advance(p,age,key==='damageTexts');state[key].push(p);
    }
    // Match the bounded server presentation buffers, without deleting death rigs.
    if(state.particles.length>600)state.particles.splice(0,state.particles.length-600);
    if(state.damageTexts.length>100)state.damageTexts.splice(0,state.damageTexts.length-100);
  }
  return {advance,update,receive};
})();
