'use strict';
const {parentPort,workerData}=require('node:worker_threads');
const {performance}=require('node:perf_hooks');
const {Simulation}=require('./simulation.cjs');
const sim=new Simulation(workerData.members,workerData.seed);
parentPort.on('message',m=>{if(m.type==='input')sim.input(m.id,m.input);else if(m.type==='disconnect')sim.disconnect(m.id);});
parentPort.postMessage({type:'started',snapshot:sim.snapshot()});
let before=performance.now(),accumulator=0,ticks=0,ended=false;
let period=before,stepTimes=[],snapshotMs=0;
let stats={tickMs:0,tickP95Ms:0,tickHz:30,snapshotMs:0};
setInterval(()=>{
  const now=performance.now();accumulator+=Math.min(.2,(now-before)/1000);before=now;
  let work=0;
  while(accumulator>=1/30&&work++<6){const started=performance.now();sim.step();stepTimes.push(performance.now()-started);accumulator-=1/30;ticks++;}
  if(now-period>=1000){
    const sorted=stepTimes.slice().sort((a,b)=>a-b);
    stats={tickMs:sorted.length?sorted.reduce((a,b)=>a+b)/sorted.length:0,tickP95Ms:sorted[Math.floor(sorted.length*.95)]||0,tickHz:stepTimes.length*1000/(now-period),snapshotMs};
    stepTimes=[];period=now;
  }
  if(ticks>=2){ticks%=2;const started=performance.now(),snapshot=sim.frame(stats);snapshotMs=performance.now()-started;parentPort.postMessage({type:'snapshot',payload:snapshot.payload});
    if(snapshot.gameOver&&!ended){ended=true;parentPort.postMessage({type:'ended',score:snapshot.score,kills:snapshot.kills,time:snapshot.time,ranking:snapshot.ranking});}}
},10);
