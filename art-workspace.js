// Offline art documents, pixel editing and interoperable ZIPs. No executable import data.
const ArtWorkspace=(()=>{
  const drafts=new Map(),failed=new Map();let initialization=null,db=null,ready=false,queue=Promise.resolve(),pending=0,lastError='',fallback=false;
  const encoder=new TextEncoder(),decoder=new TextDecoder();
  const table=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
  function crc(bytes){let n=0xffffffff;for(const b of bytes)n=table[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
  const key=(id,frame)=>id+'#'+frame;
  function decodePNG(url){if(!/^data:image\/png;base64,/.test(url))throw Error('Expected PNG');const binary=atob(url.split(',')[1]);return Uint8Array.from(binary,c=>c.charCodeAt(0));}
  function toDataURL(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return 'data:image/png;base64,'+btoa(s);}
  function loadImage(url){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(ArtCatalog.clone(img));img.onerror=()=>reject(Error('PNG could not be decoded'));img.src=url;});}
  function checkPNG(bytes,w,h){const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);if(bytes.length<33||v.getUint32(0)!==0x89504e47||v.getUint32(4)!==0x0d0a1a0a||v.getUint32(8)!==13||v.getUint32(12)!==0x49484452||v.getUint32(16)!==w||v.getUint32(20)!==h||w<1||h<1||w>2048||h>2048||w*h>1048576)throw Error('PNG dimensions or signature invalid');}
  function init(){return initialization||(initialization=initOnce());}
  async function initOnce(){
    if(ready)return;ready=true;
    try{
      if(!window.indexedDB)throw Error('IndexedDB unavailable');
      db=await new Promise((resolve,reject)=>{const r=indexedDB.open('deadtown-art-studio-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('frames',{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Storage is blocked'));});
      const saved=await new Promise((resolve,reject)=>{const r=db.transaction('frames','readonly').objectStore('frames').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
      saved.forEach(r=>drafts.set(r.key,r));
    }catch(e){fallback=true;try{const saved=JSON.parse(localStorage.getItem('deadtown_art_drafts_v1')||'[]');if(Array.isArray(saved))saved.forEach(r=>drafts.set(r.key,r));}catch{lastError='Local storage is unavailable. Export a ZIP to keep your work.';}}
  }
  function persist(record,remove=false){
    pending++;
    queue=queue.catch(()=>{}).then(async()=>{
      if(fallback){localStorage.setItem('deadtown_art_drafts_v1',JSON.stringify([...drafts.values()]));}
      else await new Promise((resolve,reject)=>{const tx=db.transaction('frames','readwrite'),store=tx.objectStore('frames');if(remove)store.delete(record.key);else store.put(record);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Write aborted'));});
      failed.delete(record.key);if(fallback)failed.clear();if(!failed.size)lastError='';
    }).catch(e=>{failed.set(record.key,{record,remove});lastError='Could not save locally. Export a ZIP before closing. '+(e.message||e);}).finally(()=>pending--);
    return queue;
  }
  async function save(entry,frame,canvas,original){
    await init();const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,source=original.getContext('2d').getImageData(0,0,original.width,original.height).data,k=key(entry.id,frame);
    if(canvas.width===original.width&&canvas.height===original.height&&pixels.every((v,i)=>v===source[i])){drafts.delete(k);return persist({key:k},true);}
    const record={key:k,id:entry.id,frame,label:entry.label,category:entry.category,recipe:entry.recipe,frameCount:entry.frames,width:canvas.width,height:canvas.height,gameVersion:drafts.get(k)?.gameVersion||GAME_VERSION,originalCRC32:crc(source).toString(16).padStart(8,'0'),original:original.toDataURL('image/png'),png:canvas.toDataURL('image/png'),updatedAt:new Date().toISOString()};
    drafts.set(k,record);return persist(record);
  }
  async function retrySave(){await init();for(const item of [...failed.values()])await persist(item.record,item.remove);for(const r of drafts.values())await persist(r);return !lastError;}
  // Stored entries from an older random town remain browsable after changing maps.
  function importedEntries(){const groups=new Map();for(const r of drafts.values())if(!ArtCatalog.get(r.id)&&!groups.has(r.id)){groups.set(r.id,{id:r.id,category:r.category||'town',label:r.label||[r.id,r.id],frames:r.frameCount||r.frame+1,recipe:r.recipe,imported:true,render:f=>{const record=drafts.get(key(r.id,f));if(!record)throw Error('Only edited frames are included in this imported asset');return loadImage(record.original);}});}return [...groups.values()];}
  class Document{
    constructor(canvas){this.canvas=ArtCatalog.clone(canvas);this.original=ArtCatalog.clone(canvas);this.undoStack=[];this.redoStack=[];this.stroke=false;}
    context(){return this.canvas.getContext('2d');}
    snapshot(){return this.context().getImageData(0,0,this.canvas.width,this.canvas.height);}
    begin(){if(this.stroke)return;this.before=this.snapshot();this.stroke=true;}
    end(){if(!this.stroke)return false;this.stroke=false;const after=this.snapshot();if(after.data.every((v,i)=>v===this.before.data[i]))return false;this.undoStack.push(this.before);this.redoStack=[];const max=Math.min(40,Math.max(2,Math.floor(32*1024*1024/after.data.length)));if(this.undoStack.length>max)this.undoStack.shift();return true;}
    line(x0,y0,x1,y1,rgba,size=1){const data=this.snapshot(),w=data.width,h=data.height,put=(x,y)=>{for(let yy=y-Math.floor(size/2);yy<y-Math.floor(size/2)+size;yy++)for(let xx=x-Math.floor(size/2);xx<x-Math.floor(size/2)+size;xx++)if(xx>=0&&yy>=0&&xx<w&&yy<h)data.data.set(rgba,(yy*w+xx)*4);};
      let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;
      for(;;){put(x0,y0);if(x0===x1&&y0===y1)break;const e=2*err;if(e>=dy){err+=dy;x0+=sx;}if(e<=dx){err+=dx;y0+=sy;}}
      this.context().putImageData(data,0,0);
    }
    fill(x,y,rgba){const image=this.snapshot(),{width:w,height:h,data}=image;if(x<0||y<0||x>=w||y>=h)return;const start=y*w+x,target=Array.from(data.slice(start*4,start*4+4));if(target.every((v,i)=>v===rgba[i]))return;
      const queue=new Int32Array(w*h),seen=new Uint8Array(w*h);let head=0,tail=1;queue[0]=start;seen[start]=1;
      while(head<tail){const n=queue[head++],at=n*4;if(!target.every((v,i)=>data[at+i]===v))continue;data.set(rgba,at);const xx=n%w,yy=Math.floor(n/w);for(const next of [xx>0?n-1:-1,xx<w-1?n+1:-1,yy>0?n-w:-1,yy<h-1?n+w:-1])if(next>=0&&!seen[next]){seen[next]=1;queue[tail++]=next;}}
      this.context().putImageData(image,0,0);
    }
    undo(){if(!this.undoStack.length)return false;this.redoStack.push(this.snapshot());this.context().putImageData(this.undoStack.pop(),0,0);return true;}
    redo(){if(!this.redoStack.length)return false;this.undoStack.push(this.snapshot());this.context().putImageData(this.redoStack.pop(),0,0);return true;}
    reset(){this.begin();this.context().clearRect(0,0,this.canvas.width,this.canvas.height);this.context().drawImage(this.original,0,0);return this.end();}
    replace(source){if(source.width!==this.canvas.width||source.height!==this.canvas.height)throw Error('PNG must have the same dimensions');this.begin();this.context().clearRect(0,0,this.canvas.width,this.canvas.height);this.context().drawImage(source,0,0);return this.end();}
  }
  function zip(files){
    const chunks=[],central=[];let offset=0,centralSize=0;const stamp=new Date(),date=((Math.max(1980,stamp.getFullYear())-1980)<<9)|((stamp.getMonth()+1)<<5)|stamp.getDate(),time=(stamp.getHours()<<11)|(stamp.getMinutes()<<5)|(stamp.getSeconds()>>1);
    if(files.length>65535)throw Error('Too many files');
    for(const f of files){const name=encoder.encode(f.name),data=typeof f.data==='string'?encoder.encode(f.data):f.data,checksum=crc(data),local=new Uint8Array(30+name.length),v=new DataView(local.buffer);
      v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(10,time,true);v.setUint16(12,date,true);v.setUint32(14,checksum,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);local.set(name,30);chunks.push(local,data);
      const c=new Uint8Array(46+name.length),cv=new DataView(c.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint16(12,time,true);cv.setUint16(14,date,true);cv.setUint32(16,checksum,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);c.set(name,46);central.push(c);centralSize+=c.length;offset+=local.length+data.length;
    }
    const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);
    return new Blob([...chunks,...central,end],{type:'application/zip'});
  }
  async function unzip(blob){
    if(blob.size>160*1024*1024)throw Error('ZIP exceeds 160 MB');const bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer),files=new Map();let offset=0;
    while(offset+4<=bytes.length&&view.getUint32(offset,true)===0x04034b50){
      if(offset+30>bytes.length)throw Error('Truncated ZIP');const flags=view.getUint16(offset+6,true),method=view.getUint16(offset+8,true),checksum=view.getUint32(offset+14,true),size=view.getUint32(offset+18,true),nameSize=view.getUint16(offset+26,true),extra=view.getUint16(offset+28,true),start=offset+30+nameSize+extra,end=start+size;
      if(method!==0||(flags&9)||end>bytes.length||size>12*1024*1024)throw Error('Use an unmodified Art Studio ZIP (STORE format)');
      const name=decoder.decode(bytes.subarray(offset+30,offset+30+nameSize));if(name.includes('..')||name.startsWith('/')||name.includes('\\')||files.has(name))throw Error('Invalid ZIP path');
      const data=bytes.slice(start,end);if(crc(data)!==checksum)throw Error('ZIP CRC failed');files.set(name,data);offset=end;
    }
    if(!files.has('manifest.json')||offset+4>bytes.length||view.getUint32(offset,true)!==0x02014b50)throw Error('Invalid Art Studio package');return files;
  }
  async function exportPack(mode='modified',progress=()=>{},cancel=()=>false,selection=null){
    await init();await queue;const records=mode==='modified'?[...drafts.values()]:[];
    if(mode==='all'||mode==='asset')for(const e of mode==='asset'?[selection]:[...ArtCatalog.entries,...importedEntries()]){
      const frames=e.imported?[...drafts.values()].filter(r=>r.id===e.id).map(r=>r.frame).sort((a,b)=>a-b):Array.from({length:e.frames},(_,i)=>i);
      for(const f of frames)records.push({entry:e,id:e.id,frame:f});
    }
    if(!records.length)throw Error('No modified assets to export');const files=[],assets=[];let bytes=0;
    for(let i=0;i<records.length;i++){
      if(cancel())throw Error('Export cancelled');const item=records[i],draft=drafts.get(key(item.id,item.frame)),e=item.entry||ArtCatalog.get(item.id)||importedEntries().find(e=>e.id===item.id);let png,original,width,height,checksum;
      if(draft){png=draft.png;original=draft.original;width=draft.width;height=draft.height;checksum=draft.originalCRC32;}
      else{const c=await ArtCatalog.frame(e,item.frame);png=c.toDataURL('image/png');width=c.width;height=c.height;checksum=crc(c.getContext('2d').getImageData(0,0,width,height).data).toString(16).padStart(8,'0');}
      const name=`assets/${String(i).padStart(6,'0')}_f${String(item.frame).padStart(3,'0')}.png`,data=decodePNG(png);files.push({name,data});bytes+=data.length;
      const originalFile=original?name.replace('assets/','originals/'):null;if(originalFile){const data=decodePNG(original);files.push({name:originalFile,data});bytes+=data.length;}
      assets.push({id:item.id,frame:item.frame,frameCount:e?.frames||draft.frameCount,label:e?.label||draft.label,category:e?.category||draft.category,recipe:e?.recipe||draft.recipe,width,height,file:name,originalFile,originalCRC32:checksum,modified:!!draft,sourceVersion:draft?.gameVersion||GAME_VERSION});
      if(bytes>140*1024*1024)throw Error('Package exceeds 140 MB; export one category/asset or modified frames');
      progress(i+1,records.length);if(i%8===0)await new Promise(r=>setTimeout(r,0));
    }
    const manifest={format:'deadtown-art-pack',schemaVersion:1,gameVersion:GAME_VERSION,createdAt:new Date().toISOString(),mode,pixelFormat:'RGBA8',assets};
    files.push({name:'manifest.json',data:JSON.stringify(manifest,null,2)},{name:'README.txt',data:'Dead Town Art Pack\n将整个 ZIP 发回以整合到新版本。保留 manifest.json 和 originals/。\nPNG 为透明 RGBA 像素图，帧号从 0 开始。工作台修改不直接改动游戏源码。\nProcedural effects are captured reference frames; integrate using the supplied source recipe.\nImport this original ZIP into Art Studio to resume modified frames. Do not recompress it.\n'});
    return zip(files);
  }
  async function importPack(blob){
    await init();const files=await unzip(blob),manifest=JSON.parse(decoder.decode(files.get('manifest.json')));if(manifest.format!=='deadtown-art-pack'||manifest.schemaVersion!==1||!Array.isArray(manifest.assets)||manifest.assets.length>15000)throw Error('Unsupported manifest');
    const validated=[],keys=new Set();
    for(const a of manifest.assets.filter(a=>a.modified)){
      if(typeof a.id!=='string'||a.id.length>240||!Number.isInteger(a.frame)||a.frame<0||a.frame>=a.frameCount||a.frameCount>1024||keys.has(key(a.id,a.frame)))throw Error('Invalid asset/frame ID');keys.add(key(a.id,a.frame));
      const bytes=files.get(a.file),base=files.get(a.originalFile);if(!bytes||!base)throw Error('Missing PNG or original frame');checkPNG(bytes,a.width,a.height);checkPNG(base,a.width,a.height);
      const original=toDataURL(base),source=await loadImage(original);if(crc(source.getContext('2d').getImageData(0,0,a.width,a.height).data).toString(16).padStart(8,'0')!==a.originalCRC32)throw Error('Original pixel checksum mismatch');
      const png=toDataURL(bytes);await loadImage(png);
      validated.push({key:key(a.id,a.frame),id:a.id,frame:a.frame,frameCount:a.frameCount,label:a.label,category:a.category,recipe:a.recipe,width:a.width,height:a.height,gameVersion:a.sourceVersion||manifest.gameVersion,originalCRC32:a.originalCRC32,original,png,updatedAt:new Date().toISOString()});
    }
    // Validate everything before mutating the workspace.
    for(const r of validated){drafts.set(r.key,r);await persist(r);}return {count:validated.length,version:manifest.gameVersion};
  }
  return {init,save,retrySave,loadImage,Document,exportPack,importPack,zip,unzip,crc,key,decodePNG,checkPNG,importedEntries,get drafts(){return drafts;},get pending(){return pending;},get error(){return lastError;},flush:()=>queue,get fallback(){return fallback;}};
})();
