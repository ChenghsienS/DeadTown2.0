'use strict';
const {Encoder}=require('../snapshot-codec.js');
// A slow peer gets the newest world, not seconds of obsolete queued worlds.
// Events are retained across replaced snapshots so deaths / revives still play.
class SnapshotStream{
  constructor(socket){this.socket=socket;this.generation=0;this.encoder=null;this.reset();}
  enableCodec(){this.encoder=new Encoder();}
  keyframe(){this.encoder?.keyframe();}
  reset(){clearTimeout(this.timer);this.timer=null;this.generation++;this.busy=false;this.pending=null;this.events=new Map();this.blockedAt=0;this.encoder?.reset();}
  offer(payload){
    if(this.socket.readyState!==1)return;
    if(this.busy||this.socket.bufferedAmount>65536||this.pending){
      const message=typeof payload==='string'?JSON.parse(payload):payload;this.pending=message;
      for(const event of message.snapshot.events)this.events.set(event.n,event);
      if(this.events.size>2400){this.socket.close(1013,'Connection too slow');this.reset();return;}
      this.flush();
    }else this.write(payload);
  }
  write(payload){
    const generation=this.generation;this.busy=true;
    if(this.encoder){const message=typeof payload==='string'?JSON.parse(payload):payload;payload=this.encoder.serialize(message.snapshot);}
    else if(typeof payload!=='string')payload=JSON.stringify(payload);
    this.socket.send(payload,error=>{
      if(generation!==this.generation)return;
      this.busy=false;
      if(error){this.reset();return;}
      this.flush();
    });
  }
  flush(){
    if(this.busy||!this.pending||this.socket.readyState!==1)return;
    if(this.socket.bufferedAmount>65536){
      if(!this.blockedAt)this.blockedAt=Date.now();
      if(Date.now()-this.blockedAt>10000){this.socket.close(1013,'Connection too slow');this.reset();return;}
      if(!this.timer)this.timer=setTimeout(()=>{this.timer=null;this.flush();},25);
      this.timer?.unref?.();return;
    }
    this.blockedAt=0;clearTimeout(this.timer);this.timer=null;
    const pending=this.pending;this.pending=null;
    const message={...pending,snapshot:{...pending.snapshot,events:[...this.events.values()].sort((a,b)=>a.n-b.n)}};this.events.clear();
    this.write(message);
  }
}
module.exports={SnapshotStream};
