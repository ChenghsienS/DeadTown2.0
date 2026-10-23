// Ordered WebSocket snapshots: deltas refer only to a world actually sent to
// this peer. A periodic full frame and explicit resync recover a lost baseline.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SnapshotCodec=api;})(globalThis,()=>{
  'use strict';
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const object=o=>o!==null&&typeof o==='object';
  const safe=k=>k!=='__proto__'&&k!=='prototype'&&k!=='constructor';
  function keyed(a){return a.length>0&&a.every(o=>object(o)&&!Array.isArray(o)&&(typeof o.id==='string'||typeof o.id==='number'))&&new Set(a.map(o=>o.id)).size===a.length;}
  function difference(a,b){
    if(a===b)return null;
    if(!object(a)||!object(b)||Array.isArray(a)!==Array.isArray(b))return [0,b];
    if(Array.isArray(b)){
      if((keyed(a)||!a.length)&&(keyed(b)||!b.length)){
        const before=new Map(a.map(o=>[o.id,o])),after=new Map(b.map(o=>[o.id,o]));
        const removed=a.filter(o=>!after.has(o.id)).map(o=>o.id),changed=[];
        for(const o of b){const patch=difference(before.get(o.id),o);if(patch)changed.push([o.id,patch]);}
        const natural=a.filter(o=>after.has(o.id)).map(o=>o.id).concat(b.filter(o=>!before.has(o.id)).map(o=>o.id));
        const order=natural.length===b.length&&natural.every((id,i)=>id===b[i].id)?null:b.map(o=>o.id);
        return removed.length||changed.length||order?[2,removed,changed,order]:null;
      }
      const changed=[];for(let i=0;i<b.length;i++){const patch=difference(a[i],b[i]);if(patch)changed.push([i,patch]);}
      return changed.length||a.length!==b.length?[3,b.length,changed]:null;
    }
    const set={},children={},removed=[];
    for(const k of Object.keys(a))if(!own(b,k))removed.push(k);
    for(const k of Object.keys(b)){
      const patch=difference(a[k],b[k]);if(!patch)continue;
      if(patch[0]===0)set[k]=patch[1];else children[k]=patch;
    }
    return Object.keys(set).length||Object.keys(children).length||removed.length?[1,set,removed,children]:null;
  }
  function apply(a,p){
    if(p===null)return a;
    if(!Array.isArray(p))throw Error('Invalid state patch');
    if(p[0]===0)return p[1];
    if(p[0]===1){
      if(!object(a)||Array.isArray(a))throw Error('Missing object baseline');
      const b={...a};
      for(const k of p[2]){if(!safe(k))throw Error('Invalid field');delete b[k];}
      for(const [k,v] of Object.entries(p[1])){if(!safe(k))throw Error('Invalid field');b[k]=v;}
      for(const [k,v] of Object.entries(p[3])){if(!safe(k))throw Error('Invalid field');b[k]=apply(a[k],v);}
      return b;
    }
    if(!Array.isArray(a))throw Error('Missing collection baseline');
    if(p[0]===2){
      const b=new Map(a.map(o=>[o.id,o]));for(const id of p[1])b.delete(id);
      for(const [id,v] of p[2])b.set(id,apply(b.get(id),v));
      const values=p[3]?p[3].map(id=>b.get(id)):[...b.values()];
      if(values.some(o=>!o))throw Error('Missing entity baseline');return values;
    }
    if(p[0]===3){const b=a.slice(0,p[1]);for(const [i,v] of p[2])b[i]=apply(a[i],v);return b;}
    throw Error('Unknown state patch');
  }
  // Fast peers share a snapshot and baseline. Compute / stringify that delta
  // once per fan-out; slow peers still keep their own actually-sent baseline.
  // Weak keys release frames as soon as neither the stream nor encoder needs them.
  const encoded=new WeakMap(),serialized=new WeakMap();
  class Encoder{
    constructor(){this.reset();}
    reset(){this.state=null;this.keyTick=-Infinity;}
    keyframe(){this.keyTick=-Infinity;}
    encode(snapshot){
      const full=!this.state||snapshot.tick<=this.state.tick||snapshot.tick-this.keyTick>=60;
      const baseline=full?null:this.state;
      let variants=encoded.get(snapshot);if(!variants){variants=new Map();encoded.set(snapshot,variants);}
      let result=variants.get(baseline);
      if(!result){
        const state={...snapshot};delete state.events;
        const message={type:'state',codec:1,tick:snapshot.tick,base:full?null:this.state.tick,patch:full?[0,state]:difference(this.state,state),events:snapshot.events||[]};
        result={state,message};variants.set(baseline,result);
      }
      const {state,message}=result;
      if(full)this.keyTick=snapshot.tick;this.state=state;return message;
    }
    serialize(snapshot){const message=this.encode(snapshot);let text=serialized.get(message);if(text===undefined){text=JSON.stringify(message);serialized.set(message,text);}return text;}
  }
  class Decoder{
    constructor(){this.reset();}
    reset(){this.state=null;}
    decode(message){
      if(message.codec!==1||!Number.isInteger(message.tick))throw Error('Unsupported snapshot');
      if(this.state&&message.tick<=this.state.tick)return null;
      if(message.base!==null&&message.base!==this.state?.tick)throw Error('Snapshot baseline mismatch');
      const next=apply(message.base===null?null:this.state,message.patch);
      if(!next||next.tick!==message.tick)throw Error('Invalid snapshot tick');
      this.state=next;return {...next,events:message.events||[]};
    }
  }
  return {Encoder,Decoder,difference,apply};
});
