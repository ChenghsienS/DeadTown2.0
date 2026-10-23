// Measured requestAnimationFrame intervals; independent of the simulation dt cap.
const FrameStats=(()=>{
  const WINDOW=30000,RECENT=1000,MIN_LOW_SAMPLES=100;
  const fpsNode=document.getElementById('fpsValue'),lowNode=document.getElementById('lowFpsValue'),panel=document.getElementById('performanceStats');
  let samples=[],head=0,clock=0,previous=null,nextRefresh=0,nextLow=0,fps=null,low=null;
  let workFrames=0,updateTotal=0,renderTotal=0,updateMs=0,renderMs=0,language='en';
  function record(update,render){if(Number.isFinite(update)&&Number.isFinite(render)){workFrames++;updateTotal+=update;renderTotal+=render;}}
  const format=(n,decimal)=>n===null?'—':decimal||n<10?n.toFixed(1):String(Math.round(n));
  function paint(){
    if(workFrames){updateMs=updateTotal/workFrames;renderMs=renderTotal/workFrames;workFrames=updateTotal=renderTotal=0;}
    for(const [node,value,decimal] of [[fpsNode,fps,false],[lowNode,low,true]])if(node){
      const text=format(value,decimal);if(node.textContent!==text)node.textContent=text;
      node.dataset.level=value===null?'pending':value>=55?'good':value>=30?'fair':'low';
    }
    const details=document.getElementById('performanceDetails'),text=document.getElementById('performanceDetailText');
    if(details?.open&&text){
      const zh=language==='zh',lines=[`${zh?'游戏更新':'Game update'}  ${updateMs.toFixed(1)} ms`,`${zh?'画面绘制':'Draw submission'}  ${renderMs.toFixed(1)} ms`];
      if(Coop.client&&typeof Net!=='undefined'){
        const n=Net.stats;lines.push(`Ping  ${Math.round(n.ping)} ms`,`${zh?'网络抖动 / 显示缓冲':'Jitter / display buffer'}  ${Math.round(n.jitter)} / ${Math.round(n.delay)} ms`,`${zh?'接收数据（解压后）':'Received (decoded)'}  ${n.rxKBps.toFixed(1)} KB/s`,`${zh?'收包解码':'Receive / decode'}  ${n.receiveMs.toFixed(1)} ms`);
        if(n.server)lines.push(`${zh?'服务器计算':'Server step'}  ${n.server.tickMs.toFixed(1)} ms · P95 ${n.server.tickP95Ms.toFixed(1)} ms`,`${zh?'服务器更新':'Server rate'}  ${n.server.tickHz.toFixed(1)} /s`);
      }
      const value=lines.join('\n');if(text.textContent!==value)text.textContent=value;
    }
  }
  function reset(){samples=[];head=0;clock=0;previous=null;nextRefresh=0;nextLow=0;fps=low=null;workFrames=updateTotal=renderTotal=updateMs=renderMs=0;paint();}
  function suspend(){previous=null;}
  function sample(now,active=true){
    if(!active||!Number.isFinite(now)){suspend();return;}
    if(previous===null){previous=now;return;}
    const ms=now-previous;previous=now;if(ms<=0)return;
    // Keep genuine foreground stalls, including intervals longer than one second.
    clock+=ms;samples.push({end:clock,ms});
    while(head<samples.length&&samples[head].end<=clock-WINDOW)head++;
    if(head>1024){samples=samples.slice(head);head=0;}
    if(clock<nextRefresh)return;nextRefresh=clock+250;
    let sum=0,count=0;
    for(let i=samples.length-1;i>=head&&samples[i].end>clock-RECENT;i--){sum+=samples[i].ms;count++;}
    fps=count?1000*count/sum:null;
    const available=samples.length-head;
    if(available<MIN_LOW_SAMPLES)low=null;
    else if(low===null||clock>=nextLow){
      const slowest=samples.slice(head).map(s=>s.ms).sort((a,b)=>b-a),n=Math.max(1,Math.ceil(slowest.length*.01));
      let slowMs=0;for(let i=0;i<n;i++)slowMs+=slowest[i];
      low=1000*n/slowMs;nextLow=clock+1000;
    }
    paint();
  }
  function localize(value){
    language=value;if(!panel)return;const zh=language==='zh';
    const label=document.getElementById('performanceDetailsLabel');if(label)label.textContent=zh?'性能详情':'Diagnostics';
    panel.setAttribute('aria-label',zh?'帧率与低帧表现':'Frame rate and 1% low');
    panel.title=zh?'FPS：最近 1 秒。1% LOW：最近 30 秒有效游戏帧中最慢 1% 的平均帧时间对应帧率，累计 100 帧后显示。暂停、后台和美术工作台不计入。':'FPS: last second. 1% LOW: inverse of the average frame time of the slowest 1% of frames in the last 30 seconds of active gameplay; shown after 100 frames. Pauses, hidden tabs and Art Studio are excluded.';
  }
  document.addEventListener('visibilitychange',suspend);
  return {sample,record,reset,suspend,localize,get stats(){return {fps,low,updateMs,renderMs,samples:samples.length-head,activeMs:clock,windowMs:WINDOW};}};
})();
