// Room-local communications and compact co-op presentation; server owns all state.
const SquadUI=(()=>{
  let messages=[],draft='',typing=false,noticeUntil=0,noticeText='',lastMessageAt=0,lastTeam='',lastTeamAt=0;
  const tr=(a,b)=>lang==='zh'?a:b;
  function closeInput(){typing=false;const input=$('chatInput');input?.blur();if(input)input.value=draft;refreshChat();}
  function reset(clear=true){closeInput();if(clear){messages=[];draft='';}noticeUntil=0;noticeText='';lastTeam='';$('squadPanel')?.classList.add('hidden');$('roomChat')?.remove();}
  function mount(restoreFocus=false){
    if(!Net.room)return;
    let el=$('roomChat');if(!el){el=document.createElement('section');el.id='roomChat';el.className='roomChat';el.setAttribute('aria-label',tr('房间聊天','Room chat'));}
    const inGame=Net.room.status==='playing',slot=$('roomChatMount');
    if(!inGame&&slot)slot.appendChild(el);else document.body.appendChild(el);
    el.classList.toggle('chatFloating',inGame);el.classList.toggle('hidden',inGame&&state.paused);
    el.innerHTML=`<button id="chatToggle" type="button" class="chatToggle">${tr('房间通讯','ROOM COMMS')} <span>Enter ↵</span></button><div id="chatMessages" class="chatMessages" role="log" aria-live="polite" aria-relevant="additions"></div><form id="chatForm" class="chatForm"><label class="srOnly" for="chatInput">${tr('发送给房间内玩家','Message this room')}</label><input id="chatInput" maxlength="160" autocomplete="off" placeholder="${tr('输入消息… Enter 发送 / Esc 关闭','Message… Enter sends / Esc closes')}"><button type="submit">${tr('发送','Send')}</button></form><small id="chatHint" class="chatHint"></small>`;
    $('chatInput').value=draft;$('chatInput').oninput=e=>{draft=e.target.value;};
    $('chatInput').onkeydown=e=>{if(e.key==='Enter'&&(e.isComposing||e.keyCode===229))e.preventDefault();};
    $('chatInput').onfocus=()=>{typing=true;Net.releaseControls();refreshChat();};
    $('chatInput').onblur=e=>{if(e.relatedTarget&&el.contains(e.relatedTarget))return;typing=false;refreshChat();};
    $('chatToggle').onclick=()=>typing?closeInput():openInput();
    $('chatForm').onsubmit=e=>{e.preventDefault();if(draft.trim()){error('');Net.chat(draft);draft='';$('chatInput').value='';}if(inGame)closeInput();};
    typing=typing||restoreFocus;renderMessages();refreshChat();if(typing)$('chatInput').focus({preventScroll:true});
  }
  function openInput(){if(!Net.room||state.paused)return;typing=true;Net.releaseControls();if(!$('roomChat'))mount();refreshChat();$('chatInput')?.focus({preventScroll:true});}
  function refreshChat(){const el=$('roomChat');if(!el)return;el.classList.toggle('typing',typing);el.classList.toggle('recent',performance.now()-lastMessageAt<9000);$('chatForm')?.classList.toggle('hidden',!typing&&Net.room?.status==='playing');}
  function renderMessages(){const list=$('chatMessages');if(!list)return;list.replaceChildren();for(const m of messages.slice(-50)){const row=document.createElement('p'),name=document.createElement('strong'),body=document.createElement('span');name.className=m.playerId===Net.id?'selfName':'allyName';name.textContent=m.name+': ';body.textContent=m.text;row.append(name,body);list.appendChild(row);}list.scrollTop=list.scrollHeight;}
  function history(value){messages=value.slice(-50);renderMessages();}
  function receive(m){if(messages.some(x=>x.id===m.id))return;messages.push(m);if(messages.length>50)messages.shift();lastMessageAt=performance.now();renderMessages();refreshChat();}
  function error(text){const el=$('chatHint');if(el)el.textContent=text;}
  function ranking(list){return [...list].sort((a,b)=>(b.score||0)-(a.score||0)||(b.kills||0)-(a.kills||0)||a.id.localeCompare(b.id));}
  function result(list){return `<ol class="squadResults">${ranking(list||[]).map((p,i)=>`<li><span class="rank">0${i+1}</span>${AccountPortraits.markup(p.avatarId)}<strong class="${p.id===Net.id?'selfName':'allyName'}">${escapeHtml(p.name)}${ProgressUI.levelTag(p.level)}</strong><span>${Math.floor(p.score||0)} <small>${tr('分','PTS')}</small></span></li>`).join('')}</ol>`;}
  function status(p){return p.connected===false?tr('离线','OFFLINE'):p.downed?`${tr('倒地','DOWN')} ${Math.ceil(p.downRemaining)}s`:(p.dead||p.hp<=0)?tr('阵亡','DEAD'):tr('行动中','ACTIVE');}
  function team(){
    const el=$('squadPanel');if(!el)return;const visible=Coop.client&&!!Net.room&&(state.running||state.gameOver)&&!state.paused;el.classList.toggle('hidden',!visible);if(!visible)return;
    const list=ranking(Coop.all()),signature=JSON.stringify([lang,...list.map(p=>[p.id,p.skinId,p.colorId,p.level,p.avatarId,p.name,Math.ceil(p.hp),p.maxHp,status(p),p.score,Math.floor((p.reviveProgress||0)*10)])]);if(lastTeam===signature)return;lastTeam=signature;
    el.innerHTML=`<div class="squadHeading"><span>${tr('队伍状态','SQUAD STATUS')}</span><small>${tr('积分排名','SCORE RANK')}</small></div>${list.map((p,i)=>`<div class="squadMember ${p.downed?'isDown':''} ${p.dead?'isDead':''}"><span class="squadRank">${i+1}</span>${AccountPortraits.markup(p.avatarId)}<div class="squadDetail"><div class="squadName"><strong class="${p.id===Net.id?'selfName':'allyName'}">${escapeHtml(p.name)}${ProgressUI.levelTag(p.level)}</strong><span>${Math.floor(p.score||0)}</span></div><div class="squadHealth"><i style="width:${Math.max(0,Math.min(100,p.hp/p.maxHp*100))}%"></i></div><div class="squadVitals"><span>${status(p)}</span><span>${Math.ceil(p.hp)}/${p.maxHp}</span></div>${p.downed?`<div class="squadRescue"><i style="width:${Math.min(100,(p.reviveProgress||0)/Coop.rescue.duration*100)}%"></i></div>`:''}</div></div>`).join('')}`;
  }
  function announce(kind,p){if(kind==='down'){noticeText=p.id===Net.id?tr('你已倒地 · 匍匐靠近队友，等待救援','YOU ARE DOWN · Crawl toward a teammate'):tr(`${p.name} 已倒地 · 在圈内救援 5 秒`,`${p.name} IS DOWN · Stay inside the circle for 5s`);}else noticeText=tr(`${p.name} 已获救`,`${p.name} REVIVED`);noticeUntil=performance.now()+4500;}
  function draw(cam){
    if(!Coop.client||!state.running)return;
    ctx.save();
    for(const p of Coop.survivors().filter(p=>p.downed)){
      const x=p.x-cam.x,y=p.y-cam.y;if(x<-100||x>SW+100||y<-100||y>SH+100)continue;
      const near=Math.hypot(p.x-player.x,p.y-player.y)<150,progress=(p.reviveProgress||0)/Coop.rescue.duration;
      ctx.lineWidth=1;ctx.strokeStyle=near?'rgba(157,184,160,.43)':'rgba(157,184,160,.22)';ctx.setLineDash([3,7]);ctx.beginPath();ctx.arc(x,y,Coop.rescue.radius,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      if(progress>0){ctx.strokeStyle='rgba(186,214,166,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,18,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);ctx.stroke();}
      ctx.font='10px "Courier New","Microsoft YaHei",monospace';ctx.textAlign='center';ctx.fillStyle='#d2b69c';ctx.fillText(progress>0?tr(`救援 ${(Coop.rescue.duration-p.reviveProgress).toFixed(1)}s`,`REVIVE ${(Coop.rescue.duration-p.reviveProgress).toFixed(1)}s`):tr(`待救援 ${Math.ceil(p.downRemaining)}s`,`DOWN ${Math.ceil(p.downRemaining)}s`),x,y+31);
    }
    if(performance.now()<noticeUntil&&player.connected!==false){
      const x=clamp(player.x-cam.x,175,SW-175),y=Math.max(78,player.y-cam.y-110);ctx.font='bold 11px "Courier New","Microsoft YaHei",monospace';ctx.textAlign='center';const w=Math.min(SW-24,ctx.measureText(noticeText).width+24);ctx.fillStyle='rgba(15,22,20,.94)';ctx.fillRect(x-w/2,y-19,w,30);ctx.fillStyle='#c89b71';ctx.fillRect(x-w/2,y-19,3,30);ctx.fillStyle='#e7ddc5';ctx.fillText(noticeText,x,y);
    }ctx.restore();
  }
  function update(){if(performance.now()-lastTeamAt>100){lastTeamAt=performance.now();team();refreshChat();}}
  addEventListener('keydown',e=>{
    if(!Coop.client||!Net.room)return;
    if(e.isComposing||e.keyCode===229)return;
    if(e.key==='Escape'&&typing){e.preventDefault();e.stopImmediatePropagation();closeInput();return;}
    if(e.key==='Enter'&&!typing&&!state.paused&&!['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName)){e.preventDefault();e.stopImmediatePropagation();openInput();}
  },true);
  return {mount,reset,history,receive,error,team,update,draw,announce,result,closeInput,get typing(){return typing;}};
})();
