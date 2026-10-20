// Measured requestAnimationFrame intervals; independent of the simulation dt cap.
const FrameStats=(()=>{
  const WINDOW=30000,RECENT=1000,MIN_LOW_SAMPLES=100;
  const fpsNode=document.getElementById('fpsValue'),lowNode=document.getElementById('lowFpsValue'),panel=document.getElementById('performanceStats');
  let samples=[],head=0,clock=0,previous=null,nextRefresh=0,nextLow=0,fps=null,low=null;
  const format=(n,decimal)=>n===null?'—':decimal||n<10?n.toFixed(1):String(Math.round(n));
  function paint(){
    for(const [node,value,decimal] of [[fpsNode,fps,false],[lowNode,low,true]])if(node){
      const text=format(value,decimal);if(node.textContent!==text)node.textContent=text;
      node.dataset.level=value===null?'pending':value>=55?'good':value>=30?'fair':'low';
    }
  }
  function reset(){samples=[];head=0;clock=0;previous=null;nextRefresh=0;nextLow=0;fps=low=null;paint();}
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
  function localize(language){
    if(!panel)return;const zh=language==='zh';
    panel.setAttribute('aria-label',zh?'帧率与低帧表现':'Frame rate and 1% low');
    panel.title=zh?'FPS：最近 1 秒。1% LOW：最近 30 秒有效游戏帧中最慢 1% 的平均帧时间对应帧率，累计 100 帧后显示。暂停、后台和美术工作台不计入。':'FPS: last second. 1% LOW: inverse of the average frame time of the slowest 1% of frames in the last 30 seconds of active gameplay; shown after 100 frames. Pauses, hidden tabs and Art Studio are excluded.';
  }
  document.addEventListener('visibilitychange',suspend);
  return {sample,reset,suspend,localize,get stats(){return {fps,low,samples:samples.length-head,activeMs:clock,windowMs:WINDOW};}};
})();
