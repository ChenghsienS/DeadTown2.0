// Remote actors follow a buffered server timeline, never packet-arrival velocity.
const NetInterpolation=(()=>{
  const tracks=new Map(),EXTRAPOLATE=80;
  let latest=-1,arrival=0,cursor=0,jitter=0,delay=100;
  function reset(){tracks.clear();latest=-1;arrival=cursor=jitter=0;delay=100;}
  function receive(tick,now=performance.now()){
    const time=tick*1000/30;
    if(time<latest)return false;
    if(latest<0)cursor=time-delay;
    else if(time>latest){
      const variation=Math.min(300,Math.abs((now-arrival)-(time-latest)));
      jitter+=(variation-jitter)*.1;delay=Math.max(100,Math.min(200,80+jitter*2.5));
    }
    latest=time;arrival=now;return true;
  }
  function track(id,actor,initial=false){
    let points=tracks.get(id);
    const last=points?.at(-1),discontinuity=last&&(Math.hypot(actor.x-last.x,actor.y-last.y)>220||last.downed!==!!actor.downed);
    if(!points||initial||discontinuity)tracks.set(id,points=[]);
    const point={x:actor.x,y:actor.y,time:latest,downed:!!actor.downed,stopped:actor.dead||actor.connected===false,
      clear:last&&Town.lineClear(last.x,last.y,actor.x,actor.y,actor.radius||0)};
    if(points.at(-1)?.time===latest)points[points.length-1]=point;else points.push(point);
    while(points.length>32)points.shift();
    return !last||initial||discontinuity;
  }
  function advance(dt,now=performance.now()){
    if(latest<0)return;
    const target=latest+Math.min(250,Math.max(0,now-arrival))-delay,drift=target-cursor;
    // Clock corrections change playback speed, never run the timeline backwards.
    if(drift>450)cursor=target;
    else cursor+=dt*1000*(drift>30?1.08:drift<-30?.85:1);
    cursor=Math.min(cursor,latest+EXTRAPOLATE);
  }
  function position(id,actor,flying=false){
    const points=tracks.get(id);if(!points?.length)return null;
    let a=points[0],b=a;
    for(const point of points){if(point.time<=cursor)a=point;else{b=point;break;}b=point;}
    let x=a.x,y=a.y,safePath=false;
    if(b.time>a.time){const f=Math.max(0,Math.min(1,(cursor-a.time)/(b.time-a.time)));x+=(b.x-a.x)*f;y+=(b.y-a.y)*f;safePath=b.clear;}
    else if(points.length>1&&!a.stopped){
      const previous=points.at(-2),span=a.time-previous.time;
      if(span>0){const vx=(a.x-previous.x)/span,vy=(a.y-previous.y)/span;
        if(Math.hypot(vx,vy)<=.9){const ahead=Math.max(0,Math.min(EXTRAPOLATE,cursor-a.time));x+=vx*ahead;y+=vy*ahead;}
      }
    }
    // Clear server-to-server segments are checked once when received, not for
    // every actor on every render frame. Extrapolation still tests collision.
    if(!flying&&!safePath&&(x!==a.x||y!==a.y)){const safe={radius:actor.radius,x:a.x,y:a.y};moveWithWallCollision(safe,x-a.x,y-a.y);x=safe.x;y=safe.y;}
    return {x,y};
  }
  function prune(ids){for(const id of tracks.keys())if(!ids.has(id))tracks.delete(id);}
  return {reset,receive,track,advance,position,prune,get stats(){return {delay,jitter,cursor,latest,tracks:tracks.size};}};
})();
