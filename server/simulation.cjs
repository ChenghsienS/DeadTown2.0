'use strict';
// One isolated JS world per room. Rendering/audio are intentionally absent;
// collision, AI, projectiles, fire, drops and bosses are the shared game code.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const scripts=['version.js','player-skins.js','coop.js','movement.js','server/headless.js','town.js','weather.js','boss.js','arsenal.js','burning.js','game.js','server/world.js'];
const source=new Map(scripts.map(file=>[file,fs.readFileSync(path.join(root,file),'utf8')]));
class Simulation {
  constructor(members,seed){
    const noop=()=>{},elements=new Map();
    const context=new Proxy({measureText:()=>({width:0})},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
    function element(id){if(!elements.has(id))elements.set(id,{style:{setProperty:noop},classList:{add:noop,remove:noop,toggle:noop,contains:()=>true},value:'',innerHTML:'',textContent:'',dataset:{},getContext:()=>context,addEventListener:noop,setAttribute:noop,querySelectorAll:()=>[],getBoundingClientRect:()=>({left:0,top:0,width:1280,height:720})});return elements.get(id);}
    const sandbox={DEAD_TOWN_SERVER:true,console,innerWidth:1280,innerHeight:720,devicePixelRatio:1,
      performance:{now:()=>0},setTimeout:noop,clearTimeout:noop,setInterval:noop,clearInterval:noop,requestAnimationFrame:noop,addEventListener:noop,
      localStorage:{getItem:()=>null,setItem:noop},document:{hidden:false,body:element('body'),documentElement:element('html'),activeElement:null,getElementById:element,createElement:()=>element('created'),querySelectorAll:()=>[],addEventListener:noop}};
    sandbox.window=sandbox;this.context=vm.createContext(sandbox);
    for(const file of scripts)vm.runInContext(source.get(file),this.context,{filename:file});
    this.api=this.context.Sim;this.api.init(members,seed);
  }
  input(id,input){this.api.input(id,input);}
  disconnect(id){this.api.disconnect(id);}
  step(dt=1/30){this.api.step(dt);}
  snapshot(){return this.api.snapshot();}
  frame(){return this.api.frame();}
  // Only local verification uses eval. No network message exposes this method.
  inspect(code){return vm.runInContext(code,this.context);}
}
module.exports={Simulation};
