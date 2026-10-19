'use strict';
const {parentPort,workerData}=require('node:worker_threads');
const {performance}=require('node:perf_hooks');
const {Simulation}=require('./simulation.cjs');
const sim=new Simulation(workerData.members,workerData.seed);
parentPort.on('message',m=>{if(m.type==='input')sim.input(m.id,m.input);else if(m.type==='disconnect')sim.disconnect(m.id);});
parentPort.postMessage({type:'started',snapshot:sim.snapshot()});
let before=performance.now(),accumulator=0,ticks=0,ended=false;
setInterval(()=>{
  const now=performance.now();accumulator+=Math.min(.2,(now-before)/1000);before=now;
  let work=0;
  while(accumulator>=1/30&&work++<6){sim.step();accumulator-=1/30;ticks++;}
  if(ticks>=3){ticks%=3;const snapshot=sim.snapshot();parentPort.postMessage({type:'snapshot',snapshot});
    if(snapshot.world.gameOver&&!ended){ended=true;parentPort.postMessage({type:'ended',score:snapshot.world.score,kills:snapshot.world.kills,time:snapshot.world.surviveTime});}}
},10);
