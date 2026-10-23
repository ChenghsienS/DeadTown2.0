// Soft, occluded 2D lighting. All distances are in world pixels.
const LIGHTING = {
  beamLength: 440,
  beamAngle: 52, // Full cone angle, degrees.
  beamFalloff: 190, // Distance at which the center is about half as bright.
  beamStrength: 0.88,
  ambientDarkness: 0.76,
  playerFillRadius: 96,
  playerFillStrength: 0.56,
  tintStrength: 0.035,
  shadowSoftness: 0, // Low-resolution mask supplies anti-aliased edges without per-light blur.
  resolutionScale: 0.65
};

const Lighting = (() => {
  let lightLayer, illumination, darkness, environmentTint, scale=1;const beams=new Map(),glows=new Map();
  let wallSource=null, walls=[],wallMap=new Map(),stats={lights:0,casters:0};
  let muzzle=null;
  function surface(){ return document.createElement('canvas'); }
  function setup(){
    if(!lightLayer){lightLayer=surface();illumination=surface();darkness=surface();environmentTint=surface();}
    scale=Math.min(LIGHTING.resolutionScale, 1100/Math.max(1,SW), 750/Math.max(1,SH));
    const w=Math.ceil(SW*scale), h=Math.ceil(SH*scale);
    for(const s of [lightLayer,illumination,darkness,environmentTint]) if(s.width!==w||s.height!==h){s.width=w;s.height=h;}
  }
  function beamTexture(length,angle,falloffDistance,color='255,244,218'){
    const key=[length,angle,falloffDistance,color].join('/');if(beams.has(key))return beams.get(key);
    const halfAngle=angle*Math.PI/360,beam=surface();beam.width=Math.ceil(length);beam.height=Math.ceil(2*length*Math.sin(halfAngle));
    const c=beam.getContext('2d'),pixels=c.createImageData(beam.width,beam.height),rgb=color.split(',').map(Number);
    const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
    for(let y=0;y<beam.height;y++)for(let x=0;x<beam.width;x++){
      const dx=x+0.5,dy=y+0.5-beam.height/2,distance=Math.hypot(dx,dy),a=Math.abs(Math.atan2(dy,dx));
      if(a>=halfAngle||distance>=length)continue;
      const edge=1-smooth((a/halfAngle-0.7)/0.3),reach=1-smooth((distance/length-0.78)/0.22);
      const falloff=0.98/(1+Math.pow(distance/falloffDistance,1.5)),alpha=edge*reach*falloff*Math.min(1,distance/9),i=(y*beam.width+x)*4;
      pixels.data[i]=rgb[0];pixels.data[i+1]=rgb[1];pixels.data[i+2]=rgb[2];pixels.data[i+3]=Math.round(alpha*255);
    }
    c.putImageData(pixels,0,0);beams.set(key,beam);if(beams.size>8)beams.delete(beams.keys().next().value);return beam;
  }
  function rectCaster(r){
    return {x:r.x+r.w/2,y:r.y+r.h/2,r:Math.hypot(r.w,r.h)/2,kind:'wall',rect:r,
      points:[{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}]};
  }
  function glowTexture(radius,color){
    const key=radius+'/'+color;if(glows.has(key))return glows.get(key);
    const s=surface(),size=Math.ceil(radius*2);s.width=s.height=size;const c=s.getContext('2d'),g=c.createRadialGradient(radius,radius,0,radius,radius,radius);
    for(const [stop,alpha] of [[0,1],[.26,.85],[.65,.28],[1,0]])g.addColorStop(stop,`rgba(${color},${alpha})`);
    c.fillStyle=g;c.fillRect(0,0,size,size);glows.set(key,s);if(glows.size>20)glows.delete(glows.keys().next().value);return s;
  }
  // Cull by the illuminated footprint in world space, never by player distance
  // or a nearest-N budget. An offscreen emitter can still light the viewport.
  function bounds(source){
    const r=source.radius;
    if(!source.beam)return {left:source.x-r,top:source.y-r,right:source.x+r,bottom:source.y+r};
    const a=source.angle,half=(source.beamAngle??LIGHTING.beamAngle)*Math.PI/360;
    const angles=[a-half,a+half];
    for(let i=0;i<4;i++){const v=i*Math.PI/2;if(Math.abs(Math.atan2(Math.sin(v-a),Math.cos(v-a)))<=half)angles.push(v);}
    const xs=[source.x,...angles.map(v=>source.x+Math.cos(v)*r)],ys=[source.y,...angles.map(v=>source.y+Math.sin(v)*r)];
    return {left:Math.min(...xs),top:Math.min(...ys),right:Math.max(...xs),bottom:Math.max(...ys)};
  }
  function visible(source,cam=camera()){
    const b=bounds(source),pad=3;
    return b.right>=cam.x-pad&&b.bottom>=cam.y-pad&&b.left<=cam.x+SW+pad&&b.top<=cam.y+SH+pad;
  }
  function casters(cam=camera(),sources=null){
    if(wallSource!==Town.walls()){
      wallSource=Town.walls();
      walls=wallSource.map(rectCaster);wallMap=new Map(walls.map(o=>[o.rect,o]));
    }
    let result;
    if(sources){
      const needed=new Set();for(const s of sources)for(const r of Town.walls({x:s.x-s.radius,y:s.y-s.radius,w:s.radius*2,h:s.radius*2}))needed.add(r);
      result=[...needed].map(r=>wallMap.get(r));
    }else result=walls.slice();
    for(const z of state.zombies){
      if(z.hp<=0||BossAttack.airborne(z))continue;
      // Conservative whole-sprite bound, including bosses. Offscreen bodies are
      // retained whenever they can cast into any visible light's footprint.
      if(sources&&!sources.some(s=>(z.x-s.x)**2+(z.y-s.y)**2<=(s.radius+180)**2))continue;
      result.push(PixelArt.caster(z));
    }
    for(const p of Coop.all()){const body=PixelArt.playerCaster(cam,p);if(body)result.push(body);}
    return result;
  }
  // Tangents to a convex silhouette define the two edges of its cast shadow.
  function shadowPolygon(source,object,reach){
    const centerAngle=Math.atan2(object.y-source.y,object.x-source.x);
    let lo=Infinity,hi=-Infinity,left,right;
    for(const p of object.points){
      let a=Math.atan2(p.y-source.y,p.x-source.x)-centerAngle;
      a=Math.atan2(Math.sin(a),Math.cos(a));
      if(a<lo){lo=a;left=p;}if(a>hi){hi=a;right=p;}
    }
    const extend=p=>{const dx=p.x-source.x,dy=p.y-source.y,d=Math.hypot(dx,dy)||1;return {x:p.x+dx/d*reach,y:p.y+dy/d*reach};};
    return [left,extend(left),extend(right),right];
  }
  // Clip extended shadows before rasterizing: keeps soft-shadow buffers small and
  // avoids offscreen polygon bounds changing the result as the camera moves.
  function clipShadow(points,cam){
    let polygon=points.map(p=>({x:p.x-cam.x,y:p.y-cam.y}));
    for(const [axis,bound,greater] of [['x',-8,true],['x',SW+8,false],['y',-8,true],['y',SH+8,false]]){
      const out=[];
      for(let i=0;i<polygon.length;i++){
        const a=polygon[i],b=polygon[(i+1)%polygon.length];
        const insideA=greater?a[axis]>=bound:a[axis]<=bound;
        const insideB=greater?b[axis]>=bound:b[axis]<=bound;
        if(insideA)out.push(a);
        if(insideA!==insideB){const t=(bound-a[axis])/(b[axis]-a[axis]);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}
      }
      polygon=out;if(!polygon.length)break;
    }
    return polygon;
  }
  function drawLight(source,objects,cam){
    if(source.strength<=0)return;
    // Impacts can finish a few pixels inside a wall. Place the visual emitter
    // on its nearest surface so explosions still light the side they hit.
    if(!source.beam){
      source={...source};
      for(let pass=0;pass<4;pass++){
        const hit=objects.find(o=>o.kind==='wall'&&o.rect!==source.ignoreRect&&pointInRect(source.x,source.y,o.rect));
        if(!hit)break;
        const r=hit.rect;
        const candidates=[{x:r.x-0.75,y:source.y},{x:r.x+r.w+0.75,y:source.y},{x:source.x,y:r.y-0.75},{x:source.x,y:r.y+r.h+0.75}];
        candidates.sort((a,b)=>Math.hypot(a.x-source.x,a.y-source.y)-Math.hypot(b.x-source.x,b.y-source.y)||Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y));
        source.x=candidates[0].x;source.y=candidates[0].y;
      }
    }
    const b=bounds(source);
    // Clear and blend only this footprint. All visible lights remain active even
    // in a dense street, without a full-screen buffer pass for every lamp.
    const left=Math.max(0,Math.floor((b.left-cam.x-3)*scale)),top=Math.max(0,Math.floor((b.top-cam.y-3)*scale));
    const right=Math.min(lightLayer.width,Math.ceil((b.right-cam.x+3)*scale)),bottom=Math.min(lightLayer.height,Math.ceil((b.bottom-cam.y+3)*scale));
    if(right<=left||bottom<=top)return;
    const c=lightLayer.getContext('2d');
    c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-over';c.globalAlpha=1;c.clearRect(left,top,right-left,bottom-top);
    c.save();c.beginPath();c.rect(left,top,right-left,bottom-top);c.clip();
    c.setTransform(scale,0,0,scale,0,0);
    const sx=source.x-cam.x,sy=source.y-cam.y;
    c.save();
    if(source.beam){
      const beam=beamTexture(source.radius,source.beamAngle??LIGHTING.beamAngle,source.falloff??LIGHTING.beamFalloff,source.color);
      c.translate(sx,sy);c.rotate(source.angle);c.globalAlpha=source.strength;
      c.drawImage(beam,0,-beam.height/2);
    }else{
      c.globalAlpha=source.strength;c.drawImage(glowTexture(source.radius,source.color||'255,168,88'),sx-source.radius,sy-source.radius);
    }
    c.restore();
    c.setTransform(1,0,0,1,0,0);
    c.globalCompositeOperation='destination-out';c.fillStyle='#000';
    c.shadowColor=LIGHTING.shadowSoftness>0?'rgba(0,0,0,0.38)':'transparent';c.shadowBlur=LIGHTING.shadowSoftness*scale;
    c.beginPath();const playerShadows=[];
    for(const object of objects){
      if(object.rect&&object.rect===source.ignoreRect)continue;
      if(object.kind==='player'&&source.ignorePlayer&&(source.playerId===undefined||source.playerId===object.entityId))continue;
      if((object.x-source.x)**2+(object.y-source.y)**2>(source.radius+object.r)**2)continue;
      if(object.kind==='wall' && pointInRect(source.x,source.y,object.rect)){
        c.rect(0,0,lightLayer.width,lightLayer.height);break;
      }
      // A light inside an overlapping body should still illuminate its surface.
      if(object.kind==='zombie' && Math.hypot(object.x-source.x,object.y-source.y)<object.r)continue;
      if(object.kind==='player'){
        let sign=0,inside=true;
        for(let i=0;i<object.points.length;i++){
          const a=object.points[i],b=object.points[(i+1)%object.points.length],cross=(b.x-a.x)*(source.y-a.y)-(b.y-a.y)*(source.x-a.x);
          if(Math.abs(cross)<.001)continue;const s=Math.sign(cross);if(sign&&s!==sign){inside=false;break;}sign=s;
        }
        if(inside)continue;
      }
      const points=clipShadow(shadowPolygon(source,object,source.radius*3+120),cam);
      if(points.length<3)continue;
      if(object.kind==='player'){playerShadows.push({object,points});continue;}
      c.moveTo(points[0].x*scale,points[0].y*scale);
      for(let i=1;i<points.length;i++)c.lineTo(points[i].x*scale,points[i].y*scale);
      c.closePath();
    }
    c.fill();
    for(const {object,points} of playerShadows){
      // The player's own silhouette cuts only the floor behind it; keep its
      // painted surface lit. Wall and zombie shadows already applied still win.
      c.save();c.beginPath();c.rect(0,0,lightLayer.width,lightLayer.height);
      object.points.forEach((p,i)=>c[i?'lineTo':'moveTo']((p.x-cam.x)*scale,(p.y-cam.y)*scale));c.closePath();c.clip('evenodd');
      c.beginPath();points.forEach((p,i)=>c[i?'lineTo':'moveTo'](p.x*scale,p.y*scale));c.closePath();c.fill();c.restore();
    }
    c.restore();
    c.shadowBlur=0;c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-over';
    illumination.getContext('2d').drawImage(lightLayer,left,top,right-left,bottom-top,left,top,right-left,bottom-top);
    if(source.environment)environmentTint.getContext('2d').drawImage(lightLayer,left,top,right-left,bottom-top,left,top,right-left,bottom-top);
  }
  function events(cam=camera()){
    const lights=[];
    if(muzzle && state.time<muzzle.until){
      const fade=Math.max(0,(muzzle.until-state.time)/muzzle.duration);
      lights.push({...muzzle,strength:muzzle.strength*fade,priority:10});
    }
    for(const e of state.explosions){
      if(e.bloaterBurst)continue;
      const t=Math.max(0,e.life/e.maxLife);
      lights.push({x:e.x,y:e.y,radius:e.ignitionBurst?148:e.molotov?170:e.rocket?285:245,strength:(e.ignitionBurst?0.42:e.molotov?0.48:0.73)*Math.pow(t,0.65),priority:3});
    }
    for(const f of state.fireZones){
      const flicker=0.96+0.025*Math.sin(state.time*7+f.x)+0.015*Math.sin(state.time*11+f.y);
      lights.push({x:f.x,y:f.y,radius:f.radius+125,strength:0.64*flicker*Math.min(1,f.life/0.7),priority:2});
    }
    for(const r of state.rockets)lights.push({x:r.x,y:r.y,radius:100,strength:0.4,priority:1});
    for(const g of state.grenades)if(g.type==='molotov')lights.push({x:g.x,y:g.y,radius:58,strength:0.3,priority:0});
    // Cluster the flame particles instead of creating a light for every particle.
    const cells=new Map();
    for(const f of state.flameParticles){
      if(f.life<=0)continue;
      const key=Math.floor(f.x/72)+','+Math.floor(f.y/72);
      let cell=cells.get(key);if(!cell){cell={x:0,y:0,n:0};cells.set(key,cell);}
      cell.x+=f.x;cell.y+=f.y;cell.n++;
    }
    for(const cell of cells.values())lights.push({x:cell.x/cell.n,y:cell.y/cell.n,radius:100,strength:Math.min(0.45,0.20+cell.n*0.012),priority:1});
    return lights.filter(l=>l.strength>0&&visible(l,cam));
  }
  function airdrops(cam=camera()){
    return state.airdrops.map(a=>PixelArt.airdropLight(a)).filter(source=>visible(source,cam));
  }
  function render(cam){
    setup();
    const c=illumination.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,illumination.width,illumination.height);
    environmentTint.getContext('2d').clearRect(0,0,environmentTint.width,environmentTint.height);
    const townLights=TownArt.lights(cam),supplyLights=airdrops(cam),sources=[];
    for(const p of Coop.survivors()){
      const target=Coop.aim(p,cam),angle=Math.atan2(target.y-p.y,target.x-p.x),playerId=p.id||'player';
      // Local readability uses the existing occluded fill light, not extra
      // particles. Keep it while crawling; other survivors keep their old fill.
      const local=p===player;
      if(local||p.hp>0)sources.push({x:p.x,y:p.y-(local?12:0),radius:local?LIGHTING.playerFillRadius:52,strength:local?LIGHTING.playerFillStrength:.22,color:'215,225,235',ignorePlayer:true,playerId});
      if(p.downed)continue;
      const source={x:p.x,y:p.y,angle,beam:true,radius:LIGHTING.beamLength,strength:LIGHTING.beamStrength,ignorePlayer:true,playerId};
      sources.push(source);
    }
    sources.push(...Arsenal.flashlights(),...events(cam),...Weather.lights(),...Arsenal.lights(cam),...townLights,...supplyLights);
    const visibleSources=sources.filter(source=>visible(source,cam)),objects=casters(cam,visibleSources);
    stats={lights:visibleSources.length,casters:objects.length};
    for(const source of visibleSources)drawLight(source,objects,cam);
    const d=darkness.getContext('2d');d.globalCompositeOperation='source-over';d.clearRect(0,0,darkness.width,darkness.height);
    d.fillStyle=`rgba(3,5,9,${LIGHTING.ambientDarkness*(1-Weather.flashStrength()*0.78)})`;d.fillRect(0,0,darkness.width,darkness.height);
    d.globalCompositeOperation='destination-out';d.drawImage(illumination,0,0);
    ctx.save();ctx.globalCompositeOperation='source-over';ctx.drawImage(darkness,0,0,SW,SH);
    // A very small warm tint; no additive bloom or white full-screen flashes.
    ctx.globalCompositeOperation='screen';ctx.globalAlpha=LIGHTING.tintStrength;ctx.drawImage(illumination,0,0,SW,SH);
    if(townLights.length||supplyLights.length){ctx.globalAlpha=.1;ctx.drawImage(environmentTint,0,0,SW,SH);}
    const flash=Weather.flashStrength();
    if(flash>0){ctx.globalAlpha=flash*0.065;ctx.fillStyle='#adbdcd';ctx.fillRect(0,0,SW,SH);}
    ctx.restore();
  }
  function flash(angle,weapon,origin=null){
    let x=origin?origin.x:player.x+Math.cos(angle)*23,y=origin?origin.y:player.y+Math.sin(angle)*23;
    if(!Town.lineClear(player.x,player.y,x,y)){x=player.x;y=player.y;}
    const flame=weapon==='flamethrower';
    const duration=flame?0.1:weapon==='gatling'?0.065:0.11;
    muzzle={x,y,radius:flame?110:weapon==='shotgun'?145:100,strength:flame?0.38:0.52,duration,until:state.time+duration,ignorePlayer:true};
  }
  function artPreview(sources){
    setup();const c=illumination.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,illumination.width,illumination.height);
    for(const source of sources)drawLight(source,[],{x:0,y:0});ctx.drawImage(illumination,0,0,SW,SH);
  }
  return {render,flash,artPreview,reset(){muzzle=null;wallSource=null;},shadowPolygon,casters,events,airdrops,bounds,visible,get stats(){return {...stats};}};
})();
