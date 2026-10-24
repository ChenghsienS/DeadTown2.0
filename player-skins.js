// Shared, validated cosmetic IDs. These never change combat stats or hitboxes.
const PlayerSkins=(()=>{
  const skins=[
    {id:'ranger',en:'RANGER',zh:'游骑兵',note:['战术夹克 · 护目镜','Field jacket · goggles'],
      colors:[['苔绿','Moss','#66766e','#96a396','#303c3e','#3b4650','#b7a170'],['荒漠','Dune','#9a8059','#cfb77e','#4e463a','#514b42','#e0c99b'],['极地','Frost','#b7c6cb','#e4ebdf','#586d7b','#43596d','#73b8cc'],['赤岩','Rust','#944d43','#ca8870','#492e33','#403b47','#e3b57c']]},
    {id:'medic',en:'MEDIC',zh:'急救员',note:['急救外套 · 医疗背包','Rescue coat · medical pack'],
      colors:[['白瓷','Ivory','#ddd6bb','#faf2db','#817d6a','#3d5960','#c64e48'],['海蓝','Tide','#518da4','#a1d5d1','#305166','#344656','#eee6c1'],['樱红','Rose','#bb646e','#f1a6a0','#653a4d','#483f51','#f2e2c4'],['草绿','Sage','#8da57b','#cbd5a2','#4d6357','#364a4a','#e6d5a2']]},
    {id:'scavenger',en:'SCAVENGER',zh:'拾荒者',note:['兜帽长衣 · 防尘面罩','Hooded coat · respirator'],
      colors:[['暗夜','Night','#49545e','#83949d','#272b39','#30333f','#caa56b'],['赭土','Clay','#94735b','#c8ab80','#4c3b3a','#473c3b','#deb15f'],['暮紫','Dusk','#776385','#b394ac','#3e334e','#393747','#93b9b2'],['墨绿','Pine','#4b7666','#8db09a','#293f3d','#303f48','#d3b279']]},
    {id:'engineer',en:'ENGINEER',zh:'工程师',note:['防护头盔 · 加固工装','Safety helmet · reinforced suit'],
      colors:[['工业黄','Hazard','#c39a44','#f0ce70','#685337','#49484a','#e57c4b'],['消防橙','Ember','#b96439','#edaa60','#603b32','#453d40','#e9ce88'],['钴蓝','Cobalt','#4c6d9b','#97b6cd','#2d3c59','#343e4b','#e4b75b'],['钢灰','Steel','#788c90','#c3d0c6','#3c4c53','#363e48','#d46b59']]}
  ];
  function normalize(value){const skinId=skins.some(s=>s.id===value?.skinId)?value.skinId:'ranger';return {skinId,colorId:Number.isInteger(value?.colorId)&&value.colorId>=0&&value.colorId<4?value.colorId:0};}
  function key(value){const a=normalize(value);return a.skinId+'/'+a.colorId;}
  function palette(value){const a=normalize(value),s=skins.find(s=>s.id===a.skinId),c=s.colors[a.colorId];return {skin:'#c7a486',light:'#e0c5a1',shade:'#826956',coat:c[2],trim:c[3],dark:c[4],pants:c[5],accent:c[6]};}
  // Ownership and equipped appearance now belong to the signed-in account.
  // Old browser-local selections never unlock a paid skin.
  function load(){return normalize(typeof Accounts!=='undefined'?Accounts.user?.equippedSkin:null);}
  function save(){return load();}
  function label(value,language='en'){const a=normalize(value),s=skins.find(s=>s.id===a.skinId);return (language==='zh'?s.zh:s.en)+' / '+s.colors[a.colorId][language==='zh'?0:1];}
  function markup(){return typeof EconomyUI!=='undefined'?EconomyUI.profile():'';}
  function paint(root){if(typeof EconomyUI!=='undefined')EconomyUI.paint(root);}
  function bind(root){if(typeof EconomyUI!=='undefined')EconomyUI.bind(root);}
  return {skins,normalize,key,palette,load,save,label,markup,paint,bind};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=PlayerSkins;
