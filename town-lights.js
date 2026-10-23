// Seeded environmental lighting and pixel emitters. Rendering never advances combat.
const TownLights=(()=>{
  const vehicles=new Set(['car','roadcar','van','policecar','ambulance','firetruck']);
  const hash=(a,b=0)=>{let n=Math.imul(a|0,374761393)+Math.imul(b|0,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
  const pixel=(x,y,w,h,color,alpha=1)=>{ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.fillRect(Math.round(x/2)*2,Math.round(y/2)*2,w,h);ctx.restore();};
  const visible=(p,cam,pad=100)=>p.x+p.w>=cam.x-pad&&p.y+p.h>=cam.y-pad&&p.x<=cam.x+SW+pad&&p.y<=cam.y+SH+pad;
  function lampLevel(p,time=state.time){
    const mode=p.lightMode||(p.variant%3?'steady':'off');
    if(mode==='off')return 0;if(mode==='steady')return 1;
    // Occasional local brownouts. The lens and the pool share this exact curve.
    const period=7+hash(p.id||0,41)*4,q=((time+(p.lightPhase||0))%period+period)%period;
    if(q<.24)return 1-q/.24;
    if(q<.48)return .025;
    if(q<.68)return .025+(q-.48)/.2*.9;
    if(q<.88)return .925-(q-.68)/.2*.8;
    if(q<1.1)return .125+(q-.88)/.22*.875;
    return 1;
  }
  function fireLevel(p,time=state.time){const t=time+(p.firePhase||0);return .91+.055*Math.sin(t*7)+.035*Math.sin(t*13.7);}
  function headlamps(p){
    const facing=p.facing||0,angle=facing*Math.PI/2-Math.PI/2,dx=Math.cos(angle),dy=Math.sin(angle);
    const halfLength=(facing%2?p.w:p.h)/2,side=(facing%2?p.h:p.w)/2-7;
    return [-1,1].map(sign=>({x:p.x+p.w/2+dx*(halfLength+1.5)-dy*side*sign,y:p.y+p.h/2+dy*(halfLength+1.5)+dx*side*sign,
      bulbX:p.x+p.w/2+dx*(halfLength-6)-dy*side*sign,bulbY:p.y+p.h/2+dy*(halfLength-6)+dx*side*sign,angle,
      beam:true,radius:290,beamAngle:34,falloff:165,strength:.64,kind:'headlight'}));
  }
  function windows(b){
    return (b.litWindows||[]).map(offset=>({x:b.x+offset+12,y:b.y+b.h+1.5,beam:true,angle:Math.PI/2,radius:112,beamAngle:108,falloff:70,
      strength:.47*(b.windowLevel??1),color:b.windowCool?'190,222,221':'255,192,106',kind:'window',offset}));
  }
  function lights(cam){
    const sources=[];
    for(const p of Town.props){
      if(!visible(p,cam,300))continue;
      if(p.kind==='lamp'&&(p.lightMode!=='off')&&(p.lightMode||p.variant%3))sources.push({x:p.x+p.w/2+14,y:p.y+p.h/2-35,radius:185,strength:.58*lampLevel(p),color:'255,211,137',kind:'streetlamp'});
      else if(vehicles.has(p.kind)&&p.headlights)sources.push(...headlamps(p));
      else if(p.kind==='burnbarrel'&&p.burning!==false)sources.push({x:p.x+p.w/2,y:p.y-2,radius:155,strength:.72*fireLevel(p),color:'255,139,55',kind:'barrel',ignoreRect:p});
    }
    for(const b of WORLD.buildings)if(visible(b,cam,120))sources.push(...windows(b));
    return sources.filter(s=>s.strength>0&&Lighting.visible(s,cam)).map(s=>({...s,environment:true}));
  }
  function drawPropEmission(p,cam){
    if(p.kind==='lamp'){
      const a=lampLevel(p);if(a<=.02)return;const x=p.x+p.w/2+8-cam.x,y=p.y+p.h/2-38-cam.y;
      pixel(x-4,y-4,20,14,'#d69749',a*.12);pixel(x,y,12,6,'#ffce7c',a);pixel(x+2,y,8,2,'#fff0bb',a);
    }else if(vehicles.has(p.kind)&&p.headlights){
      for(const l of headlamps(p)){
        const x=l.bulbX-cam.x,y=l.bulbY-cam.y,horizontal=(p.facing||0)%2;
        pixel(x-6,y-6,12,12,'#eec181',.11);pixel(x-(horizontal?2:3),y-(horizontal?3:2),horizontal?4:6,horizontal?6:4,'#fff2c5');
      }
      const a=(p.facing||0)*Math.PI/2-Math.PI/2,dx=Math.cos(a),dy=Math.sin(a),length=((p.facing||0)%2?p.w:p.h)/2-5;
      for(const sign of [-1,1])pixel(p.x+p.w/2-dx*length-dy*9*sign-cam.x-2,p.y+p.h/2-dy*length+dx*9*sign-cam.y-2,4,4,'#c45543',.7);
    }else if(p.kind==='burnbarrel'&&p.burning!==false){
      const t=state.time+(p.firePhase||0),step=Math.floor(t*10),x=p.x+p.w/2-cam.x,y=p.y+5-cam.y;
      pixel(x-8,y-3,16,6,'#cb5930');pixel(x-6,y-3,12,2,'#f3b15a');
      // Chunky tongues, brighter inner core, charcoal and a few rising embers.
      for(let i=0;i<3;i++){
        const height=(i===1?22:12)+Math.floor(hash(step+i,p.id||3)*5)*2,base=x-6+i*6;
        for(let j=0;j<height;j+=4){
          const f=j/height,width=f>.74?2:f>.4?4:8,bend=Math.round(Math.sin(t*3+i*2+f*3)*f*2)*2;
          const xx=base+bend-width/2,yy=y-j-4;
          pixel(xx-2,yy,width+4,4,'#bc4b25',.9);pixel(xx,yy,width,4,f>.72?'#f5b454':'#ee8830');
          if(f<.38)pixel(xx+2,yy,Math.max(2,width-4),4,'#ffe6a2');
        }
      }
      pixel(x-6,y+1,10,2,'#302e29');pixel(x+2,y-1,6,2,'#65402b');
      for(let i=0;i<5;i++){
        const age=((t*.38+i*.21)%1+1)%1,xx=x+Math.sin(t*1.7+i*2)*7+age*9;
        pixel(xx,y-10-age*66,2,2,i%2?'#ffcf7c':'#e98343',(1-age)*.9);
      }
    }
  }
  function drawWindowEmission(b,cam){
    for(const offset of b.litWindows||[]){
      const civic=['court','townhall'].includes(b.role),x=b.x+offset+(civic?10:2)-cam.x,y=b.y+b.h-18-cam.y,w=civic?12:20,a=b.windowLevel??1;
      pixel(x,y,w,8,b.windowCool?'#c5e3dc':'#edb968',a);
      pixel(x,y,w,2,b.windowCool?'#eff4d9':'#ffe5a4',a);
      pixel(x+(civic?6:8),y,2,8,'#58605a');pixel(x,y+6,w,2,'#9b8760',.65);
    }
  }
  function drawAtmosphere(cam){
    for(const p of Town.props){if(p.kind!=='burnbarrel'||p.burning===false||!visible(p,cam))continue;
      const t=state.time+(p.firePhase||0);
      for(let i=0;i<5;i++){
        const age=((t*.16+i*.2)%1+1)%1,size=6+Math.floor(age*5)*2;
        const x=p.x+p.w/2-cam.x+Math.sin(t*.7+i)*6+age*20-size/2,y=p.y-cam.y-14-age*85;
        pixel(x,y,size,size,'#68706a',Math.sin(age*Math.PI)*.22);
        pixel(x+4,y-2,Math.max(2,size-4),size-2,'#879087',Math.sin(age*Math.PI)*.1);
      }
    }
  }
  function drawEmissive(cam){
    for(const b of WORLD.buildings)if(visible(b,cam,10))drawWindowEmission(b,cam);
    for(const p of Town.props)if(visible(p,cam))drawPropEmission(p,cam);
  }
  return {lampLevel,fireLevel,headlamps,windows,lights,drawAtmosphere,drawEmissive,drawPropEmission,drawWindowEmission};
})();
