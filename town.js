// Seeded town lots, shared solid geometry, and clearance-aware enemy flow fields.
const Town=(()=>{
  const CELL=24,BUCKET=192;let seed=1,random=Math.random,revision=0;
  let props=[],floors=[],blocks=[],marks=[],landmarks=[],streets={v:[],h:[]};
  let source=null,propSource=null,solidList=[],wallList=[],solidGrid=new Map(),wallGrid=new Map(),nav=new Map();
  const expand=(r,n)=>({x:r.x-n,y:r.y-n,w:r.w+n*2,h:r.h+n*2});
  const choose=a=>a[Math.floor(random()*a.length)];
  const between=(a,b)=>a+(b-a)*random();
  const even=n=>Math.round(n/2)*2;
  const safeZone=()=>({x:WORLD.w/2-115,y:WORLD.h/2-115,w:230,h:230});
  function seedRandom(value){let s=value>>>0;return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  function invalidate(){source=null;nav.clear();revision++;}
  function put(grid,r){for(let y=Math.floor(r.y/BUCKET);y<=Math.floor((r.y+r.h)/BUCKET);y++)for(let x=Math.floor(r.x/BUCKET);x<=Math.floor((r.x+r.w)/BUCKET);x++){
    const key=x+','+y;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(r);}}
  function geometry(){
    if(source===WORLD.buildings&&propSource===props)return;
    source=WORLD.buildings;propSource=props;solidList=[...WORLD.buildings,...props.filter(p=>p.solid)];
    wallList=solidList.flatMap(r=>r.solid?[r]:getBuildingWallRects(r));solidGrid=new Map();wallGrid=new Map();
    for(const r of solidList)put(solidGrid,r);for(const r of wallList)put(wallGrid,r);nav.clear();
  }
  function query(grid,r,test=null){
    const found=new Set(),left=r.x-.01,top=r.y-.01,right=r.x+r.w+.01,bottom=r.y+r.h+.01;
    for(let y=Math.floor(r.y/BUCKET);y<=Math.floor((r.y+r.h)/BUCKET);y++)for(let x=Math.floor(r.x/BUCKET);x<=Math.floor((r.x+r.w)/BUCKET);x++)
      for(const item of grid.get(x+','+y)||[])if(left<item.x+item.w&&right>item.x&&top<item.y+item.h&&bottom>item.y&&!found.has(item)){
        found.add(item);if(test&&test(item))return true;
      }
    return test?false:[...found];
  }
  function obstacles(bounds=null){geometry();return bounds?query(solidGrid,bounds):solidList;}
  // Preview physics uses an empty stage without invalidating live navigation caches.
  function withArtGeometry(draw){
    const saved=[source,propSource,solidList,wallList,solidGrid,wallGrid,nav];
    source=WORLD.buildings;propSource=props;solidList=[];wallList=[];solidGrid=new Map();wallGrid=new Map();nav=new Map();
    try{return draw();}finally{[source,propSource,solidList,wallList,solidGrid,wallGrid,nav]=saved;}
  }
  function walls(bounds=null){geometry();return bounds?query(wallGrid,bounds):wallList;}
  function blocked(x,y,r=1){geometry();return query(solidGrid,{x:x-r,y:y-r,w:r*2,h:r*2},b=>circleRectCollision(x,y,r,b));}
  function lineClear(ax,ay,bx,by,r=0){
    geometry();
    const bounds={x:Math.min(ax,bx)-r-1,y:Math.min(ay,by)-r-1,w:Math.abs(ax-bx)+r*2+2,h:Math.abs(ay-by)+r*2+2};
    return !query(wallGrid,bounds,b=>{
      if(!r)return lineIntersectsRect(ax,ay,bx,by,b);
      // A swept circle has rounded corners. Square inflation would falsely trap
      // a large enemy standing beside the corner of a car or utility cabinet.
      if(lineIntersectsRect(ax,ay,bx,by,{x:b.x-r,y:b.y,w:b.w+2*r,h:b.h})||
         lineIntersectsRect(ax,ay,bx,by,{x:b.x,y:b.y-r,w:b.w,h:b.h+2*r}))return true;
      const dx=bx-ax,dy=by-ay,length2=dx*dx+dy*dy||1;
      for(const x of [b.x,b.x+b.w])for(const y of [b.y,b.y+b.h]){
        const t=clamp(((x-ax)*dx+(y-ay)*dy)/length2,0,1),ex=ax+dx*t-x,ey=ay+dy*t-y;
        if(ex*ex+ey*ey<r*r)return true;
      }return false;
    });
  }
  function addFloor(kind,r,extra={}){const f={kind,...r,...extra};floors.push(f);return f;}
  function addProp(kind,x,y,w,h,extra={},gap=18){
    const p={id:props.length+1,kind,x:even(x),y:even(y),w,h,solid:true,variant:Math.floor(random()*4),...extra};
    if(p.x<42||p.y<42||p.x+w>WORLD.w-42||p.y+h>WORLD.h-42||rectsOverlap(expand(p,25),safeZone()))return null;
    if(WORLD.road.some(r=>rectsOverlap(expand(p,16),r)))return null;
    if([...WORLD.buildings,...props.filter(o=>o.solid)].some(o=>rectsOverlap(expand(p,gap),o)))return null;
    props.push(p);return p;
  }
  function building(role,x,y,w,h,block){
    const b={id:WORLD.buildings.length+1,role,x:even(x),y:even(y),w:even(w),h:even(h),roofAlpha:1,furniture:[],variant:Math.floor(random()*4),blockId:block.id};
    if(rectsOverlap(expand(b,30),safeZone()))return null;
    b.door={x:b.x+even(b.w/2-18),y:b.y+b.h-10,w:36,h:20};
    WORLD.buildings.push(b);
    addFloor('walk',{x:b.x+b.w/2-38,y:b.y+b.h,w:76,h:Math.max(26,block.y+block.h-b.y-b.h+24)});
    if(['hospital','court','townhall','police','fire','market','gas'].includes(role))landmarks.push(b);
    return b;
  }
  function parking(block,role,y,height){
    const p=addFloor('parking',{x:block.x+30,y:even(y),w:block.w-60,h:even(height)},{role,slots:[]});
    if(p.h<96)return;
    const pitch=58,count=Math.floor((p.w-60)/pitch),carY=p.y+p.h-78;
    for(let i=0;i<count;i++)p.slots.push({x:p.x+30+i*pitch,y:carY-4,w:pitch,h:74});
    // Leave an empty bay between cars; the main aisle and building approach stay open.
    const parity=Math.floor(random()*2);let placed=0;
    for(let i=parity;i<count;i+=2){
      if(placed&&random()<.2)continue;const x=p.x+30+i*pitch+12;
      if(Math.abs(x+16-(block.x+block.w/2))<60)continue;
      const kind=role==='hospital'&&!placed?'ambulance':role==='police'?'policecar':role==='fire'&&!placed?'firetruck':random()<.18?'van':'car';
      if(addProp(kind,x,carY,kind==='ambulance'||kind==='firetruck'?34:32,kind==='car'||kind==='policecar'?58:66,{color:choose(['#63777d','#80665c','#66765f','#8b8580','#4b6475'])},22))placed++;
    }
    marks.push({kind:'parkingSign',x:p.x+12,y:p.y+14});
  }
  function park(block){
    const {x,y,w,h}=block;addFloor('park',{x:x+12,y:y+12,w:w-24,h:h-24});
    addFloor('path',{x:x+w/2-62,y:y-20,w:124,h:h+40});addFloor('path',{x:x-20,y:y+h/2-62,w:w+40,h:124});
    const gate=168;
    for(const yy of [y+18,y+h-24])for(const xx of [x+18,x+w/2+gate/2])addProp('fence',xx,yy,w/2-gate/2-36,6,{},0);
    for(const xx of [x+18,x+w-24])for(const yy of [y+18,y+h/2+gate/2])addProp('fence',xx,yy,6,h/2-gate/2-36,{},0);
    for(const sx of [.23,.77])for(const sy of [.23,.77]){
      const xx=x+w*sx,yy=y+h*sy;
      addProp('tree',xx-20,yy-18,40,36,{treeStyle:choose(['oak','pine'])},30);
      if(random()>.3)addFloor('flowers',{x:xx-24,y:yy+56,w:48,h:16});
    }
    addProp('fountain',x+w/2-32,y+h/2-25,64,50,{},22);
    addProp('bench',x+w/2+94,y+h/2-48,48,18,{},18);
    addProp('bench',x+w/2-142,y+h/2+30,48,18,{},18);
    marks.push({kind:'parkSign',x:x+w/2-34,y:y+h-24});
    landmarks.push({role:'park',x:x+w/2-25,y:y+h/2-25,w:50,h:50,blockId:block.id});
  }
  function develop(block){
    const {x,y,w,h,role}=block;
    if(role==='park'){park(block);return;}
    const civic=['hospital','court','townhall','police','fire'].includes(role);
    addFloor(civic?'plaza':'yard',{x:x+10,y:y+10,w:w-20,h:h-20});
    if(role==='residential'&&w>440){
      const bw=even(Math.min(176,(w-172)/2)),bh=even(Math.min(140,h-128));
      for(let i=0;i<2;i++)building('house',x+48+i*(w-bw-96),y+44,bw,bh,block);
      if(h>320)for(let i=0;i<2;i++){
        const xx=x+64+i*(w-160);addFloor('walk',{x:xx-12,y:y+h-200,w:56,h:200});
        addProp('car',xx,y+h-188,32,58,{color:choose(['#63777d','#80665c','#66765f','#8b8580'])},22);
      }
      for(let i=0;i<2;i++)addProp('tree',x+35+i*(w-110),y+h-80,40,36,{treeStyle:'oak'},26);
      addProp('dumpster',x+w/2-22,y+50,44,24,{},26);
    }else{
      const bw=even(Math.min(civic?320:260,w-108)),bh=even(Math.min(civic?184:146,h-(h>360?252:120)));
      const offset=between(-Math.min(24,(w-bw-100)/2),Math.min(24,(w-bw-100)/2));
      const b=building(role==='residential'?'house':role,x+(w-bw)/2+offset,y+42,bw,Math.max(74,bh),block);
      if(b&&h>350&&role!=='gas')parking(block,role,b.y+b.h+76,y+h-22-b.y-b.h-76);
      if(b&&role==='gas'){
        addFloor('forecourt',{x:x+24,y:b.y+b.h+36,w:w-48,h:y+h-24-b.y-b.h-36});
        for(const f of [.25,.75])addProp('pump',x+w*f-12,y+h-100,24,32,{},30);
        addProp('car',x+w*.25-16,y+h-190,32,58,{color:'#8a7d66'},26);
      }
      if(b){
        addProp('tree',x+22,b.y+24,40,36,{treeStyle:'oak'},22);
        addProp('dumpster',x+w-68,b.y+b.h-30,40,26,{},22);
        if(civic)addProp('bench',x+34,y+h-58,48,18,{},22);
        if(role==='warehouse'){addProp('crates',x+24,y+h-78,48,38,{},20);addProp('van',x+w-76,y+h-108,34,68,{color:'#626a67'},22);}
        addProp(role==='house'||role==='residential'?'mailbox':'utility',x+w-58,y+24,role==='residential'?18:30,24,{},18);
        if(civic)addProp('bin',x+34,y+h-100,18,20,{},14);
      }
    }
    for(let i=0;i<4;i++){
      const xx=x+between(25,w-25),yy=y+between(25,h-25);
      marks.push({kind:choose(['paper','crack','leaves','drain']),x:even(xx),y:even(yy),variant:Math.floor(random()*5)});
    }
    if(h>340&&random()>.3){addProp('busstop',x+w-134,y+h-38,88,22,{},20);marks.push({kind:'busSign',x:x+w-188,y:y+h-46});}
    if(h>280){
      addProp('tree',x+w-62,y+20,40,36,{treeStyle:random()<.3?'pine':'oak'},24);
      if(random()>.3)addProp('tree',x+16,y+h/2-18,40,36,{treeStyle:'oak'},24);
    }
    addProp('lamp',x+10,y+h-30,12,12,{},20);
  }
  function ambientDressing(){
    // A separate seed stream keeps the existing lots and furnishings reproducible.
    const rng=seedRandom(seed^0x51a7b0e1),oldRandom=random;random=rng;
    try{
      // Cars sit in curbside lay-bys, outside the 96 px central traffic corridor.
      const place=(vertical,center,lo,hi,side)=>{
        if(hi-lo<320||rng()>.66)return;
        const along=even((lo+hi)/2+(rng()-.5)*Math.min(100,hi-lo-320));
        const facing=vertical?(side>0?0:2):(side>0?1:3),w=vertical?32:58,h=vertical?58:32;
        const p={id:props.length+1,kind:'roadcar',x:vertical?center+(side>0?48:-80):along-w/2,y:vertical?along-h/2:center+(side>0?48:-80),w,h,solid:true,variant:Math.floor(rng()*4),facing,headlights:true,color:choose(['#63777d','#80665c','#66765f','#8b8580','#4b6475'])};
        if(p.x<42||p.y<42||p.x+w>WORLD.w-42||p.y+h>WORLD.h-42||rectsOverlap(expand(p,30),safeZone()))return;
        if([...WORLD.buildings,...props].some(o=>rectsOverlap(expand(p,20),o)))return;
        // Never put a car in an intersection or on a crosswalk.
        if((vertical?streets.h:streets.v).some(v=>Math.abs(along-v)<150))return;
        props.push(p);addFloor('layby',expand(p,7));
      };
      const ys=[0,...streets.h,WORLD.h],xs=[0,...streets.v,WORLD.w];
      for(const x of streets.v)for(let i=0;i<ys.length-1;i++)place(true,x,ys[i],ys[i+1],rng()<.5?-1:1);
      for(const y of streets.h)for(let i=0;i<xs.length-1;i++)place(false,y,xs[i],xs[i+1],rng()<.5?-1:1);
      let barrelCount=0;
      for(const b of blocks){
        // Service yards, residential edges and park entrances; no hospital/fuel fires.
        if(!['warehouse','residential','diner','park'].includes(b.role)||(rng()>.65&&barrelCount>=3))continue;
        const candidates=[[b.x+46,b.y+b.h-62],[b.x+b.w-62,b.y+b.h-86],[b.x+28,b.y+b.h/2]];
        for(let i=0;i<18;i++)candidates.push([b.x+24+rng()*(b.w-72),b.y+24+rng()*(b.h-76)]);
        for(const [x,y] of candidates){
          if(floors.some(f=>['walk','path'].includes(f.kind)&&rectsOverlap(expand({x,y,w:24,h:26},12),f)))continue;
          if(addProp('burnbarrel',x,y,24,26,{firePhase:rng()*30},32)){barrelCount++;break;}
        }
      }
      let lampIndex=0;
      for(const p of props){
        if(p.kind==='lamp'){const v=rng();p.lightMode=lampIndex===0?'steady':lampIndex===1?'fault':lampIndex===2?'off':v<.55?'steady':v<.82?'fault':'off';p.lightPhase=rng()*13;lampIndex++;}
        if(['car','van','policecar','ambulance','firetruck'].includes(p.kind)){p.headlights=rng()<.28;p.facing=0;}
      }
      for(const b of WORLD.buildings){
        b.litWindows=[];if(['fire','warehouse'].includes(b.role)||rng()>(b.role==='hospital'?.9:.6))continue;
        const candidates=[];for(let x=16;x<b.w-24;x+=38)if(Math.abs(x-b.w/2)>34)candidates.push(x);
        for(let i=candidates.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
        b.litWindows=candidates.slice(0,Math.min(candidates.length,1+Math.floor(rng()*3))).sort((a,b)=>a-b);
        b.windowCool=['hospital','pharmacy','police'].includes(b.role);b.windowLevel=.8+rng()*.2;
      }
    }finally{random=oldRandom;}
  }
  function reduceAmbientLights(){
    // Decide which fixtures are powered once per map, never while the camera moves.
    // A separate stream preserves all existing prop positions and navigation.
    const rng=seedRandom(seed^0x37a14e92);
    function retain(items,fraction,disable){
      const shuffled=items.slice();
      for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
      const count=Math.ceil(shuffled.length*fraction);
      for(const item of shuffled.slice(count))disable(item);
      return shuffled.slice(0,count);
    }
    retain(props.filter(p=>p.headlights),.4,p=>p.headlights=false);
    for(const mode of ['steady','fault'])retain(props.filter(p=>p.kind==='lamp'&&p.lightMode===mode),.5,p=>p.lightMode='off');
    const barrels=props.filter(p=>p.kind==='burnbarrel');barrels.forEach(p=>p.burning=true);
    retain(barrels,.5,p=>p.burning=false);
    const buildings=retain(WORLD.buildings.filter(b=>b.litWindows?.length),.5,b=>b.litWindows=[]);
    for(const b of buildings)b.litWindows=[b.litWindows[Math.floor(rng()*b.litWindows.length)]];
  }
  function generate(value=(Math.random()*4294967296)>>>0){
    seed=value>>>0;random=seedRandom(seed);props=[];floors=[];blocks=[];marks=[];landmarks=[];WORLD.buildings=[];WORLD.road=[];
    streets={v:[480,1080,1800,2550,3150].map((x,i)=>even(i===2?x:x+between(-38,38))),h:[360,960,1560,2100].map(y=>even(y+between(-28,28)))};
    for(const x of streets.v)WORLD.road.push({x:x-56,y:0,w:112,h:WORLD.h});
    for(const y of streets.h)WORLD.road.push({x:0,y:y-56,w:WORLD.w,h:112});
    for(const r of WORLD.road)addFloor('sidewalk',expand(r,24));
    const xs=[-16,...streets.v,WORLD.w+16],ys=[-16,...streets.h,WORLD.h+16];
    const civicRow=1+Math.floor(random()*2),civicCol=1+Math.floor(random()*2),special=new Map();
    special.set(civicCol+','+civicRow,'townhall');special.set((civicCol+1)+','+civicRow,'court');
    special.set(civicCol+','+(civicRow===1?2:1),'park');special.set((civicCol+1)+','+(civicRow===1?2:1),'hospital');
    const others=[];for(let row=1;row<4;row++)for(let col=1;col<5;col++)if(!special.has(col+','+row))others.push(col+','+row);
    for(let i=others.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[others[i],others[j]]=[others[j],others[i]];}
    for(const role of ['gas','police','fire','market','park'])if(others.length)special.set(others.pop(),role);
    for(let row=0;row<ys.length-1;row++)for(let col=0;col<xs.length-1;col++){
      const b={id:blocks.length+1,col,row,x:xs[col]+86,y:ys[row]+86,w:xs[col+1]-xs[col]-172,h:ys[row+1]-ys[row]-172,
        role:special.get(col+','+row)||choose(['residential','residential','market','diner','warehouse','pharmacy'])};
      blocks.push(b);develop(b);
    }
    // Crossings and street furniture stay outside the uninterrupted traffic lanes.
    for(const x of streets.v)for(const y of streets.h){marks.push({kind:'crossing',x,y});marks.push({kind:'streetSign',x:x+82,y:y+82});}
    ambientDressing();invalidate();repairConnectivity();reduceAmbientLights();TownArt.reset();return seed;
  }
  function gridFor(radius){
    geometry();const r=radius>20?36:20;if(nav.has(r))return nav.get(r);
    const cols=Math.ceil(WORLD.w/CELL),rows=Math.ceil(WORLD.h/CELL),open=new Uint8Array(cols*rows);
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const xx=x*CELL+CELL/2,yy=y*CELL+CELL/2;
      open[y*cols+x]=xx>=r+2&&yy>=r+2&&xx<=WORLD.w-r-2&&yy<=WORLD.h-r-2&&!blocked(xx,yy,r+2)?1:0;
    }
    const g={radius:r,cols,rows,open,distance:new Int32Array(open.length),goal:-1};nav.set(r,g);return g;
  }
  function cellPoint(g,i){return {x:(i%g.cols)*CELL+CELL/2,y:Math.floor(i/g.cols)*CELL+CELL/2};}
  function nearestCell(g,x,y,visible=false){
    const cx=Math.floor(x/CELL),cy=Math.floor(y/CELL);let result=-1,best=Infinity;
    for(let ring=0;ring<=12;ring++){
      for(let yy=Math.max(0,cy-ring);yy<=Math.min(g.rows-1,cy+ring);yy++)for(let xx=Math.max(0,cx-ring);xx<=Math.min(g.cols-1,cx+ring);xx++){
        if(ring&&Math.max(Math.abs(xx-cx),Math.abs(yy-cy))!==ring)continue;const id=yy*g.cols+xx;if(!g.open[id])continue;
        const p=cellPoint(g,id),d=dist(x,y,p.x,p.y);if(d<best&&(!visible||lineClear(x,y,p.x,p.y))){result=id;best=d;}
      }
      if(result>=0)return result;
    }return -1;
  }
  function flood(g,goal){
    g.distance.fill(-1);if(goal<0)return;const queue=new Int32Array(g.open.length);let head=0,tail=1;queue[0]=goal;g.distance[goal]=0;
    while(head<tail){const id=queue[head++],x=id%g.cols,y=Math.floor(id/g.cols);
      for(const next of [x>0?id-1:-1,x<g.cols-1?id+1:-1,y>0?id-g.cols:-1,y<g.rows-1?id+g.cols:-1])if(next>=0&&g.open[next]&&g.distance[next]<0){g.distance[next]=g.distance[id]+1;queue[tail++]=next;}}
    g.goal=goal;return tail;
  }
  function repairConnectivity(){
    // Remove only dressings next to isolated pockets. Buildings have wide setbacks.
    for(let pass=0;pass<8;pass++){
      const isolated=[];
      for(const radius of [20,36]){const g=gridFor(radius),goal=nearestCell(g,WORLD.w/2,WORLD.h/2);flood(g,goal);
        for(let i=0;i<g.open.length;i++)if(g.open[i]&&g.distance[i]<0)isolated.push(cellPoint(g,i));}
      if(!isolated.length)return;
      const old=props.length;props=props.filter(p=>!p.solid||!isolated.some(q=>circleRectCollision(q.x,q.y,72,p)));invalidate();if(props.length===old)return;
    }
  }
  function flow(radius){const base=gridFor(radius),key='flow/'+base.radius+'/'+(Coop.server?player.id:'single');let g=nav.get(key);if(!g){g={...base,distance:new Int32Array(base.open.length),goal:-1};nav.set(key,g);}if(g.targetX!==player.x||g.targetY!==player.y){const goal=nearestCell(g,player.x,player.y,true);if(g.goal!==goal)flood(g,goal);g.targetX=player.x;g.targetY=player.y;}return g;}
  function chase(z,dt){
    const tx=player.x,ty=player.y,r=z.radius+1;
    if(lineClear(z.x,z.y,tx,ty,r)){const d=dist(z.x,z.y,tx,ty)||1;moveWithWallCollision(z,(tx-z.x)/d*z.speed*dt,(ty-z.y)/d*z.speed*dt);return;}
    if(z.navRevision===revision&&state.time<(z.navUntil||0)&&dist(z.x,z.y,z.navX,z.navY)>4&&lineClear(z.x,z.y,z.navX,z.navY,r)){
      const d=dist(z.x,z.y,z.navX,z.navY),step=Math.min(z.speed*dt,d);moveWithWallCollision(z,(z.navX-z.x)/d*step,(z.navY-z.y)/d*step);return;
    }
    const g=flow(z.radius);let best=null,score=Infinity;
    const cx=Math.floor(z.x/CELL),cy=Math.floor(z.y/CELL);
    // Visible candidates let agents leave edge cells after knockback or crowd pushes.
    for(let yy=Math.max(0,cy-3);yy<=Math.min(g.rows-1,cy+3);yy++)for(let xx=Math.max(0,cx-3);xx<=Math.min(g.cols-1,cx+3);xx++){
      const id=yy*g.cols+xx;if(g.distance[id]<0||!g.open[id])continue;const p=cellPoint(g,id),d=dist(z.x,z.y,p.x,p.y);
      const value=g.distance[id]+d/CELL*1.02;
      if(d<3||value>=score||!lineClear(z.x,z.y,p.x,p.y,r))continue;
      score=value;best=p;
    }
    if(best){z.navX=best.x;z.navY=best.y;z.navUntil=state.time+.16;z.navRevision=revision;const d=dist(z.x,z.y,best.x,best.y)||1,step=Math.min(z.speed*dt,d);moveWithWallCollision(z,(best.x-z.x)/d*step,(best.y-z.y)/d*step);}
  }
  function clearDecor(){props=[];floors=[];marks=[];landmarks=[];blocks=[];invalidate();}
  function isPaved(x,y){return floors.some(f=>['walk','path','plaza','parking','forecourt','sidewalk'].includes(f.kind)&&pointInRect(x,y,f));}
  return {generate,obstacles,walls,blocked,lineClear,chase,gridFor,flood,nearestCell,cellPoint,clearDecor,invalidate,isPaved,withArtGeometry,
    get seed(){return seed;},get revision(){return revision;},get props(){return props;},get floors(){return floors;},get blocks(){return blocks;},get marks(){return marks;},get landmarks(){return landmarks;},get streets(){return streets;},CELL};
})();
