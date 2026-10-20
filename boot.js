// Real startup progress: completed resource / initialization tasks, not elapsed time.
// Native script/link loading keeps the offline file:// edition working too.
const DeadTownLoader = (() => {
  const manifest=JSON.parse(document.getElementById('bootManifest').textContent);
  const stages={audio:['Preparing sound effects','正在解码音效'],menu:['Preparing menu and characters','正在准备菜单与角色'],frame:['Rendering first frame','正在绘制首帧']};
  const total=manifest.scripts.length+manifest.styles.length+manifest.images.length+Object.keys(stages).length;
  const completed=new Set(),pending=new Map(),partial=new Map();
  let failed=false,finished=false,started=false,slow=false,timer;
  let zh=false;try{zh=localStorage.getItem('dead_town_language')==='zh';}catch{}
  const el=id=>document.getElementById(id),text=(en,cn)=>zh?cn:en;
  // Give the DOM a paint opportunity before synchronous menu / canvas work.
  // The timeout is only a background-tab fallback; it never advances progress.
  const paint=()=>new Promise(resolve=>{const t=setTimeout(resolve,100);requestAnimationFrame(()=>requestAnimationFrame(()=>{clearTimeout(t);resolve();}));});
  function snapshot(){
    const value=finished?1:Math.min(.999,(completed.size+[...partial.values()].reduce((a,b)=>a+b,0))/total);
    return {completed:completed.size,total,progress:value,failed,finished,pending:[...pending.keys()]};
  }
  function render(){
    const s=snapshot(),percent=Math.floor(s.progress*100),item=pending.values().next().value;
    el('loadingFill').style.width=percent+'%';el('loadingMeta').textContent=percent+'%';
    el('loadingProgress').setAttribute('aria-valuenow',String(percent));
    el('loadingProgress').setAttribute('aria-valuetext',`${percent}% · ${s.completed} / ${total}`);
    el('loadingCount').textContent=text('Completed tasks','已完成任务')+` ${s.completed} / ${total}`;
    if(failed)return;
    el('loadingText').textContent=finished?text('Ready. Opening menu…','准备完成，正在打开菜单…'):(item||text('Preparing resources…','正在准备资源…'));
    el('loadingDetail').textContent=slow?text('Still loading. Check your connection, or reload to retry.','仍在加载中，请检查网络，也可以重新加载重试。'):text('Progress follows loaded resources and startup tasks.','进度根据资源加载及初始化任务更新。');
    el('loadingRetry').hidden=!slow;
    if(typeof GAME_VERSION!=='undefined')el('loadingVersion').textContent='V'+GAME_VERSION;
  }
  function watchdog(){
    clearTimeout(timer);slow=false;
    timer=setTimeout(()=>{if(!failed&&!finished){slow=true;render();}},30000);
  }
  function begin(id,label){if(failed)throw Error('Startup stopped');pending.set(id,label);watchdog();render();}
  function complete(id){
    if(failed||completed.has(id))return;
    pending.delete(id);partial.delete(id);completed.add(id);watchdog();render();
  }
  function fail(reason){
    if(failed)return;
    failed=true;finished=false;clearTimeout(timer);removeEventListener('error',scriptError);
    render();el('loadingText').textContent=text('Loading failed','加载失败');
    el('loadingDetail').textContent=String(reason);el('loadingRetry').hidden=false;
    el('loadingOverlay').classList.remove('hidden');
    el('loadingOverlay').setAttribute('aria-busy','false');
  }
  function scriptError(event){
    // Resource errors have their own file-specific handlers below.
    if(event.target!==window)return;
    const file=event.filename?event.filename.split('/').pop():'';
    fail(text('Startup error: ','启动错误：')+file+(event.message?' — '+event.message:''));
  }
  function resource(kind,url){
    const id=kind+':'+url,label=kind==='image'?text('Loading author portrait','正在加载作者头像'):text('Loading ','正在加载 ')+url;
    begin(id,label);
    return new Promise((resolve,reject)=>{
      const node=kind==='image'?new Image():document.createElement(kind==='script'?'script':'link');
      const bad=()=>reject(Error(text('Could not load: ','无法加载：')+url));
      node.onerror=bad;
      node.onload=async()=>{
        try{if(kind==='image'&&node.decode)await node.decode();if(failed)return resolve();complete(id);resolve();}catch{bad();}
      };
      if(kind==='script'){node.async=false;node.src=url;document.head.appendChild(node);}
      else if(kind==='style'){node.rel='stylesheet';node.href=url;document.head.appendChild(node);}
      else node.src=url;
    });
  }
  async function task(id,work){
    begin(id,stages[id][zh?1:0]);await paint();if(failed)throw Error('Startup stopped');
    await work(fraction=>{
      if(failed)return;
      partial.set(id,Math.max(partial.get(id)||0,Math.min(.999,Number(fraction)||0)));render();
    });
    if(failed)throw Error('Startup stopped');complete(id);
  }
  async function start(){
    if(started)return;started=true;
    el('loadingRetry').textContent=text('Reload and retry','重新加载并重试');
    el('loadingRetry').onclick=()=>location.reload();el('loadingOverlay').setAttribute('aria-busy','true');
    addEventListener('error',scriptError);render();
    try{
      // All downloads start together; async=false preserves script dependency order.
      await Promise.all([
        ...manifest.styles.map(url=>resource('style',url)),
        ...manifest.images.map(url=>resource('image',url)),
        ...manifest.scripts.map(url=>resource('script',url))
      ]);
      if(failed)return;
      await prepareClient(task);
      if(failed)return;
      if(completed.size!==total)throw Error('Incomplete startup tasks');
      finished=true;clearTimeout(timer);render();await paint();
      if(failed)return;
      removeEventListener('error',scriptError);
      startClient();el('loadingOverlay').setAttribute('aria-busy','false');
    }catch(error){finished=false;fail(error.message||error);}
  }
  return {start,snapshot,render};
})();
DeadTownLoader.start();
