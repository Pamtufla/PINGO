/* Minijuegos v2: draw / tongue / dash / rhythm — solo el dueño; win local → RPC 'win'. */
(function(g){
 const KINDS=['draw','tongue','dash','rhythm'];
 const SILHOUETTES={
  ghost:{name:'Fantasma',path:'M40 90 Q40 40 70 30 Q100 40 100 90 L90 90 L85 100 L75 90 L65 100 L55 90 L45 100 L40 90 M55 55 a4 4 0 1 0 .1 0 M85 55 a4 4 0 1 0 .1 0'},
  pacman:{name:'Pac-Man',path:'M70 70 L120 40 A55 55 0 1 0 120 100 Z'},
  mushroom:{name:'Champiñón',path:'M40 70 Q70 20 100 70 L100 95 L40 95 Z M55 70 L55 95 M85 70 L85 95'},
  star:{name:'Estrella',path:'M70 20 L80 55 L115 55 L88 75 L98 110 L70 88 L42 110 L52 75 L25 55 L60 55 Z'},
  bat:{name:'Murciélago',path:'M70 60 L40 40 L20 55 L40 70 L25 90 L55 75 L70 85 L85 75 L115 90 L100 70 L120 55 L100 40 Z'},
  cat:{name:'Gato',path:'M45 50 L55 25 L65 50 L75 50 L85 25 L95 50 Q110 80 70 100 Q30 80 45 50 M55 70 a3 3 0 1 0 .1 0 M85 70 a3 3 0 1 0 .1 0'},
  potion:{name:'Poción',path:'M55 30 L85 30 L80 50 L95 100 L45 100 L60 50 Z M50 75 Q70 90 90 75'},
  sword:{name:'Espada',path:'M68 20 L72 20 L74 85 L85 90 L85 95 L55 95 L55 90 L66 85 Z M50 88 L90 88'}
 };
 const TONGUES=[
  'Tres tristes tigres tragan trigo en un trigal',
  'Pablito clavó un clavito en la calva de un calvito',
  'El perro de San Roque no tiene rabo porque Ramón Ramírez se lo ha robado',
  'Pepe Pecas pica papas con un pico',
  'Cómo quieres que te quiera si el que quiero que me quiera no me quiere',
  'Un burro comía berros y el perro se los robó',
  'Compadre cómpreme un coco compadre no compro coco',
  'Hoy ya es ayer y ayer ya es hoy',
  'Rápido corren los carros del ferrocarril',
  'Si sansón no sazona su salsa con sal su salsa es sosa'
 ];
 const registry={
  draw:{name:'Traza al personaje'},
  tongue:{name:'Trabajenguas'},
  dash:{name:'Ráfaga'},
  rhythm:{name:'Phi-mini'}
 };

 let shown=null, active=null, raf=0;

 function me(){return PingoRules.identity().id;}
 function panel(){return document.getElementById('miniPanel');}
 function stopLoop(){if(raf){cancelAnimationFrame(raf);raf=0;}}
 function clearPanel(){stopLoop();const p=panel();if(p){p.hidden=true;p.replaceChildren();}shown=null;active=null;}

 function statusLine(game){
  if(game.status==='won')return '¡Completado!'+(game.winnerName?(' · '+game.winnerName):'');
  if(game.status==='cancelled')return 'Reto cancelado';
  return 'Sin límite de tiempo · puedes reintentar';
 }

 function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}

 function buildSoloChallenge(){
  const kind=KINDS[Math.floor(Math.random()*KINDS.length)];
  const base={id:PingoRules.uuid(),kind,status:'live',attempts:[],eligible:[me()],owner:me(),index:null};
  if(kind==='draw'){
   const keys=Object.keys(SILHOUETTES);
   const silhouette=keys[Math.floor(Math.random()*keys.length)];
   return {...base,title:registry.draw.name,silhouette,question:'Rellena la silueta de '+SILHOUETTES[silhouette].name};
  }
  if(kind==='tongue'){
   const tongue=1+Math.floor(Math.random()*TONGUES.length);
   return {...base,title:registry.tongue.name,tongue,question:'Di el trabalenguas en voz alta'};
  }
  if(kind==='dash'){
   const variant=['taps','swipes','combo'][Math.floor(Math.random()*3)];
   return {...base,title:registry.dash.name,variant,question:'Toca o desliza rápido'};
  }
  return {...base,title:registry.rhythm.name,seed:Math.floor(Math.random()*1e5),bpm:110+10*Math.floor(Math.random()*3),question:'Toca las notas al llegar al centro'};
 }

 function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();}

 function mountShell(game,bodyFn,onWin,onCancel){
  const p=panel();p.hidden=false;p.replaceChildren();
  p.append(el('h3',null,game.title||registry[game.kind]?.name||'Minijuego'));
  p.append(el('p','mini-q',game.question||''));
  const status=el('p','mini-status',statusLine(game));p.append(status);
  const body=el('div','mini-body');p.append(body);
  const live=game.status==='live';
  if(live) bodyFn(body,status,()=>{status.textContent='¡Lo lograste!';onWin();});
  else status.textContent=statusLine(game);
  const row=el('div','mini-actions');
  const hide=el('button','btn ghost sm','OCULTAR');
  hide.onclick=()=>{onCancel();};
  row.append(hide);p.append(row);
  shown=JSON.stringify({id:game.id,kind:game.kind,status:game.status,silhouette:game.silhouette,tongue:game.tongue,variant:game.variant,seed:game.seed});
  active=game;
 }

 /* ===== DRAW ===== */
 function playDraw(game,body,status,win){
  const key=game.silhouette&&SILHOUETTES[game.silhouette]?game.silhouette:'ghost';
  const meta=SILHOUETTES[key];
  status.textContent='Rellena a '+meta.name+' (≥70%)';
  const wrap=el('div','mini-draw');
  const canvas=document.createElement('canvas');canvas.width=280;canvas.height=280;canvas.className='mini-canvas';
  wrap.append(canvas);body.append(wrap);
  const bar=el('div','mini-bar');const fill=el('i');bar.append(fill);body.append(bar);
  const clearBtn=el('button','btn sm','LIMPIAR');body.append(clearBtn);
  const ctx=canvas.getContext('2d');
  const mask=document.createElement('canvas');mask.width=280;mask.height=280;
  const mctx=mask.getContext('2d');
  mctx.fillStyle='#fff';mctx.strokeStyle='#fff';mctx.lineWidth=14;mctx.lineJoin='round';mctx.lineCap='round';
  const path=new Path2D(meta.path);
  mctx.stroke(path);mctx.fill(path);
  const maskData=mctx.getImageData(0,0,280,280).data;
  let maskTotal=0;for(let i=3;i<maskData.length;i+=4)if(maskData[i]>40)maskTotal++;
  function paintGhost(){
   ctx.clearRect(0,0,280,280);
   ctx.fillStyle='#0a1a10';ctx.fillRect(0,0,280,280);
   ctx.strokeStyle='rgba(179,255,203,.35)';ctx.lineWidth=10;ctx.lineJoin='round';ctx.stroke(path);
   ctx.fillStyle='rgba(179,255,203,.08)';ctx.fill(path);
  }
  paintGhost();
  let drawing=false,won=false;
  function pos(e){
   const r=canvas.getBoundingClientRect();
   const t=e.touches?e.touches[0]:e;
   return {x:(t.clientX-r.left)*(280/r.width),y:(t.clientY-r.top)*(280/r.height)};
  }
  function stroke(e){
   if(!drawing||won)return;e.preventDefault();
   const {x,y}=pos(e);
   ctx.fillStyle='#45e583';ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fill();
   score();
  }
  function score(){
   const img=ctx.getImageData(0,0,280,280).data;
   let hit=0;
   for(let i=0;i<maskData.length;i+=4){
    if(maskData[i+3]>40){
     const g=img[i+1];
     if(g>80)hit++;
    }
   }
   const pct=maskTotal?hit/maskTotal:0;
   fill.style.width=Math.min(100,Math.round(pct*100))+'%';
   status.textContent=meta.name+': '+Math.round(pct*100)+'%';
   if(pct>=0.70&&!won){won=true;status.textContent='¡Silueta completa!';win();}
  }
  canvas.addEventListener('pointerdown',e=>{drawing=true;canvas.setPointerCapture(e.pointerId);stroke(e);});
  canvas.addEventListener('pointermove',stroke);
  canvas.addEventListener('pointerup',()=>drawing=false);
  canvas.addEventListener('pointercancel',()=>drawing=false);
  clearBtn.onclick=()=>{won=false;paintGhost();fill.style.width='0%';status.textContent='Rellena a '+meta.name+' (≥70%)';};
 }

 /* ===== TONGUE ===== */
 function playTongue(game,body,status,win){
  const idx=Math.max(1,Math.min(TONGUES.length,Number(game.tongue)||1))-1;
  const phrase=TONGUES[idx];
  const words=norm(phrase).split(' ').filter(w=>w.length>2);
  body.append(el('p','mini-phrase','« '+phrase+' »'));
  const heard=el('p','mini-heard','…');body.append(heard);
  const talk=el('button','btn sm','HABLAR');body.append(talk);
  let won=false;
  function check(text){
   heard.textContent='Te oí: '+text;
   const n=norm(text);
   const hit=words.filter(w=>n.includes(w)).length;
   const pct=words.length?hit/words.length:0;
   status.textContent='Palabras: '+Math.round(pct*100)+'%';
   if(pct>=0.6&&!won){won=true;win();}
  }
  const SR=g.SpeechRecognition||g.webkitSpeechRecognition;
  if(SR){
   talk.onclick=()=>{
    const rec=new SR();rec.lang='es-ES';rec.interimResults=false;rec.maxAlternatives=1;
    status.textContent='Escuchando…';
    rec.onresult=ev=>check(ev.results[0][0].transcript);
    rec.onerror=()=>{status.textContent='No se entendió · reintenta';};
    try{rec.start();}catch(e){status.textContent=e.message;}
   };
  }else{
   status.textContent='Sin reconocimiento de voz · mantén y habla, luego confirma';
   talk.textContent='MANTÉN Y HABLA';
   let stream=null,start=0,peak=0,ac=null,analyser=null,data=null,loop=0;
   async function startMic(){
    stream=await navigator.mediaDevices.getUserMedia({audio:true});
    ac=new(g.AudioContext||g.webkitAudioContext)();
    const src=ac.createMediaStreamSource(stream);
    analyser=ac.createAnalyser();analyser.fftSize=256;src.connect(analyser);
    data=new Uint8Array(analyser.frequencyBinCount);start=Date.now();peak=0;
    const tick=()=>{analyser.getByteFrequencyData(data);let s=0;for(const v of data)s+=v;peak=Math.max(peak,s/data.length);loop=requestAnimationFrame(tick);};
    tick();status.textContent='Habla ahora…';
   }
   function stopMic(){
    cancelAnimationFrame(loop);if(stream)stream.getTracks().forEach(t=>t.stop());if(ac)ac.close();
    const dur=(Date.now()-start)/1000;
    const need=Math.min(8,Math.max(2.5,phrase.length/18));
    if(dur>=need&&peak>18&&!won){heard.textContent='Audio OK ('+dur.toFixed(1)+'s)';won=true;win();}
    else status.textContent='Habla más fuerte/largo · reintenta';
   }
   talk.addEventListener('pointerdown',e=>{e.preventDefault();startMic().catch(()=>status.textContent='Micrófono bloqueado');});
   talk.addEventListener('pointerup',stopMic);
   talk.addEventListener('pointerleave',()=>{if(stream)stopMic();});
   const confirm=el('button','btn ghost sm','LO DIJE');
   confirm.onclick=()=>{if(!won){won=true;win();}};
   body.append(confirm);
  }
 }

 /* ===== DASH ===== */
 function playDash(game,body,status,win){
  const variant=game.variant||'taps';
  const need={taps:{taps:25,swipes:0},swipes:{taps:0,swipes:8},combo:{taps:15,swipes:3}}[variant]||{taps:25,swipes:0};
  let taps=0,swipes=0,won=false;
  status.textContent=variant==='swipes'?'Desliza horizontal ×'+need.swipes:variant==='combo'?'Toques '+need.taps+' + desliz '+need.swipes:'Toca ×'+need.taps;
  const zone=el('div','mini-dash-zone','¡AQUÍ!');
  body.append(zone);
  const bar=el('div','mini-bar');const fill=el('i');bar.append(fill);body.append(bar);
  function progress(){
   const a=need.taps?taps/need.taps:1,b=need.swipes?swipes/need.swipes:1;
   const pct=Math.min(a,b);
   fill.style.width=Math.round(pct*100)+'%';
   status.textContent='Toques '+taps+'/'+need.taps+(need.swipes?(' · Desliz '+swipes+'/'+need.swipes):'');
   if(taps>=need.taps&&swipes>=need.swipes&&!won){won=true;try{navigator.vibrate&&navigator.vibrate(40);}catch(e){}win();}
  }
  zone.addEventListener('pointerdown',e=>{
   e.preventDefault();taps++;try{navigator.vibrate&&navigator.vibrate(8);}catch(err){}progress();
  });
  let sx=0,sy=0;
  zone.addEventListener('pointerdown',e=>{const t=e.touches?e.touches[0]:e;sx=t.clientX;sy=t.clientY;});
  zone.addEventListener('pointerup',e=>{
   const t=e.changedTouches?e.changedTouches[0]:e;
   if(Math.abs(t.clientX-sx)>48&&Math.abs(t.clientX-sx)>Math.abs(t.clientY-sy)){swipes++;progress();}
  });
  progress();
 }

 /* ===== RHYTHM (Phi-mini) ===== */
 function chartFromSeed(seed,bpm){
  let s=seed|0;const rnd=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};
  const notes=[];const n=8+Math.floor(rnd()*7);
  let t=1.2;
  for(let i=0;i<n;i++){
   const ang=rnd()*Math.PI*2;
   const drag=rnd()>0.78;
   notes.push({t,ang,drag,dir:drag?(rnd()>.5?1:-1):0,hit:false,miss:false});
   t+=60/bpm*(0.7+rnd()*0.9);
  }
  return notes;
 }
 function playRhythm(game,body,status,win){
  const bpm=Number(game.bpm)||120;
  const notes=chartFromSeed(Number(game.seed)||1,bpm);
  const canvas=document.createElement('canvas');canvas.width=300;canvas.height=300;canvas.className='mini-canvas mini-rhythm';
  body.append(canvas);
  const ctx=canvas.getContext('2d');
  const cx=150,cy=150,judgeR=28,approach=1.15;
  let start=performance.now()/1000,playing=true,good=0,done=0,won=false;
  status.textContent='Toca al centro · ≥70% Good';
  const bar=el('div','mini-bar');const fill=el('i');bar.append(fill);body.append(bar);
  const retry=el('button','btn sm','REINTENTAR');retry.style.display='none';body.append(retry);
  function finish(){
   playing=false;stopLoop();
   const pct=notes.length?good/notes.length:0;
   fill.style.width=Math.round(pct*100)+'%';
   if(pct>=0.7&&!won){won=true;status.textContent='¡Chart clear! '+Math.round(pct*100)+'%';win();}
   else{status.textContent='Miss… '+Math.round(pct*100)+'% · reintenta';retry.style.display='';}
  }
  function restart(){
   notes.forEach(n=>{n.hit=false;n.miss=false;});good=0;done=0;won=false;playing=true;start=performance.now()/1000;retry.style.display='none';status.textContent='Toca al centro · ≥70% Good';fill.style.width='0%';loop();
  }
  retry.onclick=restart;
  function judge(note,now){
   const eta=note.t-now;
   if(Math.abs(eta)<=0.14){note.hit=true;good++;done++;try{beep(880,0.04);}catch(e){}return 'perfect';}
   if(Math.abs(eta)<=0.28){note.hit=true;good++;done++;try{beep(660,0.04);}catch(e){}return 'good';}
   return null;
  }
  let audioCtx=null;
  function beep(f,d){
   audioCtx=audioCtx||new(g.AudioContext||g.webkitAudioContext)();
   const o=audioCtx.createOscillator(),gain=audioCtx.createGain();
   o.frequency.value=f;gain.gain.value=0.05;o.connect(gain);gain.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+d);
  }
  canvas.addEventListener('pointerdown',e=>{
   if(!playing)return;e.preventDefault();
   const r=canvas.getBoundingClientRect();
   const x=(e.clientX-r.left)*(300/r.width),y=(e.clientY-r.top)*(300/r.height);
   const now=performance.now()/1000-start;
   let best=null,bestScore=9;
   for(const n of notes){
    if(n.hit||n.miss)continue;
    const prog=1-(n.t-now)/approach;
    if(prog<0.55||prog>1.25)continue;
    const rad=judgeR+(1-Math.min(1,Math.max(0,prog)))*110;
    const nx=cx+Math.cos(n.ang)*rad,ny=cy+Math.sin(n.ang)*rad;
    const dist=Math.hypot(nx-x,ny-y);
    if(dist<bestScore){bestScore=dist;best=n;}
   }
   if(best&&bestScore<42){
    if(best.drag){
     /* treat tap near as ok for party mode */
    }
    judge(best,now);
    fill.style.width=Math.round((good/notes.length)*100)+'%';
   }
  });
  function loop(){
   if(!playing)return;
   const now=performance.now()/1000-start;
   ctx.clearRect(0,0,300,300);
   ctx.fillStyle='#07140c';ctx.fillRect(0,0,300,300);
   ctx.beginPath();ctx.arc(cx,cy,judgeR,0,Math.PI*2);ctx.strokeStyle='#45e583';ctx.lineWidth=3;ctx.stroke();
   let pending=0;
   for(const n of notes){
    if(n.hit)continue;
    if(now>n.t+0.32&&!n.miss){n.miss=true;done++;continue;}
    const prog=1-(n.t-now)/approach;
    if(prog<0||prog>1.3){if(prog<=1.3)pending++;continue;}
    pending++;
    const rad=judgeR+(1-Math.min(1,prog))*110;
    const x=cx+Math.cos(n.ang)*rad,y=cy+Math.sin(n.ang)*rad;
    ctx.beginPath();ctx.arc(x,y,n.drag?12:10,0,Math.PI*2);
    ctx.fillStyle=n.drag?'#ffe14a':'#a55cff';ctx.fill();
    if(n.drag){
     ctx.strokeStyle='#ffe14a';ctx.beginPath();
     ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(n.ang+n.dir*Math.PI/2)*18,y+Math.sin(n.ang+n.dir*Math.PI/2)*18);ctx.stroke();
    }
   }
   if(done>=notes.length)finish();
   else raf=requestAnimationFrame(loop);
  }
  try{beep(440,0.05);}catch(e){}
  loop();
 }

 function runKind(game,body,status,win){
  if(game.kind==='draw')return playDraw(game,body,status,win);
  if(game.kind==='tongue')return playTongue(game,body,status,win);
  if(game.kind==='dash')return playDash(game,body,status,win);
  if(game.kind==='rhythm')return playRhythm(game,body,status,win);
  status.textContent='Tipo desconocido';
 }

 function submitWin(game,soloComplete){
  if(PingoMP.getRoom&&PingoMP.getRoom()){
   return PingoMP.answerMini(game.id,'win').then(()=>clearPanel()).catch(e=>{const s=panel().querySelector('.mini-status');if(s)s.textContent=e.message;});
  }
  if(typeof soloComplete==='function'&&game.index!=null)soloComplete(game.index);
  clearPanel();
 }

 function cancelGame(game){
  stopLoop();
  if(PingoMP.getRoom&&PingoMP.getRoom()&&game&&game.status==='live'){
   PingoMP.cancelMini(game.id).catch(()=>{});
  }
  clearPanel();
 }

 function render(game,soloComplete){
  if(!game)return;
  if(game.eligible&&!game.eligible.includes(me())&&game.status==='live')return;
  if(game.status==='cancelled'){clearPanel();return;}
  if(game.status==='won'){
   const p=panel();if(!p.hidden&&active&&active.id===game.id){const s=p.querySelector('.mini-status');if(s)s.textContent=statusLine(game);}
   return;
  }
  const key=JSON.stringify({id:game.id,kind:game.kind,status:game.status,silhouette:game.silhouette,tongue:game.tongue,variant:game.variant,seed:game.seed});
  if(key===shown&&game.status==='live')return;
  stopLoop();
  mountShell(
   game,
   (body,status,win)=>runKind(game,body,status,win),
   ()=>submitWin(game,soloComplete),
   ()=>cancelGame(game)
  );
 }

 function remote(game,players){
  if(!game){if(active)clearPanel();return;}
  const state={...game,winnerName:(players.find(p=>p.client_id===game.winner)||{}).name};
  if(state.status==='cancelled'){clearPanel();return;}
  if(state.eligible&&!state.eligible.includes(me())&&state.status==='live')return;
  render(state,null);
 }

 function solo(index,complete){
  const game=buildSoloChallenge();game.index=index;
  render(game,complete);
 }

 g.PingoMinigames={registry,remote,solo,reset:()=>{stopLoop();clearPanel();}};
})(window);
