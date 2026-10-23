// Shared solo/server broad phase. The dynamic buckets preserve the old i,j
// collision order, including actors pushed across a bucket boundary mid-pass.
const Crowd=(()=>{
  const SIZE=96;let stats={actors:0,checks:0,contacts:0};
  // Built once for a projectile pass, before enemies move. Keep original order
  // so overlapping targets and penetrating shots retain the same hit priority.
  function index(actors,pad=0){
    const cells=new Map();let radius=pad;
    actors.forEach((o,i)=>{radius=Math.max(radius,(o.radius||0)+pad);const key=Math.floor(o.x/SIZE)+','+Math.floor(o.y/SIZE);if(!cells.has(key))cells.set(key,[]);cells.get(key).push({o,i});});
    return {query(x,y,r=0,reverse=false){
      const reach=r+radius,found=[];
      for(let yy=Math.floor((y-reach)/SIZE);yy<=Math.floor((y+reach)/SIZE);yy++)for(let xx=Math.floor((x-reach)/SIZE);xx<=Math.floor((x+reach)/SIZE);xx++)for(const entry of cells.get(xx+','+yy)||[]){
        const o=entry.o,dx=o.x-x,dy=o.y-y,d=r+(o.radius||0)+pad;if(dx*dx+dy*dy<=d*d)found.push(entry);
      }
      found.sort((a,b)=>reverse?b.i-a.i:a.i-b.i);return found.map(entry=>entry.o);
    }};
  }
  function separate(actors){
    const cells=new Map(),keys=[],fixed=actors.map(z=>BossAttack.fixed(z));
    let maxRadius=0;stats={actors:actors.length,checks:0,contacts:0};
    const key=o=>Math.floor(o.x/SIZE)+','+Math.floor(o.y/SIZE);
    const put=i=>{const k=key(actors[i]);if(k===keys[i])return;cells.get(keys[i])?.delete(i);if(!cells.has(k))cells.set(k,new Set());cells.get(k).add(i);keys[i]=k;};
    actors.forEach((o,i)=>{maxRadius=Math.max(maxRadius,o.radius||0);put(i);});
    for(let i=0;i<actors.length;i++){
      if(fixed[i])continue;const a=actors[i],r=(a.radius||0)+maxRadius;
      const bounds=()=>[Math.floor((a.x-r)/SIZE),Math.floor((a.y-r)/SIZE),Math.floor((a.x+r)/SIZE),Math.floor((a.y+r)/SIZE)];
      let area=bounds(),last=i;
      const nearby=()=>{const found=[];for(let y=area[1];y<=area[3];y++)for(let x=area[0];x<=area[2];x++)for(const j of cells.get(x+','+y)||[])if(j>last&&!fixed[j])found.push(j);return found.sort((a,b)=>a-b);};
      let candidates=nearby();
      for(let n=0;n<candidates.length;n++){
        const j=candidates[n],b=actors[j];last=j;stats.checks++;
        const dx=a.x-b.x,dy=a.y-b.y,reach=(a.radius||0)+(b.radius||0);
        if(dx*dx+dy*dy>=reach*reach)continue;
        softSeparate(a,b,.12);stats.contacts++;put(i);put(j);
        const next=bounds();
        if(next.some((v,k)=>v!==area[k])){area=next;candidates=nearby();n=-1;}
      }
    }
  }
  return {separate,index,get stats(){return {...stats};}};
})();
