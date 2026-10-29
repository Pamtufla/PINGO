/* ===== CONFIGURACIÓN: cambia textos y reglas aquí ===== */
const CONFIG = {
  APP_NAME: 'Pingo de Halloween',
  SIZES: { 3: 'Rapidita', 4: 'Normal', 5: 'Jobless' },
  FREE: true,
  DEFAULT_SIZE: 3,
  RETOS: { 3:1, 4:2, 5:4 },
  PENALTY: 5,
  CURRENCY: 'S/',
  CODE_PREFIX: 'HALLOWEEN-',
  STORAGE_KEY: 'bingo-halloween-v1',
  TUTORIAL_KEY: 'pingo-tutorial-done',
  HISTORY_KEY: 'pingo-history-v1'
};

const BANK = [
  "Spiderman gordo","Bebe disfrazado","Familia disfrazada","Un niño malcriado de cara",
  "Un esqueleto con mejor postura que tú","Michael Jackson","Putidisfraz","Diabla/Gata/Coneja",
  "Disfraz de Marvel","Joker de Acomayo","Trabajador de Tambo disfrazado","Cachaquito",
  "Disfraz patriota","Disfraz de Anime","Disfraz con Sangre","ÑaimCraft","Pokemon de Tinguiña",
  "Dulces vencidos desde 2019","Star Wars","Trans en cubierto","Femboy","Furros(Con o sin plug)",
  "Empresas","Anacrónicos de FNAF","CJ(GTA)","Lentes negros de noche","Niño sin disfraz",
  "Un amigo que ya vomitó","Master Chief","Buen intento P Diddy","Un asesino serial con sudadera de la U",
  "Una momia desenrollándose en público","Disfraz de profesión","Disfraces quemados(típicos)",
  "Disfraz religioso","Pataclaun","Princesa de Disney","Disfraz de DC","Un velorio con mejor ambiente",
  "Disfraz de Magia","Alguien dando el pésame al “muerto”","Un bulto en el piso: ¿borracho o cadáver?",
  "Un niño disfrazado de oficinista","Un oficinista disfrazado de oficinista","Un “zombie” con resaca de ayer",
  "Un amigo que se rindió y se fue a casa","Una máscara que da miedo al sonreír","Una bruja con mejor trabajo que tú",
  "Una calabaza podrida del año pasado","Una tumba de cartón con nombre mal escrito","Un adorno que da miedo sin razón",
  "“Yo no creo en esto” corriendo","Un NPC cargando una bolsa de dulces","Un grupo que se odia, pero posa",
  "Alguien pidiendo dulces como amenaza","Una caja de dulces abandonada a su suerte","Un doctor que no es doctor",
  "Una “mordida” que en realidad es chupetón","Un bebé con cara de arrepentirse de nacer","Alguien que se cae y sigue en personaje",
  "Un cadáver fingido que sí se movió","Una sombra que resultó ser un vecino","Un adulto asustando niños demasiado bien",
  "Una casa a oscuras con un ruido raro","Un disfraz que ya olía a muerto","Un hombre arrastrando a su amigo “muerto”",
  "Un sobreviviente de una mala decisión","Un fantasma que no sabe que murió","Alguien con la lápida de su sueldo"
];

const RETOS = [
  "Haz el BAAAKAA en voz alta","Pide el IG a una chica","Sacarse una foto con un grupo",
  "Recibir un dulce","Elogiar un disfraz(sexo opuesto)","Aullar como lobo","Tirate al piso por 5 segundos"
];

const TUTORIAL = [
  {
    title: '1. Tu cartilla',
    text: 'Cada casilla es algo que puedes ver en la fiesta. Cuando lo encuentres, tócala para marcarla.',
    visual: 'grid'
  },
  {
    title: '2. Retos (!)',
    text: 'Las casillas moradas con “!” son retos. Cúmplelos o paga ' + CONFIG.CURRENCY + ' ' + CONFIG.PENALTY + ' para marcarlas.',
    visual: 'reto'
  },
  {
    title: '3. ¡PINGO!',
    text: 'Completa una fila, columna o diagonal para gritar PINGO. Llena toda la cartilla y eres el monstruo de la noche.',
    visual: 'bingo'
  },
  {
    title: '4. Modo competitivo',
    text: 'Crea o únete a una sala. Verás el ranking de todos en tiempo real: quién marca más, quién hace PINGO primero.',
    visual: 'rank'
  }
];

/* ===== ESTADO ===== */
const $ = s => document.querySelector(s);
const POOL = [...new Set(BANK)];
const RPOOL = [...new Set(RETOS)];
let st = null, G = null, LINES = [], pick = CONFIG.DEFAULT_SIZE;
let playMode = 'solo'; // solo | host | join
let tutStep = 0;
let rivals = [];
let lastRankOrder = [];
let busy = false;
let pendingResults = null; // { matchId, mode, roomCode, size, rows }
let resultsLocked = false;
let histTab = 'top';

function geo(n){
  const total = n*n, free = CONFIG.FREE && n%2===1;
  return {N:n, TOTAL:total, HAS_FREE:free, FREE_IDX:(total-1)/2, NEED:total-(free?1:0), RETOS:Math.min(CONFIG.RETOS[n]||0, RPOOL.length)};
}
function setSize(n){G=geo(n);LINES=lines(n)}
function onlineOk(){return window.PingoMP && PingoMP.enabled()}

function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function randCode(){return Math.floor(Math.random()*65536).toString(16).toUpperCase().padStart(4,'0')}

function build(code){
  const r = rng(parseInt(code,16));
  const mix = arr => {const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  const normal = mix(POOL), retos = mix(RPOOL);
  const slots = [...Array(G.TOTAL).keys()].filter(i=>!(G.HAS_FREE&&i===G.FREE_IDX));
  const retoAt = new Set(mix(slots).slice(0,G.RETOS));
  let ni=0, ri=0;
  return [...Array(G.TOTAL).keys()].map(i=>{
    if(G.HAS_FREE&&i===G.FREE_IDX) return null;
    return retoAt.has(i) ? {t:retos[ri++],ch:true} : {t:normal[ni++]};
  });
}
function lines(N){
  const L=[];
  for(let r=0;r<N;r++)L.push({id:'r'+r,name:'Fila '+(r+1),c:[...Array(N)].map((_,c)=>r*N+c)});
  for(let c=0;c<N;c++)L.push({id:'c'+c,name:'Columna '+(c+1),c:[...Array(N)].map((_,r)=>r*N+c)});
  L.push({id:'d1',name:'Diagonal ↘',c:[...Array(N)].map((_,i)=>i*N+i)});
  L.push({id:'d2',name:'Diagonal ↙',c:[...Array(N)].map((_,i)=>i*N+(N-1-i))});
  return L;
}
function save(){try{localStorage.setItem(CONFIG.STORAGE_KEY,JSON.stringify(st))}catch(e){}}
function load(){try{
  const s=JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY));
  if(s&&CONFIG.SIZES[s.size]&&Array.isArray(s.cells)&&s.cells.length===s.size*s.size&&Array.isArray(s.marked)){s.how=s.how||{};return s}
}catch(e){}return null}
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id===id));window.scrollTo(0,0)}
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2200)}

function fullCode(){return CONFIG.CODE_PREFIX+st.size+'-'+st.code}
function parseCode(v){
  const s=String(v||'').trim().toUpperCase().replace(CONFIG.CODE_PREFIX,'');
  const m=s.match(/^(?:(\d)-)?([0-9A-F]{4})$/);
  if(!m||(m[1]&&!CONFIG.SIZES[m[1]]))return null;
  return {size:m[1]?+m[1]:null, code:m[2]};
}

/* ===== TUTORIAL ===== */
function tutorialDone(){try{return localStorage.getItem(CONFIG.TUTORIAL_KEY)==='1'}catch(e){return false}}
function markTutorialDone(){try{localStorage.setItem(CONFIG.TUTORIAL_KEY,'1')}catch(e){}}
function openTutorial(fromHome){
  tutStep=0; renderTutorial(); show('tutorial');
  $('#tutNext').dataset.after = fromHome ? 'name' : 'name';
}
function renderTutorial(){
  const step=TUTORIAL[tutStep];
  const card=$('#tutCard');
  card.classList.remove('tut-in'); void card.offsetWidth; card.classList.add('tut-in');
  $('#tutTitle').textContent=step.title;
  $('#tutText').textContent=step.text;
  const v=$('#tutVisual');
  v.className='tut-visual v-'+step.visual;
  v.innerHTML = step.visual==='grid' ? miniDemo(false)
    : step.visual==='reto' ? '<div class="demo-cell reto">!</div><p>Reto</p>'
    : step.visual==='bingo' ? miniDemo(true)
    : '<ol class="demo-rank"><li class="gold">1. Tú — 80%</li><li>2. Rival — 50%</li><li>3. Invitado — 25%</li></ol>';
  const dots=$('#tutDots'); dots.innerHTML='';
  TUTORIAL.forEach((_,i)=>{
    const d=document.createElement('button'); d.type='button'; d.className='dot'+(i===tutStep?' on':'');
    d.setAttribute('aria-label','Paso '+(i+1)); d.onclick=()=>{tutStep=i;renderTutorial()};
    dots.append(d);
  });
  $('#tutNext').textContent = tutStep===TUTORIAL.length-1 ? '¡A JUGAR!' : 'SIGUIENTE';
}
function miniDemo(win){
  let h='<div class="demo-grid">';
  for(let i=0;i<9;i++){
    const on = win ? (i%3===0||i===4) : i===0||i===4||i===8;
    h+='<i class="'+(on?'on':'')+(i===4?' free':'')+'"></i>';
  }
  return h+'</div>';
}
function nextTutorial(){
  if(tutStep < TUTORIAL.length-1){tutStep++;renderTutorial();return}
  markTutorialDone();
  show('name'); $('#nameIn').focus();
}
function skipTutorial(){markTutorialDone(); show('name'); $('#nameIn').focus()}

/* ===== MODOS ===== */
function setMode(mode){
  playMode=mode;
  [...$('#modeGrid').children].forEach(b=>{
    const on=b.dataset.mode===mode;
    b.classList.toggle('on',on);
  });
  const roomIn=$('#roomIn');
  roomIn.style.display = mode==='join' ? '' : 'none';
  if(mode==='join') roomIn.focus();
  // En join el tamaño lo impone la sala
  $('#sizes').style.opacity = mode==='join' ? '.45' : '1';
  $('#sizes').style.pointerEvents = mode==='join' ? 'none' : '';
}

/* ===== JUEGO ===== */
function fresh(code){
  st.code=code; st.cells=build(code);
  st.marked=st.cells.map(c=>c===null); st.bingos=[]; st.how={};
  save(); renderGrid(); update();
}
function renderGrid(){
  const g=$('#grid'); g.innerHTML=''; g.className='grid n'+G.N+' slam-in'; g.style.setProperty('--n',G.N);
  $('#game').dataset.n=G.N;
  st.cells.forEach((c,i)=>{
    const b=document.createElement('button'); b.type='button'; b.className='cell';
    if(c===null){b.classList.add('free');b.disabled=true;b.innerHTML='<b></b>LIBRE';b.setAttribute('aria-label','Casilla libre, ya marcada');}
    else{
      const t=c.t;
      b.textContent=t;b.classList.add(t.length<26?'t1':t.length>44?'t3':'t2');
      if(c.ch)b.classList.add('reto');
      b.dataset.i=i;b.setAttribute('aria-pressed','false');b.setAttribute('aria-label',(c.ch?'Reto: ':'')+t);b.onclick=()=>toggle(i);
    }
    g.append(b);
  });
}
function done(){
  const d=LINES.filter(l=>l.c.every(i=>st.marked[i]));
  if(st.marked.every(Boolean)) d.push({id:'full',name:'¡Cartilla completa!',c:[...Array(G.TOTAL).keys()]});
  return d;
}
function retoStats(){
  const v=Object.keys(st.how).filter(i=>st.marked[i]).map(i=>st.how[i]);
  const paid=v.filter(x=>x==='paid').length;
  return {ok:v.length-paid, paid, total:paid*CONFIG.PENALTY};
}
function progressStats(event){
  const found=st.marked.filter((m,i)=>m&&st.cells[i]!==null).length;
  const rs=retoStats();
  return {found, need:G.NEED, bingos:st.bingos.length, retosOk:rs.ok, retosPaid:rs.paid, event:event||null};
}
function update(event){
  const d=done(), win=new Set(); d.filter(l=>l.id!=='full').forEach(l=>l.c.forEach(i=>win.add(i)));
  [...$('#grid').children].forEach((b,i)=>{
    if(st.cells[i]===null){b.classList.toggle('win',win.has(i));return}
    const was=b.classList.contains('on');
    b.classList.toggle('on',!!st.marked[i]); b.setAttribute('aria-pressed',!!st.marked[i]); b.classList.toggle('win',win.has(i));
    b.classList.toggle('paid',st.how[i]==='paid');
    if(!was && st.marked[i]) {b.classList.remove('mark-pop'); void b.offsetWidth; b.classList.add('mark-pop')}
  });
  const found=st.marked.filter((m,i)=>m&&st.cells[i]!==null).length, pct=Math.round(found/G.NEED*100);
  const rs=retoStats();
  $('#gTitle').textContent='Pingo de '+st.name;
  $('#gCount').textContent=found+' / '+G.NEED+' encontrados';
  $('#gBar').style.width=pct+'%'; $('#gPct').textContent=pct+'%';
  $('#gReto').textContent='Retos: '+rs.ok+' cumplidos · '+rs.paid+' pagados'+(rs.paid?' ('+CONFIG.CURRENCY+' '+rs.total+')':'');
  $('#codeBtn').textContent=fullCode();
  const room=PingoMP.getRoom && PingoMP.getRoom();
  const chip=$('#gRoom');
  if(room){chip.style.display=''; chip.textContent='Sala '+room.code+' · en vivo'; $('#liveBoard').style.display='';}
  else {chip.style.display='none'; $('#liveBoard').style.display='none'}
  if(room) PingoMP.queueSync(progressStats(event));
  return d;
}
function toggle(i){
  if(st.cells[i].ch&&!st.marked[i]){askReto(i);return}
  setMark(i,!st.marked[i]);
}
function setMark(i,on,how){
  st.marked[i]=on;
  if(on&&how)st.how[i]=how; else delete st.how[i];
  if(navigator.vibrate)try{navigator.vibrate(12)}catch(e){}
  const d=update(on?'mark':null);
  const fresh_=d.filter(l=>!st.bingos.includes(l.id));
  st.bingos=d.map(l=>l.id); save();
  if(fresh_.length&&on){
    bingo(fresh_);
    if(PingoMP.getRoom()) PingoMP.queueSync(progressStats(fresh_.some(l=>l.id==='full')?'cartilla':'bingo'));
  }
}
function askReto(i){
  const note=document.createElement('p');note.className='note';
  note.textContent='Cúmplelo o paga '+CONFIG.CURRENCY+' '+CONFIG.PENALTY+' para marcarla';
  modal({emoji:'bolt pk bolt',title:'¡RETO!',text:st.cells[i].t,extra:note,
    btns:[['LO CUMPLÍ','',()=>setMark(i,true,'done')],
          ['$ PAGO '+CONFIG.CURRENCY+' '+CONFIG.PENALTY,'pay',()=>setMark(i,true,'paid')],
          ['CANCELAR','ghost',null]]});
}
function mini(set){
  const m=document.createElement('div');m.className='mini';m.style.gridTemplateColumns='repeat('+G.N+',1fr)';
  for(let i=0;i<G.TOTAL;i++){const c=document.createElement('i');if(set.has(i))c.className='w';m.append(c)}
  return m;
}
function bingo(ls){
  const full=ls.some(l=>l.id==='full'), set=new Set(); ls.forEach(l=>l.c.forEach(i=>set.add(i)));
  confetti();
  if(full){
    modal({emoji:'pk gh pk',title:'¡CARTILLA!',
      text:'¡TE PASASTE DE MOSTRO! Revisa el podio y decide si guardas el resultado.',
      btns:[['VER RESULTADOS','',()=>finishMatch()],['SEGUIR JUGANDO','ghost',null]]});
    return;
  }
  modal({emoji:'pk gh pk',title:'¡PINGO!',
    text:'Acabas de completar: '+ls.map(l=>l.name).join(' + ')+'. ¡Encontraste '+G.N+' cosas de Halloween!',
    extra:mini(set),btns:[['SEGUIR JUGANDO','',null]]});
}
function modal({emoji,title,text,extra,btns}){
  $('#mEmoji').innerHTML=(emoji||'').split(' ').filter(Boolean).map(k=>'<i class="spr '+k+'"></i>').join(''); $('#mTitle').textContent=title; $('#mText').textContent=text||'';
  const x=$('#mExtra');x.innerHTML='';if(extra)x.append(extra);
  const b=$('#mBtns');b.innerHTML='';
  btns.forEach(([l,cls,fn])=>{const e=document.createElement('button');e.className='btn '+cls;e.textContent=l;e.onclick=()=>{$('#modal').classList.remove('on');if(fn)fn()};b.append(e)});
  $('#modal').classList.add('on'); b.firstChild.focus();
}
function confetti(){
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const em=['pk','bat','gh','skull','bolt'],col=['#ff7a1a','#7c3aed','#f6ecd9','#ffb066'];
  for(let i=0;i<46;i++){
    const s=document.createElement('span');s.className='cf';
    if(i%3===0){s.className='cf spr '+em[i%5];s.style.width=s.style.height=(22+Math.random()*14)+'px';s.style.margin='0'}
    else{s.style.width='9px';s.style.height='14px';s.style.background=col[i%4]}
    s.style.left=Math.random()*100+'vw';s.style.animationDuration=(1.6+Math.random()*1.6)+'s';s.style.animationDelay=Math.random()*.5+'s';
    document.body.append(s);setTimeout(()=>s.remove(),3800);
  }
}
function copy(text){
  if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(text);
  return new Promise((ok,no)=>{const t=document.createElement('textarea');t.value=text;t.style.cssText='position:fixed;opacity:0';document.body.append(t);t.select();try{document.execCommand('copy')?ok():no()}catch(e){no()}t.remove()});
}
function shareText(){
  const found=st.marked.filter((m,i)=>m&&st.cells[i]!==null).length, rs=retoStats();
  let t='🎃 '+CONFIG.APP_NAME+'\nJugador: '+st.name+'\n'+found+'/'+G.NEED+' encontrados ('+G.N+'×'+G.N+')\nRetos: '+rs.ok+' cumplidos, '+rs.paid+' pagados\nCódigo: '+fullCode();
  const room=PingoMP.getRoom && PingoMP.getRoom();
  if(room) t+='\nSala: '+room.code;
  return t;
}
async function share(){
  const text=shareText();
  if(navigator.share){try{await navigator.share({title:CONFIG.APP_NAME,text});return}catch(e){if(e&&e.name==='AbortError')return}}
  try{await copy(text);toast('Copiado. Pégalo en el grupo')}catch(e){toast('No se pudo copiar')}
}

function sizePicker(current,onPick){
  const w=document.createElement('div');w.className='sizes';w.setAttribute('role','radiogroup');w.setAttribute('aria-label','Tamaño de la cartilla');
  Object.entries(CONFIG.SIZES).forEach(([k,label])=>{
    const n=+k,b=document.createElement('button');b.type='button';b.className='size'+(n===current?' on':'');
    b.setAttribute('role','radio');b.setAttribute('aria-checked',n===current);
    b.innerHTML=n+'×'+n+'<small>'+label+'</small>';
    b.onclick=()=>{[...w.children].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-checked',x===b)});onPick(n)};
    w.append(b);
  });
  return w;
}

/* ===== MULTIPLAYER UI ===== */
function sortRivals(list){
  return list.slice().sort((a,b)=>{
    const pa=(a.found/(a.need||1)), pb=(b.found/(b.need||1));
    if(pb!==pa) return pb-pa;
    if(b.bingos!==a.bingos) return b.bingos-a.bingos;
    return a.name.localeCompare(b.name);
  });
}
function renderRankList(target, list, animate){
  const sorted=sortRivals(list);
  const me=PingoMP.clientId();
  const order=sorted.map(p=>p.client_id);
  target.innerHTML='';
  sorted.forEach((p,i)=>{
    const li=document.createElement('li');
    const pct=Math.round((p.found/(p.need||1))*100);
    li.className='rank-row'+(p.client_id===me?' me':'')+(i===0?' top':'');
    if(animate && lastRankOrder.length){
      const prev=lastRankOrder.indexOf(p.client_id);
      if(prev>i) li.classList.add('climbed');
    }
    li.innerHTML='<span class="pos">'+(i+1)+'</span><span class="nm">'+(p.client_id===me?'★ ':'')+escapeHtml(p.name)+'</span>'+
      '<span class="pct">'+pct+'%</span><span class="bar-mini"><i style="width:'+pct+'%"></i></span>'+
      (p.bingos?'<span class="bg">×'+p.bingos+'</span>':'');
    target.append(li);
  });
  lastRankOrder=order;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))}

function feed(msg){
  const el=$('#feed');
  const item=document.createElement('div');
  item.className='feed-item';
  item.textContent=msg;
  el.append(item);
  setTimeout(()=>item.classList.add('on'),20);
  setTimeout(()=>{item.classList.remove('on');setTimeout(()=>item.remove(),300)},3200);
}

function onPlayersUpdate(list){
  rivals=list;
  const lobbyOn=$('#lobby').classList.contains('on');
  if(lobbyOn) renderRankList($('#lobbyList'), list, false);
  if($('#game').classList.contains('on')){
    list.forEach(p=>{
      if(p.client_id===PingoMP.clientId()) return;
      if(p.last_event==='bingo'||p.last_event==='cartilla'){
        const key=p.client_id+':'+p.bingos+':'+p.last_event;
        if(!onPlayersUpdate._seen) onPlayersUpdate._seen=new Set();
        if(!onPlayersUpdate._seen.has(key)){
          onPlayersUpdate._seen.add(key);
          feed((p.last_event==='cartilla'?'💀 ':'🎃 ')+p.name+(p.last_event==='cartilla'?' completó la cartilla!':' hizo PINGO!'));
          if(p.last_event==='cartilla') confetti();
        }
      }
    });
    renderRankList($('#rankList'), list, true);
  }
  $('#lobbyStatus').textContent = list.length+' jugador'+(list.length===1?'':'es')+' en la sala';
}

function onRoomUpdate(r){
  if(r.status==='live' && $('#lobby').classList.contains('on')){
    toast('¡La partida empezó!');
    enterGameFromRoom();
  }
  if(r.status==='ended' && !resultsLocked && ($('#game').classList.contains('on') || $('#lobby').classList.contains('on'))){
    toast('Partida finalizada');
    finishMatch({ fromRemote: true });
  }
}

/* ===== RESULTADOS / HISTÓRICO ===== */
function newMatchId(){
  if(crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
    const r=Math.random()*16|0, v=c==='x'?r:(r&0x3|0x8);
    return v.toString(16);
  });
}
function soloStanding(){
  const rs=retoStats();
  const found=st.marked.filter((m,i)=>m&&st.cells[i]!==null).length;
  const need=G.NEED;
  const pct=Math.round(found/need*100);
  return [{
    client_id: onlineOk()?PingoMP.clientId():'local',
    name: st.name||'invitado',
    found, need, bingos: (st.bingos||[]).length,
    retos_ok: rs.ok, retos_paid: rs.paid, pct
  }];
}
function buildStandings(){
  const room=PingoMP.getRoom && PingoMP.getRoom();
  if(room && rivals && rivals.length){
    return sortRivals(rivals).map(p=>({
      client_id: p.client_id,
      name: p.name,
      found: p.found|0,
      need: p.need|0,
      bingos: p.bingos|0,
      retos_ok: p.retos_ok|0,
      retos_paid: p.retos_paid|0,
      pct: Math.round((p.found/(p.need||1))*100)
    }));
  }
  return soloStanding();
}
function renderResultsList(standings){
  const list=$('#resultsList'); list.innerHTML='';
  const me=onlineOk()?PingoMP.clientId():'local';
  standings.forEach((p,i)=>{
    const li=document.createElement('li');
    li.className='rank-row result-row'+(p.client_id===me?' me':'')+(i===0?' top':'')+(i===1?' silver':'')+(i===2?' bronze':'');
    li.innerHTML=
      '<span class="pos">'+(i+1)+'°</span>'+
      '<span class="nm">'+(p.client_id===me?'★ ':'')+escapeHtml(p.name)+'</span>'+
      '<span class="pct">'+p.pct+'%</span>'+
      '<span class="stat">Aciertos '+p.found+'/'+p.need+'</span>'+
      '<span class="stat">PINGOs '+p.bingos+'</span>'+
      '<span class="stat">Retos '+p.retos_ok+(p.retos_paid?' · $'+p.retos_paid:'')+'</span>';
    list.append(li);
  });
}
async function finishMatch(opts){
  opts=opts||{};
  if(resultsLocked) return;
  resultsLocked=true;
  // sync last progress before snapshot
  if(PingoMP.getRoom()){
    try{ await PingoMP.syncProgress(progressStats('end')); }catch(e){}
    try{ rivals = await PingoMP.fetchPlayers(); }catch(e){}
    if(!opts.fromRemote && PingoMP.isHost()){
      try{ await PingoMP.endRoom(); }catch(e){}
    }
  }
  const standings=buildStandings();
  const room=PingoMP.getRoom && PingoMP.getRoom();
  const mode=room?'room':'solo';
  pendingResults={
    matchId: newMatchId(),
    mode,
    roomCode: room?room.code:null,
    size: st?st.size:(G&&G.N)||3,
    standings,
    createdAt: new Date().toISOString()
  };
  $('#resultsMeta').textContent=
    (mode==='room'?'Sala '+pendingResults.roomCode+' · ':'Solo · ')+
    pendingResults.size+'×'+pendingResults.size+' · '+
    standings.length+' jugador'+(standings.length===1?'':'es');
  renderResultsList(standings);
  $('#resultsAsk').style.display='';
  $('#resultsSave').style.display='';
  $('#resultsDiscard').style.display='';
  show('results');
  confetti();
}
function toResultRows(pr){
  return pr.standings.map((p,i)=>({
    match_id: pr.matchId,
    room_code: pr.roomCode,
    mode: pr.mode,
    size: pr.size,
    player_name: p.name,
    client_id: p.client_id,
    position: i+1,
    found: p.found,
    need: p.need,
    bingos: p.bingos,
    retos_ok: p.retos_ok,
    retos_paid: p.retos_paid,
    pct: p.pct
  }));
}
function loadLocalHistory(){
  try{return JSON.parse(localStorage.getItem(CONFIG.HISTORY_KEY))||[]}catch(e){return []}
}
function saveLocalHistory(entry){
  const all=loadLocalHistory();
  all.unshift(entry);
  try{localStorage.setItem(CONFIG.HISTORY_KEY,JSON.stringify(all.slice(0,100)))}catch(e){}
}
async function savePendingResults(){
  if(!pendingResults){toast('No hay resultado');return}
  const rows=toResultRows(pendingResults);
  saveLocalHistory({
    matchId: pendingResults.matchId,
    mode: pendingResults.mode,
    roomCode: pendingResults.roomCode,
    size: pendingResults.size,
    createdAt: pendingResults.createdAt,
    standings: pendingResults.standings
  });
  if(onlineOk()){
    try{
      await PingoMP.saveMatchResults(rows);
      toast('Guardado en el histórico online');
    }catch(e){
      console.error(e);
      toast('Guardado solo en este dispositivo');
    }
  }else toast('Guardado en este dispositivo');
  afterResultsDecision();
}
function discardPendingResults(){
  pendingResults=null;
  toast('Resultado descartado');
  afterResultsDecision();
}
async function afterResultsDecision(){
  $('#resultsAsk').style.display='none';
  $('#resultsSave').style.display='none';
  $('#resultsDiscard').style.display='none';
  pendingResults=null;
  try{localStorage.removeItem(CONFIG.STORAGE_KEY)}catch(e){}
  st=null;
  if(PingoMP.getRoom && PingoMP.getRoom()){
    try{ await PingoMP.leave(); }catch(e){}
  }
  rivals=[]; lastRankOrder=[]; resultsLocked=false;
  $('#liveBoard').style.display='none';
}
function groupMatches(rows){
  const map=new Map();
  rows.forEach(r=>{
    const id=r.match_id||r.matchId;
    if(!map.has(id)) map.set(id,{
      matchId:id,
      mode:r.mode,
      roomCode:r.room_code||r.roomCode,
      size:r.size,
      createdAt:r.created_at||r.createdAt,
      standings:[]
    });
    map.get(id).standings.push({
      name:r.player_name||r.name,
      position:r.position,
      found:r.found, need:r.need, bingos:r.bingos,
      retos_ok:r.retos_ok, retos_paid:r.retos_paid, pct:r.pct,
      client_id:r.client_id
    });
  });
  map.forEach(m=>m.standings.sort((a,b)=>(a.position||99)-(b.position||99)));
  return [...map.values()].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
}
function flattenLocalAsRows(local){
  const rows=[];
  local.forEach(m=>{
    (m.standings||[]).forEach((p,i)=>rows.push({
      match_id:m.matchId, mode:m.mode, room_code:m.roomCode, size:m.size,
      created_at:m.createdAt, player_name:p.name, position:i+1,
      found:p.found, need:p.need, bingos:p.bingos,
      retos_ok:p.retos_ok, retos_paid:p.retos_paid, pct:p.pct, client_id:p.client_id
    }));
  });
  return rows;
}
async function openHistory(){
  show('history');
  await renderHistory();
}
async function renderHistory(){
  const list=$('#historyList'); list.innerHTML='';
  let remote=[];
  if(onlineOk()){
    try{ remote=await PingoMP.fetchLeaderboard(100); }catch(e){ console.error(e); }
  }
  const localRows=flattenLocalAsRows(loadLocalHistory());
  // merge: prefer remote ids, append local-only
  const remoteIds=new Set(remote.map(r=>r.match_id));
  const merged=remote.concat(localRows.filter(r=>!remoteIds.has(r.match_id)));

  if(!merged.length){
    $('#historyEmpty').style.display='';
    return;
  }
  $('#historyEmpty').style.display='none';

  if(histTab==='top'){
    const best=merged.slice().sort((a,b)=>{
      if(b.pct!==a.pct) return b.pct-a.pct;
      if(b.found!==a.found) return b.found-a.found;
      return (b.bingos||0)-(a.bingos||0);
    }).slice(0,30);
    best.forEach((r,i)=>{
      const li=document.createElement('li');
      li.className='rank-row result-row'+(i===0?' top':'');
      const when=r.created_at?new Date(r.created_at).toLocaleDateString():'';
      li.innerHTML=
        '<span class="pos">'+(i+1)+'</span>'+
        '<span class="nm">'+escapeHtml(r.player_name)+'</span>'+
        '<span class="pct">'+r.pct+'%</span>'+
        '<span class="stat">'+r.found+'/'+r.need+' · '+r.size+'×'+r.size+(when?' · '+when:'')+'</span>'+
        '<span class="stat">PINGOs '+(r.bingos||0)+' · Retos '+(r.retos_ok||0)+'</span>';
      list.append(li);
    });
  }else{
    groupMatches(merged).slice(0,25).forEach(m=>{
      const winner=m.standings[0];
      const li=document.createElement('li');
      li.className='rank-row result-row match-card';
      const when=m.createdAt?new Date(m.createdAt).toLocaleString():'';
      li.innerHTML=
        '<span class="pos">🏆</span>'+
        '<span class="nm">'+(m.mode==='room'?'Sala '+(m.roomCode||'?'):'Solo')+' · '+m.size+'×'+m.size+'</span>'+
        '<span class="pct">'+(winner?winner.pct+'%':'')+'</span>'+
        '<span class="stat">1° '+(winner?escapeHtml(winner.name):'-')+' · '+m.standings.length+' jugadores</span>'+
        '<span class="stat">'+when+'</span>';
      li.onclick=()=>{
        pendingResults=null;
        $('#resultsMeta').textContent=(m.mode==='room'?'Sala '+(m.roomCode||'?')+' · ':'Solo · ')+m.size+'×'+m.size;
        renderResultsList(m.standings.map(p=>({...p, client_id:p.client_id||''})));
        $('#resultsAsk').style.display='none';
        $('#resultsSave').style.display='none';
        $('#resultsDiscard').style.display='none';
        show('results');
      };
      list.append(li);
    });
  }
}

function enterLobby(){
  const r=PingoMP.getRoom();
  if(!r) return;
  $('#lobbyCode').textContent=r.code;
  const host=PingoMP.isHost();
  $('#lobbyStart').style.display=host?'':'none';
  $('#lobbyWaitHost').style.display=host?'none':'';
  $('#lobbyStatus').textContent=r.status==='live'?'Partida en curso':'Esperando jugadores…';
  show('lobby');
}

function enterGameFromRoom(){
  if(!st || !st.cells || !st.cells.length){
    // reconstruir cartilla desde player row
    const p=PingoMP.getPlayer();
    const r=PingoMP.getRoom();
    st={name:p.name,size:r.size,code:p.card_code,cells:[],marked:[],bingos:[],how:{},room:r.code};
    setSize(r.size); fresh(p.card_code);
  }
  show('game'); update();
}

async function begin(name){
  if(busy) return;
  const codeRaw=$('#codeIn').value;
  let p=null;
  if(codeRaw&&codeRaw.trim()){p=parseCode(codeRaw);if(!p){toast('Código inválido. Ej: '+CONFIG.CODE_PREFIX+'4-7F3A');return}}

  if(playMode!=='solo' && !onlineOk()){
    toast('Configura Supabase en config.js para salas online');
    return;
  }

  busy=true;
  try{
    if(playMode==='solo'){
      const n=(p&&p.size)||pick;
      st={name:name||'invitado',size:n,code:'',cells:[],marked:[],bingos:[],how:{}};
      setSize(n); fresh(p?p.code:randCode()); show('game');
      return;
    }

    PingoMP.setHandlers({ onPlayers: onPlayersUpdate, onRoom: onRoomUpdate });

    if(playMode==='host'){
      const n=(p&&p.size)||pick;
      setSize(n);
      const card=p?p.code:randCode();
      st={name:name||'invitado',size:n,code:card,cells:[],marked:[],bingos:[],how:{}};
      fresh(card);
      await PingoMP.createRoom(n, st.name, card, G.NEED);
      enterLobby();
      toast('Sala creada');
      return;
    }

    // join
    const roomCode=$('#roomIn').value;
    if(!roomCode.trim()){toast('Escribe el código de la sala');$('#roomIn').focus();return}
    const card=p?p.code:randCode();
    const room=await PingoMP.joinRoom(roomCode, name||'invitado', card, size=>geo(size).NEED);
    setSize(room.size);
    st={name:name||'invitado',size:room.size,code:card,cells:[],marked:[],bingos:[],how:{},room:room.code};
    fresh(card);
    await PingoMP.syncProgress(progressStats());
    if(room.status==='live') enterGameFromRoom();
    else enterLobby();
  }catch(err){
    console.error(err);
    toast(err.message||'No se pudo conectar');
  }finally{busy=false}
}

function restart(n){
  st.size=n;setSize(n);fresh(randCode());
  if(PingoMP.getRoom()) PingoMP.queueSync(progressStats('new'));
}
function hasCard(){return !!(st&&Array.isArray(st.cells)&&st.cells.length)}
function refreshHome(){
  const b=$('#resume'); if(!b)return;
  b.style.display=hasCard()?'':'none';
  if(hasCard())b.textContent='> CONTINUAR CARTILLA ('+st.size+'×'+st.size+')';
  const hint=$('#onlineHint');
  hint.textContent = onlineOk()
    ? 'Online listo · crea o únete a una sala'
    : 'Modo solo · configura config.js para multiplayer';
}
function goHome(){refreshHome();show('home')}
function resume(){if(!hasCard())return;update();show('game')}
function confirmNew(fn){
  if(!hasCard()){fn();return}
  modal({emoji:'skull',title:'¿OTRA?',text:'Ya tienes una cartilla en curso. Si empiezas otra, perderás la actual.',
    btns:[['CANCELAR','ghost',null],['EMPEZAR OTRA','',fn]]});
}

async function leaveRoom(){
  await PingoMP.leave();
  rivals=[]; lastRankOrder=[];
  $('#liveBoard').style.display='none';
  goHome();
}

/* ===== EVENTOS ===== */
document.title=CONFIG.APP_NAME;
$('#sizes').append(sizePicker(pick,n=>pick=n));
setMode('solo');

$('#goPlay').onclick=()=>{
  if(!tutorialDone()) openTutorial(true);
  else {show('name');$('#nameIn').focus()}
};
$('#goHistory').onclick=()=>openHistory();
$('#goTutorial').onclick=()=>openTutorial(false);
$('#tutNext').onclick=nextTutorial;
$('#tutSkip').onclick=skipTutorial;
$('#tabTop').onclick=()=>{histTab='top';$('#tabTop').classList.add('on');$('#tabMatches').classList.remove('on');renderHistory()};
$('#tabMatches').onclick=()=>{histTab='matches';$('#tabMatches').classList.add('on');$('#tabTop').classList.remove('on');renderHistory()};
$('#historyBack').onclick=goHome;
$('#resultsSave').onclick=()=>savePendingResults();
$('#resultsDiscard').onclick=()=>discardPendingResults();
$('#resultsHome').onclick=async()=>{
  if(pendingResults){
    modal({emoji:'skull',title:'¿SALIR?',text:'Si sales sin elegir, el resultado no se guardará en el histórico.',
      btns:[['CANCELAR','ghost',null],['SALIR SIN GUARDAR','',async()=>{await afterResultsDecision();goHome()}]]});
    return;
  }
  goHome();
};
$('#endMatch').onclick=()=>{
  modal({emoji:'skull',title:'¿FINALIZAR?',text:'Se mostrará el podio con posiciones y aciertos. Luego podrás guardar o borrar el resultado.',
    btns:[['CANCELAR','ghost',null],['FINALIZAR','',()=>finishMatch()]]});
};

[...$('#modeGrid').children].forEach(b=>b.onclick=()=>setMode(b.dataset.mode));

$('#startNamed').onclick=()=>{
  const n=$('#nameIn').value.trim();
  if(!n){toast('Escribe tu nombre o eres kbro');$('#nameIn').focus();return}
  confirmNew(()=>begin(n));
};
$('#startGuest').onclick=()=>confirmNew(()=>begin(''));
$('#toHub').onclick=async()=>{
  if(PingoMP.getRoom()){
    modal({emoji:'gh',title:'¿SALIR?',text:'Saldrás de la sala online. Tu progreso local se guarda.',
      btns:[['CANCELAR','ghost',null],['SALIR','',()=>leaveRoom()]]});
  } else goHome();
};
$('#backName').onclick=goHome;
$('#resume').onclick=resume;
$('#nameIn').addEventListener('keydown',e=>{if(e.key==='Enter')$('#startNamed').click()});
$('#share').onclick=share;
$('#codeBtn').onclick=()=>copy(fullCode()).then(()=>toast('Código copiado')).catch(()=>toast('No se pudo copiar'));
$('#newCard').onclick=()=>{
  if(PingoMP.getRoom()){toast('En sala competitiva mantienes tu cartilla');return}
  let n=st.size;
  modal({emoji:'gh',title:'¿NUEVA?',text:'Elige el tamaño de la nueva calaverita.',extra:sizePicker(n,v=>n=v),
    btns:[['CANCELAR','ghost',null],['NUEVA CARTILLA','',()=>restart(n)]]});
};

$('#copyRoom').onclick=()=>{
  const r=PingoMP.getRoom(); if(!r)return;
  copy(r.code).then(()=>toast('Código de sala copiado')).catch(()=>toast('No se pudo copiar'));
};
$('#lobbyStart').onclick=async()=>{
  try{
    await PingoMP.startRoom();
    enterGameFromRoom();
  }catch(e){toast(e.message||'No se pudo iniciar')}
};
$('#lobbyLeave').onclick=leaveRoom;

/* ===== ARRANQUE ===== */
if(onlineOk()) PingoMP.init();
st=load();
if(st){setSize(st.size);renderGrid();update();show('game')}
refreshHome();
