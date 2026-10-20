const silent=()=>{};
const silentModule=new Proxy({isOpen:false,armed:false,settingsHTML:()=>'',stats:{}},{get:(o,k)=>o[k]??silent});
const TownArt=silentModule,Lighting=silentModule,FrameStats=silentModule,DevHorde=silentModule,ArtStudio=silentModule;
const AudioEngine={reset:silent,silenceCombat:silent,play(name,options={}){Coop.emit('audio',{name,ownerId:player.id,options:{...options,x:options.x??player.x,y:options.y??player.y}});},variant(name,count,options={}){Coop.emit('audio',{name,count,ownerId:player.id,options:{...options,x:options.x??player.x,y:options.y??player.y}});},thunder(x,y,grounded){Coop.emit('thunder',{x,y,grounded});}};
const ensureAudio=silent,startBGM=silent,setBGMLevel=silent,playMenuOpen=silent,playMenuClick=silent;
function playShot(kind){} // Shot events drive client audio and muzzle animation together.
function playReload(kind){AudioEngine.play('reload_'+(kind==='arc'?'rocket':kind),{volume:.38});}
function playBoom(x,y,kind){kind==='molotov'?AudioEngine.play('glass',{x,y,volume:.42}):AudioEngine.variant('explosion',2,{x,y,volume:.5});}
const playHit=silent,playGore=silent;
function playPickup(){AudioEngine.play('pickup',{volume:.3});}
function playDash(){AudioEngine.play('roll',{volume:.34});}
function playThrow(){AudioEngine.play('throw',{volume:.25});}
// Keep muzzle math identical to PixelArt.aimPose (verified by integration tests).
const PixelArt={reset:silent,update(dt){for(const o of [...Coop.all(),...state.zombies]){o.artHit=Math.max(0,(o.artHit||0)-dt);if(o.artX!==undefined&&Math.hypot(o.x-o.artX,o.y-o.artY)>.1)o.artFacing=Math.atan2(o.y-o.artY,o.x-o.artX);o.artX=o.x;o.artY=o.y;}},updateDeaths:silent,playerDeath:silent,
  aimPose(o=player,cam=camera()){
    const target=Coop.aim(o,cam),targetX=target.x,targetY=target.y;
    const initial=Math.atan2(targetY-(o.y-6),targetX-o.x),sector=((Math.round(initial/(Math.PI/4))%8)+8)%8;
    const shoulder=sector===5?-9:sector===6||sector===7?9:0;
    const baseX=o.x+shoulder,baseY=o.y-6,angle=Math.atan2(targetY-baseY,targetX-baseX);
    const dx=Math.cos(angle),dy=Math.sin(angle),flip=dx<0?-1:1,x=baseX+dx*4,y=baseY+dy*4;
    const length=o.weapon==='arc'?32:o.weapon==='rocket'||o.weapon==='flamethrower'?30:28;
    return {angle,dx,dy,flip,x,y,targetX,targetY,muzzleX:x+dx*length,muzzleY:y+dy*length,sector:((Math.round(angle/(Math.PI/4))%8)+8)%8};
  },
  shot(angle,kind){Coop.emit('shot',{id:player.id,x:player.x,y:player.y,angle,kind,shotId:player.shotSerial});},
  hit(o){o.artHit=.13;},
  death(z,cause){Coop.emit('death',{z:{...z},cause});}
};
