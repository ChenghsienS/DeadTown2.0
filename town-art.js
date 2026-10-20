// Original pixel set dressing. Raised objects have the same footprint as collision.
const TownArt=(()=>{
  const cache=new Map();
  let minimapCache=null;
  const names={hospital:['HOSPITAL','医院'],court:['COURTHOUSE','法院'],townhall:['CITY HALL','市政厅'],police:['POLICE','警察局'],fire:['FIRE STATION','消防站'],gas:['FUEL & SERVICE','加油站'],market:['MARKET','超市'],pharmacy:['PHARMACY','药房'],diner:['DINER','餐馆'],warehouse:['DEPOT','仓储区'],house:['RESIDENTIAL','住宅区'],residential:['RESIDENTIAL','住宅区'],park:['MEMORIAL PARK','纪念公园']};
  const colors={hospital:'#81918b',court:'#8d8879',townhall:'#7d8980',police:'#586d7a',fire:'#805951',gas:'#877a5c',market:'#647e77',pharmacy:'#59766c',diner:'#8e7160',warehouse:'#6e7679',house:'#747563'};
  const r=(c,x,y,w,h,color,alpha=1)=>{c.globalAlpha=alpha;c.fillStyle=color;c.fillRect(Math.round(x/2)*2,Math.round(y/2)*2,Math.max(2,Math.round(w/2)*2),Math.max(2,Math.round(h/2)*2));c.globalAlpha=1;};
  const hash=(x,y=0)=>{let n=Math.imul(x|0,374761393)+Math.imul(y|0,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
  const visible=(p,cam,pad=70)=>p.x+p.w>=cam.x-pad&&p.y+p.h>=cam.y-pad&&p.x<=cam.x+SW+pad&&p.y<=cam.y+SH+pad;
  function cached(key,w,h,paint){if(cache.has(key))return cache.get(key);const s=document.createElement('canvas');s.width=Math.ceil(w);s.height=Math.ceil(h);const c=s.getContext('2d');c.imageSmoothingEnabled=false;paint(c);cache.set(key,s);return s;}
  function blit(s,x,y,alpha=1){ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=alpha;ctx.drawImage(s,Math.round(x),Math.round(y));ctx.restore();}
  function ground(cam){
    for(const f of Town.floors){if(!visible(f,cam,0))continue;const x=f.x-cam.x,y=f.y-cam.y;
      const color={sidewalk:'#727771',yard:'#354735',plaza:'#666f6b',walk:'#6b746d',path:'#877f68',park:'#3f573e',parking:'#3c464a',forecourt:'#606967',flowers:'#3f5038',layby:'#414c4e'}[f.kind];
      r(ctx,x,y,f.w,f.h,color||'#3c4b3d');
      if(['sidewalk','plaza','walk','path','forecourt'].includes(f.kind)){
        ctx.save();ctx.beginPath();ctx.rect(x,y,f.w,f.h);ctx.clip();
        for(let yy=Math.max(f.y,Math.floor(cam.y/32)*32);yy<Math.min(f.y+f.h,cam.y+SH);yy+=32){r(ctx,x,yy-cam.y,f.w,2,'#303c3e',.22);
          for(let xx=Math.max(f.x,Math.floor(cam.x/48)*48);xx<Math.min(f.x+f.w,cam.x+SW);xx+=48)r(ctx,xx-cam.x,yy-cam.y,2,32,'#394243',.22);}
        ctx.restore();
      }
      if(f.kind==='park'||f.kind==='yard')for(let i=0;i<Math.floor(f.w*f.h/1800);i++){
        const xx=f.x+hash(i,f.x)*f.w,yy=f.y+hash(i,f.y+71)*f.h;if(xx<cam.x||yy<cam.y||xx>cam.x+SW||yy>cam.y+SH)continue;
        r(ctx,xx-cam.x,yy-cam.y,4,2,'#6a7651',.45);r(ctx,xx-cam.x+2,yy-cam.y-4,2,4,'#263b30',.5);
      }
      if(f.kind==='layby'){r(ctx,x,y,2,f.h,'#a5a58e',.6);r(ctx,x,y,12,2,'#a5a58e',.6);r(ctx,x,y+f.h-2,12,2,'#a5a58e',.6);}
      if(f.kind==='parking'){
        for(const s of f.slots||[]){r(ctx,s.x-cam.x,s.y-cam.y,2,s.h,'#aaa991',.7);r(ctx,s.x-cam.x,s.y+s.h-cam.y,s.w,2,'#aaa991',.7);r(ctx,s.x+s.w-2-cam.x,s.y-cam.y,2,s.h,'#aaa991',.7);}
        r(ctx,x+f.w/2-2,y+10,4,22,'#b0ad91',.55);r(ctx,x+f.w/2-8,y+10,16,4,'#b0ad91',.55);
      }
      if(f.kind==='flowers')for(let i=0;i<12;i++){const xx=x+hash(i,1)*f.w,yy=y+hash(i,5)*f.h;r(ctx,xx,yy,4,4,i%3?'#ad9067':'#9c6565');r(ctx,xx+2,yy+2,2,2,'#d4ba82');}
    }
  }
  function text(c,label,x,y,width,color='#ddd5bb',size=13){c.save();c.font=`bold ${size}px monospace`;c.textAlign='center';c.fillStyle=color;c.fillText(label,x,y,width);c.restore();}
  function icon(c,kind,x,y,color='#d3cdb5'){
    if(kind==='hospital'||kind==='pharmacy'){r(c,x-4,y-14,8,28,color);r(c,x-14,y-4,28,8,color);}
    else if(kind==='court'){r(c,x-16,y-12,32,4,color);r(c,x-12,y-8,4,20,color);r(c,x-2,y-8,4,20,color);r(c,x+8,y-8,4,20,color);r(c,x-18,y+12,36,4,color);}
    else if(kind==='townhall'){r(c,x-2,y-18,4,34,color);r(c,x+2,y-16,18,10,'#a65e55');r(c,x-12,y+14,24,4,color);}
    else if(kind==='police'){r(c,x-10,y-12,20,18,color);r(c,x-6,y+6,12,6,color);r(c,x-2,y-8,4,16,'#526e87');}
    else if(kind==='fire'){r(c,x-4,y-14,8,8,'#d8a06b');r(c,x-10,y-6,20,16,'#bc714f');r(c,x-4,y+2,8,10,'#edc380');}
  }
  function building(b,cam){
    const s=cached('b/'+b.id+'/'+b.role+'/'+b.w+'/'+b.h+'/'+b.variant,b.w+12,b.h+20,c=>{
      const w=b.w,h=b.h,role=b.role,col=colors[role]||colors.house,civic=['hospital','court','townhall','police','fire'].includes(role);
      r(c,8,10,w,h,'#101b20',.45);r(c,0,0,w,h,'#1c292e');r(c,4,4,w-8,h-8,col);
      const roofColor=role==='house'?['#64705b','#74644f','#6e5b55','#4f6561'][b.variant]:({hospital:'#8b9b94',court:'#827b66',townhall:'#54736b',police:'#4b6373',fire:'#6d514a',gas:'#736d57',market:'#4c665e',diner:'#6c5657',pharmacy:'#5b7971',warehouse:'#46535a'}[role]||'#4a575a');
      r(c,6,6,w-12,h-32,roofColor);
      if(role==='house'){
        for(let yy=10;yy<h-24;yy+=12){r(c,8,yy,w-16,2,'#899080',.7);for(let xx=12+(yy%24?0:12);xx<w-10;xx+=28)r(c,xx,yy,2,10,'#3a4947');}
        r(c,w/2-3,8,6,h-34,'#8b9180');r(c,w/2+3,8,4,h-34,'#303e3f');
      }else{
        for(let yy=12;yy<h-30;yy+=20){r(c,10,yy,w-20,2,'#77827f',.27);for(let xx=14;xx<w-20;xx+=36)r(c,xx,yy,2,18,'#2e3c42',.4);}
        for(let i=0;i<(w>240?3:2);i++){const xx=20+i*40;r(c,xx+4,22,26,32,'#24343b');r(c,xx,18,26,30,'#798884');r(c,xx+4,22,18,20,'#34454a');for(let k=0;k<4;k++)r(c,xx+6,24+k*4,14,2,'#9ba699');}
      }
      r(c,2,2,w-4,4,'#b0afa0');r(c,2,h-24,w-4,24,col);r(c,2,h-4,w-4,4,'#b2ac94');r(c,w-6,6,4,h-10,'#2b3a3c');
      const doorX=w/2-18;
      for(let xx=16;xx<w-24;xx+=38)if(Math.abs(xx-w/2)>34){r(c,xx,h-20,24,12,'#1c303a');r(c,xx+2,h-18,20,4,'#718d91');r(c,xx+10,h-18,2,8,'#adada0');}
      if(role==='court'||role==='townhall'){
        if(role==='court'){
          for(let i=0;i<5;i++)r(c,w/2-62+i*10,20+i*5,124-i*20,6,i%2?'#a49a7f':'#b1a88c');
          r(c,w/2-62,46,124,4,'#564f43');
        }else{
          r(c,w/2-24,18,48,44,'#263d40');r(c,w/2-22,16,44,42,'#c3c1a2');r(c,w/2-14,22,28,28,'#354a4b');
          r(c,w/2-2,25,4,14,'#d7d3ae');r(c,w/2-2,35,12,4,'#d7d3ae');r(c,w/2-26,12,52,6,'#829584');
        }
        r(c,14,h-38,w-28,8,'#b3ae97');for(let xx=18;xx<w-20;xx+=38){r(c,xx,h-30,8,26,'#d1c8ad');r(c,xx+6,h-30,4,26,'#787d72');}
        r(c,12,h-4,w-24,4,'#cbc4ab');r(c,18,h,w-36,4,'#848c7b');
      }
      if(role==='market'||role==='diner'||role==='pharmacy'){
        for(let xx=10;xx<w-10;xx+=12)r(c,xx,h-32,Math.min(12,w-10-xx),10,((xx-10)/12)%2?'#afa58b':role==='diner'?'#9e6357':'#587d72');
      }
      if(role==='fire'||role==='warehouse')for(let i=0;i<2;i++){
        const xx=i?(w-70):14;r(c,xx,h-28,52,24,'#202e33');for(let yy=h-26;yy<h-4;yy+=6)r(c,xx+2,yy,48,4,role==='fire'?'#88574c':'#737c79');
      }
      if(civic){icon(c,role,w-48,42,role==='hospital'?'#bd665f':'#c3bca1');}
      if(role==='hospital'){const cy=Math.min(82,h-64);r(c,w/2-36,cy-22,72,46,'#5e7874');r(c,w/2-32,cy-18,64,38,'#778e84');r(c,w/2-14,cy-12,6,26,'#d4d4b7');r(c,w/2+8,cy-12,6,26,'#d4d4b7');r(c,w/2-8,cy-2,16,6,'#d4d4b7');}
      if(role==='gas'){r(c,w-70,20,48,32,'#9b8a60');text(c,'FUEL',w-46,42,44,'#272f32',12);}
      if(role!=='house'){
        const label=names[role]?.[0]||'DEPOT',sy=Math.max(56,h-(role==='hospital'?38:54));r(c,w/2-Math.min(w-32,220)/2,sy-16,Math.min(w-32,220),22,'#1d3035');
        text(c,label,w/2,sy,Math.min(w-44,208),civic?'#e0d8bb':'#c6c4ad',role==='court'?13:14);
      }
      // Sealed doors stay visibly closed: recess, boards, metal bar and hazard corners.
      r(c,doorX,h-22,36,30,'#14232b');for(let i=0;i<3;i++){r(c,doorX+2,h-20+i*8,32,6,'#9b8566');r(c,doorX+4,h-18+i*8,2,2,'#293d43');}
      r(c,doorX+14,h-22,6,28,'#4a5557');r(c,doorX-4,h-22,4,8,'#cfb46a');r(c,doorX+36,h-2,4,8,'#cfb46a');
    });blit(s,b.x-cam.x,b.y-cam.y);
  }
  function propSprite(p){return cached('p/'+p.kind+'/'+p.w+'/'+p.h+'/'+p.variant+'/'+p.color+'/'+(p.facing||0),p.w+20,p.h+24,c=>{
    const w=p.w,h=p.h,k=p.kind;r(c,6,8,w,h,'#122129',.5);
    if(k==='roadcar'){
      const base=propSprite({kind:'car',w:32,h:58,variant:p.variant,color:p.color});
      c.save();c.translate(w/2,h/2);c.rotate((p.facing||0)*Math.PI/2);c.drawImage(base,0,0,32,58,-16,-29,32,58);c.restore();
    }else if(k==='burnbarrel'){
      r(c,2,2,w-4,h-2,'#19272a');r(c,4,4,w-8,h-6,'#52605b');r(c,4,6,4,h-8,'#889080');r(c,w-8,6,4,h-8,'#303d3d');
      r(c,2,8,w-4,4,'#929887');r(c,2,h-8,w-4,4,'#899280');r(c,8,13,6,6,'#855942');r(c,w-10,18,4,4,'#a16d43');
      r(c,0,0,w,8,'#687971');r(c,2,2,w-4,4,'#182327');r(c,6,2,12,2,'#8f5234');
    }else if(['car','van','policecar','ambulance','firetruck'].includes(k)){
      const col=k==='ambulance'?'#b9b8a3':k==='firetruck'?'#9b5a51':k==='policecar'?'#8b9795':p.color||'#6d7d78';
      r(c,0,0,w,h,'#17262b');r(c,2,2,w-4,h-4,col);r(c,0,10,4,12,'#111c22');r(c,w-4,10,4,12,'#111c22');r(c,0,h-22,4,12,'#111c22');r(c,w-4,h-22,4,12,'#111c22');
      r(c,5,12,w-10,k==='van'||k==='ambulance'?10:12,'#223d48');r(c,6,14,w-14,2,'#9cbbbd');r(c,5,h-20,w-10,10,'#263d46');
      r(c,6,28,w-12,h-52,col);r(c,6,26,2,Math.max(6,h-50),'#d1c8ae',.5);r(c,4,4,6,4,'#d2c4a0');r(c,w-10,4,6,4,'#d2c4a0');r(c,4,h-6,6,4,'#9b4b4d');r(c,w-10,h-6,6,4,'#9b4b4d');
      r(c,4,h-2,w-8,2,'#899590');r(c,4,2,w-8,2,'#b8b9a6');
      if(k==='ambulance'){r(c,w/2-3,28,6,22,'#b54f4c');r(c,w/2-10,36,20,6,'#b54f4c');r(c,4,22,w-8,4,'#a35c54');}
      if(k==='policecar'){r(c,5,28,w-10,16,'#263841');r(c,7,24,8,4,'#a35b59');r(c,17,24,8,4,'#587f9c');}
      if(k==='firetruck'){r(c,8,26,4,h-38,'#c4c4ae');r(c,w-12,26,4,h-38,'#c4c4ae');for(let yy=28;yy<h-10;yy+=8)r(c,8,yy,w-16,2,'#c4c4ae');}
      if(p.variant===3&&k==='car'){r(c,w/2-4,6,4,4,'#3c4b4d');r(c,w/2,10,6,2,'#3c4b4d');r(c,5,h-20,8,2,'#b8b3a0');}
    }else if(k==='tree'){
      r(c,0,0,w,h,'#263b35');r(c,0,0,w,4,'#a4a28b');r(c,0,h-4,w,4,'#777f69');r(c,0,0,4,h,'#8d947a');r(c,w-4,0,4,h,'#5f7262');
      r(c,4,4,w-8,h-8,'#413e2d');r(c,w/2-5,h/2-8,10,18,'#74674a');r(c,w/2-3,h/2-8,2,16,'#ab9162');
      r(c,6,h-12,10,4,'#4e5f3c');r(c,w-16,6,10,6,'#536443');
    }else if(k==='fence'){
      r(c,0,0,w,h,'#53635f');if(w>h){r(c,0,0,w,2,'#b4b6a0');for(let x=0;x<w;x+=18){r(c,x,0,4,h+2,'#a2a38a');}}
      else{r(c,0,0,2,h,'#b4b6a0');for(let y=0;y<h;y+=18)r(c,0,y,w+2,4,'#a2a38a');}
      for(const [x,y] of [[0,0],[w-6,h-6]]){r(c,x,y,6,6,'#b7ad80');r(c,x+2,y,2,6,'#333f40');}
    }else if(k==='bench'){
      r(c,0,0,w,h,'#273a3e');for(let y=2;y<h-2;y+=6){r(c,2,y,w-4,4,'#a08a61');r(c,2,y,w-4,2,'#c0a67b');}r(c,4,0,4,h,'#5a6965');r(c,w-8,0,4,h,'#5a6965');
    }else if(k==='dumpster'){
      r(c,0,0,w,h,'#20323b');r(c,2,2,w-4,h-4,'#5c7565');r(c,2,2,w-4,6,'#98a38b');r(c,6,12,w-12,2,'#324a43');r(c,6,h-8,8,4,'#b0ac7d');r(c,w-10,6,4,6,'#9fa78e');
    }else if(k==='busstop'){
      r(c,0,0,w,h,'#243940');r(c,2,2,w-4,8,'#7b8e87');r(c,4,10,w-8,8,'#355363');r(c,8,10,4,8,'#94a6a0');r(c,w/2,10,4,8,'#94a6a0');r(c,w-14,10,4,8,'#94a6a0');r(c,4,h-4,w-8,4,'#a2a697');
    }else if(k==='pump'){
      r(c,0,0,w,h,'#273b3d');r(c,2,2,w-4,h-4,'#a39370');r(c,2,h/2,w-4,h/2-2,'#9b5e50');r(c,4,6,w-8,10,'#233a43');r(c,6,8,8,2,'#a8c5b1');r(c,w-4,12,4,14,'#1c2a2e');
    }else if(k==='fountain'){
      r(c,0,0,w,h,'#536d6a');r(c,0,0,w,6,'#b0b39c');r(c,0,0,6,h,'#9aa68f');r(c,6,6,w-12,h-12,'#375f66');r(c,12,12,w-24,h-24,'#477e7a');r(c,w/2-6,h/2-6,12,12,'#afbba5');r(c,14,h-14,w-28,2,'#7daba0');
    }else if(k==='lamp'){
      r(c,0,0,w,h,'#b2b099');r(c,2,2,w-4,h-4,'#31454a');r(c,w/2-2,0,4,h,'#82908a');
    }else if(k==='utility'){
      r(c,0,0,w,h,'#263c42');r(c,2,2,w-4,h-4,'#7d8880');r(c,4,2,w-8,4,'#bac0aa');r(c,w/2,6,2,h-10,'#35494c');r(c,6,9,8,6,'#c9b76d');r(c,8,11,4,2,'#344b47');
    }else if(k==='bin'||k==='mailbox'){
      r(c,0,0,w,h,'#233c41');r(c,2,2,w-4,h-4,k==='mailbox'?'#456c7b':'#5f796b');r(c,0,0,w,4,'#9aa99b');r(c,4,7,w-8,4,'#182e35');r(c,4,h-6,w-8,2,'#839d8b');
    }else{
      r(c,0,0,w,h,'#33403e');r(c,2,2,w-4,h-4,'#968161');for(let x=6;x<w;x+=12)r(c,x,2,2,h-4,'#b49c70');r(c,2,h/2-2,w-4,4,'#514e3d');
    }
  });}
  function props(cam){for(const p of Town.props)if(visible(p,cam))blit(propSprite(p),p.x-cam.x,p.y-cam.y);}
  function canopies(cam){
    for(const p of Town.props){if(!visible(p,cam)||!['tree','lamp'].includes(p.kind))continue;
      if(p.kind==='lamp'){
        const x=p.x+p.w/2-cam.x,y=p.y+p.h/2-cam.y;r(ctx,x-2,y-38,4,38,'#4a5e62');r(ctx,x-2,y-40,18,4,'#84908b');r(ctx,x+8,y-38,12,6,TownLights.lampLevel(p)>.15?'#d7c391':'#56675f');continue;
      }
      const x=p.x+p.w/2-34,y=p.y-48;
      const overlap=o=>o.x>x-8&&o.x<x+76&&o.y>y-10&&o.y<y+90;
      const fade=overlap(player)||state.zombies.some(overlap)?0.32:0.94;
      const s=cached('tree/crown/'+p.treeStyle+'/'+p.variant,72,80,c=>{
        const pine=p.treeStyle==='pine';
        if(pine){for(let i=0;i<5;i++){const w=16+i*10;r(c,36-w/2,4+i*12,w,18,['#4e6b49','#3e5b41','#4b6847','#375640','#304b39'][i]);r(c,36-w/2+4,4+i*12,w/2,4,'#6e8051');}}
        else{for(const [cx,cy,w,h] of [[14,18,44,44],[4,30,64,26],[20,6,32,58],[10,48,50,20]]){r(c,cx,cy,w,h,'#2c4837');r(c,cx+4,cy,w-8,h-8,'#496343');}
          for(let i=0;i<24;i++){const xx=12+hash(i,p.variant)*48,yy=16+hash(i,7+p.variant)*44;r(c,xx,yy,6+i%3*2,4,i%3?'#718052':'#324f39');}}
      });blit(s,x-cam.x,y-cam.y,fade);
    }
  }
  function markings(cam){
    for(const m of Town.marks){if(m.x<cam.x-140||m.y<cam.y-140||m.x>cam.x+SW+140||m.y>cam.y+SH+140)continue;const x=m.x-cam.x,y=m.y-cam.y;
      if(m.kind==='crossing'){
        r(ctx,x-56,y-56,112,112,'#414d53');for(const side of [-1,1])for(let i=-40;i<=40;i+=16){r(ctx,x+i,y+side*70-10,8,20,'#b8b49a',.75);r(ctx,x+side*70-10,y+i,20,8,'#b8b49a',.75);}
        for(const side of [-1,1]){r(ctx,x-44,y+side*94,88,3,'#a3a18a',.65);r(ctx,x+side*94,y-44,3,88,'#a3a18a',.65);}
      }else if(m.kind==='streetSign'){
        r(ctx,x,y,2,24,'#768d83');r(ctx,x-18,y-6,40,10,'#3f6254');r(ctx,x-14,y-3,22,2,'#bcc7ac');r(ctx,x+10,y-3,6,2,'#bcc7ac');
      }else if(m.kind==='parkingSign'||m.kind==='busSign'||m.kind==='parkSign'){
        const label=m.kind==='parkingSign'?'P':m.kind==='busSign'?'BUS':'PARK',w=label==='P'?18:44;
        r(ctx,x,y,w,20,m.kind==='parkSign'?'#435f46':'#3c6070');r(ctx,x+2,y+2,w-4,2,'#a9bbaa');text(ctx,label,x+w/2,y+15,w-4,'#ded8b8',12);
      }else if(m.kind==='drain'){
        r(ctx,x,y,18,14,'#243b40',.7);for(let i=0;i<4;i++)r(ctx,x+2+i*4,y+2,2,10,'#72817a',.6);
      }else if(m.kind==='paper'){r(ctx,x,y,8,6,'#b5b096',.5);r(ctx,x+2,y+2,4,2,'#70786c',.5);}
      else if(m.kind==='leaves'){for(let i=0;i<5;i++)r(ctx,x+i*4,y+(i%2)*3,4,2,'#97845b',.55);}
      else{r(ctx,x,y,14,2,'#1d3336',.6);r(ctx,x+12,y+2,2,10,'#1d3336',.6);r(ctx,x+12,y+10,8,2,'#1d3336',.6);}
    }
    // Visible map perimeter follows the existing movement boundary.
    if(cam.y<18||cam.y+SH>WORLD.h-18)for(const yy of [2,WORLD.h-4]){
      if(yy<cam.y-12||yy>cam.y+SH+12)continue;r(ctx,-cam.x,yy-cam.y,WORLD.w,2,'#9b9c85');
      for(let xx=Math.max(0,Math.floor(cam.x/24)*24);xx<Math.min(WORLD.w,cam.x+SW+24);xx+=24)r(ctx,xx-cam.x,yy-cam.y-2,4,6,xx%48?'#786f4e':'#a69b68');
    }
    if(cam.x<18||cam.x+SW>WORLD.w-18)for(const xx of [2,WORLD.w-4]){
      if(xx<cam.x-12||xx>cam.x+SW+12)continue;r(ctx,xx-cam.x,-cam.y,2,WORLD.h,'#9b9c85');
      for(let yy=Math.max(0,Math.floor(cam.y/24)*24);yy<Math.min(WORLD.h,cam.y+SH+24);yy+=24)r(ctx,xx-cam.x-2,yy-cam.y,6,4,yy%48?'#786f4e':'#a69b68');
    }
  }
  function lights(cam){return TownLights.lights(cam||camera());}
  function minimap(mx,my,sx,sy){
    // Static terrain is painted once per layout; moving markers stay in game.js.
    if(!minimapCache||minimapCache.revision!==Town.revision||minimapCache.sx!==sx||minimapCache.sy!==sy||minimapCache.buildings!==WORLD.buildings||minimapCache.roads!==WORLD.road){
      const image=document.createElement('canvas');image.width=Math.round(WORLD.w*sx);image.height=Math.round(WORLD.h*sy);
      const c=image.getContext('2d');c.imageSmoothingEnabled=false;
      const rect=(o,color)=>{c.fillStyle=color;c.fillRect(Math.round(o.x*sx),Math.round(o.y*sy),Math.max(1,Math.round(o.w*sx)),Math.max(1,Math.round(o.h*sy)));};
      for(const road of WORLD.road)rect(road,'#34454b');
      const groundColors={sidewalk:'#3e4b4d',yard:'#25312b',plaza:'#3e4b4d',walk:'#465356',path:'#465356',park:'#294535',parking:'#354348',forecourt:'#3e4b4d',flowers:'#294535',layby:'#354348'};
      for(const floor of Town.floors)rect(floor,groundColors[floor.kind]||'#25312b');
      // Closed buildings and solid props use their actual collision footprints.
      // Civic buildings share the same neutral color as residential buildings.
      for(const building of WORLD.buildings){
        rect(building,'#182325');c.fillStyle='#687471';
        c.fillRect(Math.round(building.x*sx)+1,Math.round(building.y*sy)+1,Math.max(1,Math.round(building.w*sx)-2),Math.max(1,Math.round(building.h*sy)-2));
      }
      for(const prop of Town.props)if(prop.solid)rect(prop,'#8a9690');
      minimapCache={image,revision:Town.revision,sx,sy,buildings:WORLD.buildings,roads:WORLD.road};
    }
    blit(minimapCache.image,mx,my);
  }
  function location(){
    if(!state.running||state.gameOver)return;const b=Town.blocks.find(b=>pointInRect(player.x,player.y,b));if(!b)return;
    ctx.save();ctx.font='12px monospace';ctx.textAlign='left';ctx.fillStyle='#c1c9b9';ctx.globalAlpha=.8;
    ctx.fillText(names[b.role]?.[lang==='zh'?1:0]||names.residential[lang==='zh'?1:0],18,96);ctx.restore();
  }
  return {propSprite,artCached:key=>cache.get(key),ground,markings,building,props,canopies,lights,minimap,location,reset(){cache.clear();minimapCache=null;},names};
})();
