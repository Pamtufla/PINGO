/* ===== CONFIGURACIÓN: cambia textos y reglas aquí ===== */
const CONFIG = {
  APP_NAME: 'Pingo de Halloween',
  SIZES: { 3: 'Rapidita', 4: 'Normal', 5: 'Jobless' }, // tamaños elegibles
  FREE: true,                 // casilla central LIBRE (solo si SIZE es impar)
  DEFAULT_SIZE: 3,            // tamaño preseleccionado
  RETOS: { 3:1, 4:2, 5:4 },   //cuantos retos lleva cada tamaño
  PENALTY: 5, //penalización por no cumplir reto
  CURRENCY: 'S/',
  CODE_PREFIX: 'HALLOWEEN-',
  STORAGE_KEY: 'bingo-halloween-v1'
};

/* ===== BANCO DE CASILLAS: agrega, borra o edita líneas ===== */
const BANK = [
  "Spiderman gordo",
  "Bebe disfrazado",
  "Familia disfrazada",
  "Un niño malcriado de cara",
  "Un esqueleto con mejor postura que tú",
  "Michael Jackson",
  "Putidisfraz",
  "Diabla/Gata/Coneja",
  "Disfraz de Marvel",
  "Joker de Acomayo",
  "Trabajador de Tambo disfrazado",
  "Cachaquito",
  "Disfraz patriota",
  "Disfraz de Anime",
  "Disfraz con Sangre",
  "ÑaimCraft",
  "Pokemon de Tinguiña",
  "Dulces vencidos desde 2019",
  "Star Wars",
  "Trans en cubierto",
  "Femboy",
  "Furros(Con o sin plug)",
  "Empresas",
  "Anacrónicos de FNAF",
  "CJ(GTA)",
  "Lentes negros de noche",
  "Niño sin disfraz",
  "Un amigo que ya vomitó",
  "Master Chief",
  "Buen intento P Diddy",
  "Un asesino serial con sudadera de la U",
  "Una momia desenrollándose en público",
  "Disfraz de profesión",
  "Disfraces quemados(típicos)",
  "Disfraz religioso",
  "Pataclaun",
  "Princesa de Disney",
  "Disfraz de DC",
  "Un velorio con mejor ambiente",
  "Disfraz de Magia",
  "Alguien dando el pésame al “muerto”",
  "Un bulto en el piso: ¿borracho o cadáver?",
  "Un niño disfrazado de oficinista",
  "Un oficinista disfrazado de oficinista",
  "Un “zombie” con resaca de ayer",
  "Un amigo que se rindió y se fue a casa",
  "Una máscara que da miedo al sonreír",
  "Una bruja con mejor trabajo que tú",
  "Una calabaza podrida del año pasado",
  "Una tumba de cartón con nombre mal escrito",
  "Un adorno que da miedo sin razón",
  "“Yo no creo en esto” corriendo",
  "Un NPC cargando una bolsa de dulces",
  "Un grupo que se odia, pero posa",
  "Alguien pidiendo dulces como amenaza",
  "Una caja de dulces abandonada a su suerte",
  "Un doctor que no es doctor",
  "Una “mordida” que en realidad es chupetón",
  "Un bebé con cara de arrepentirse de nacer",
  "Alguien que se cae y sigue en personaje",
  "Un cadáver fingido que sí se movió",
  "Una sombra que resultó ser un vecino",
  "Un adulto asustando niños demasiado bien",
  "Una casa a oscuras con un ruido raro",
  "Un disfraz que ya olía a muerto",
  "Un hombre arrastrando a su amigo “muerto”",
  "Un sobreviviente de una mala decisión",
  "Un fantasma que no sabe que murió",
  "Alguien con la lápida de su sueldo"
];
/* BANCO DE RETOS agrega lo que quieras*/
const RETOS = [
  "Haz el BAAAKAA en voz alta",
  "Pide el IG a una chica",
  "Sacarse una foto con un grupo",
  "Recibir un dulce",
  "Elogiar un disfraz(sexo opuesto)",
  "Aullar como lobo",
  "Tirate al piso por 5 segundos"

];
/* ===== LÓGICA ===== */
const $ = s => document.querySelector(s);
const POOL = [...new Set(BANK)];               // quita duplicados del banco por seguridad
const RPOOL = [...new Set(RETOS)];
let st = null, G = null, LINES = [], pick = CONFIG.DEFAULT_SIZE;

//Cuanto te mide bro
function geo(n){
  const total = n*n, free = CONFIG.FREE && n%2===1;
  return {N:n, TOTAL:total, HAS_FREE:free, FREE_IDX:(total-1)/2, NEED:total-(free?1:0), RETOS:Math.min(CONFIG.RETOS[n]||0, RPOOL.length)};
}
function setSize(n){G=geo(n);LINES=lines(n)}
 
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function randCode(){return Math.floor(Math.random()*65536).toString(16).toUpperCase().padStart(4,'0')}

// Cada casilla es null (libre) o {t:texto, ch:true si es reto}
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
 
/* Código de cartilla: HALLOWEEN-4-7F3A (el tamaño es opcional al escribirlo) */
function fullCode(){return CONFIG.CODE_PREFIX+st.size+'-'+st.code}
function parseCode(v){
  const s=String(v||'').trim().toUpperCase().replace(CONFIG.CODE_PREFIX,'');
  const m=s.match(/^(?:(\d)-)?([0-9A-F]{4})$/);
  if(!m||(m[1]&&!CONFIG.SIZES[m[1]]))return null;
  return {size:m[1]?+m[1]:null, code:m[2]};
}
 
function fresh(code){
  st.code=code; st.cells=build(code);
  st.marked=st.cells.map(c=>c===null); st.bingos=[]; st.how={};
  save(); renderGrid(); update();
}
function renderGrid(){
  const g=$('#grid'); g.innerHTML=''; g.className='grid n'+G.N; g.style.setProperty('--n',G.N);
  $('#game').dataset.n=G.N;
  st.cells.forEach((c,i)=>{
    const b=document.createElement('button'); b.type='button'; b.className='cell';
    if(c===null){b.classList.add('free');b.disabled=true;b.innerHTML='<b>🎃</b>LIBRE';b.setAttribute('aria-label','Casilla libre, ya marcada');}
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
function update(){
  const d=done(), win=new Set(); d.filter(l=>l.id!=='full').forEach(l=>l.c.forEach(i=>win.add(i)));
  [...$('#grid').children].forEach((b,i)=>{
    if(st.cells[i]===null){b.classList.toggle('win',win.has(i));return}
    b.classList.toggle('on',!!st.marked[i]); b.setAttribute('aria-pressed',!!st.marked[i]); b.classList.toggle('win',win.has(i));
    b.classList.toggle('paid',st.how[i]==='paid');
  });
  const found=st.marked.filter((m,i)=>m&&st.cells[i]!==null).length, pct=Math.round(found/G.NEED*100);
  const rs=retoStats();
  $('#gTitle').textContent='Pingo de '+st.name+' 🎃';
  $('#gCount').textContent=found+' / '+G.NEED+' encontrados';
  $('#gBar').style.width=pct+'%'; $('#gPct').textContent=pct+'%';
  $('#gReto').textContent='⚡ Retos: '+rs.ok+' cumplidos · '+rs.paid+' pagados'+(rs.paid?' ('+CONFIG.CURRENCY+' '+rs.total+')':'');
  $('#codeBtn').textContent=fullCode()+' 📋';
  return d;
}
function toggle(i){
  if(st.cells[i].ch&&!st.marked[i]){askReto(i);return}   // los retos se confirman antes de marcar
  setMark(i,!st.marked[i]);
}
function setMark(i,on,how){
  st.marked[i]=on;
  if(on&&how)st.how[i]=how; else delete st.how[i];
  if(navigator.vibrate)try{navigator.vibrate(12)}catch(e){}
  const d=update();
  const fresh_=d.filter(l=>!st.bingos.includes(l.id));
  st.bingos=d.map(l=>l.id); save();
  if(fresh_.length&&on) bingo(fresh_);
}
function askReto(i){
  const note=document.createElement('p');note.className='note';
  note.textContent='Cúmplelo o paga '+CONFIG.CURRENCY+' '+CONFIG.PENALTY+' para marcarla';
  modal({emoji:'⚡ 🎃 ⚡',title:'¡RETO!',text:st.cells[i].t,extra:note,
    btns:[['✅ LO CUMPLÍ','',()=>setMark(i,true,'done')],
          ['💸 PAGO '+CONFIG.CURRENCY+' '+CONFIG.PENALTY,'pay',()=>setMark(i,true,'paid')],
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
  modal({emoji:'🎃 👻 🎃',title:full?'¡CARTILLA!':'¡PINGO!',
    text:(full?'¡TE PASASTE DE MOSTRO! ':'Acabas de completar: '+ls.map(l=>l.name).join(' + ')+'. ')+'¡Encontraste '+(full?G.NEED:G.N)+' cosas de Halloween!',
    extra:full?null:mini(set),btns:[['SEGUIR JUGANDO','',null]]});
}
function modal({emoji,title,text,extra,btns}){
  $('#mEmoji').textContent=emoji||''; $('#mTitle').textContent=title; $('#mText').textContent=text||'';
  const x=$('#mExtra');x.innerHTML='';if(extra)x.append(extra);
  const b=$('#mBtns');b.innerHTML='';
  btns.forEach(([l,cls,fn])=>{const e=document.createElement('button');e.className='btn '+cls;e.textContent=l;e.onclick=()=>{$('#modal').classList.remove('on');if(fn)fn()};b.append(e)});
  $('#modal').classList.add('on'); b.firstChild.focus();
}
function confetti(){
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const em=['🎃','🦇','👻','🕸️','🌙'],col=['#ff7a1a','#7c3aed','#f6ecd9','#ffb066'];
  for(let i=0;i<46;i++){
    const s=document.createElement('span');s.className='cf';
    if(i%3===0){s.textContent=em[i%5];s.style.fontSize=(18+Math.random()*14)+'px'}
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
  return '🎃 '+CONFIG.APP_NAME+'\nJugador: '+st.name+'\n'+found+'/'+G.NEED+' encontrados ('+G.N+'×'+G.N+')\nRetos: '+rs.ok+' cumplidos, '+rs.paid+' pagados\nCódigo: '+fullCode();
}
async function share(){
  const text=shareText();
  if(navigator.share){try{await navigator.share({title:CONFIG.APP_NAME,text});return}catch(e){if(e&&e.name==='AbortError')return}}
  try{await copy(text);toast('Copiado. Pégalo en el grupo 📋')}catch(e){toast('No se pudo copiar')}
}
 
//* Selector de tamaño
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
function start(name,codeRaw){
  let p=null;
  if(codeRaw&&codeRaw.trim()){p=parseCode(codeRaw);if(!p){toast('Código inválido. Ej: '+CONFIG.CODE_PREFIX+'4-7F3A');return}}
  const n=(p&&p.size)||pick;                   // si el código trae tamaño, manda el del código
  st={name:name||'invitado',size:n,code:'',cells:[],marked:[],bingos:[],how:{}};
  setSize(n); fresh(p?p.code:randCode()); show('game');
}
function restart(n){st.size=n;setSize(n);fresh(randCode())}
/* ===== INICIO / HUB: salir y volver a la cartilla en curso ===== */
function hasCard(){return !!(st&&Array.isArray(st.cells)&&st.cells.length)}
function refreshHome(){
  const b=$('#resume'); if(!b)return;
  b.style.display=hasCard()?'':'none';
  if(hasCard())b.textContent='▶ CONTINUAR CARTILLA ('+st.size+'×'+st.size+')';
}
function goHome(){refreshHome();show('home')}
function resume(){if(!hasCard())return;update();show('game')}
// Antes de empezar otra cartilla, avisa si ya hay una en curso
function confirmNew(fn){
  if(!hasCard()){fn();return}
  modal({emoji:'⚠️',title:'¿OTRA?',text:'Ya tienes una cartilla en curso. Si empiezas otra, perderás la actual.',
    btns:[['CANCELAR','ghost',null],['EMPEZAR OTRA','',fn]]});
}

/* ===== EVENTOS ===== */
document.title=CONFIG.APP_NAME;
$('#sizes').append(sizePicker(pick,n=>pick=n));
$('#goName').onclick=()=>{show('name');$('#nameIn').focus()};
$('#startNamed').onclick=()=>{const n=$('#nameIn').value.trim();if(!n){toast('Escribe tu nombre o eres kbro');$('#nameIn').focus();return}confirmNew(()=>start(n,$('#codeIn').value))};
$('#startGuest').onclick=()=>confirmNew(()=>start('',$('#codeIn').value));
$('#toHub').onclick=goHome;
$('#backName').onclick=goHome;
$('#resume').onclick=resume;
$('#nameIn').addEventListener('keydown',e=>{if(e.key==='Enter')$('#startNamed').click()});
$('#share').onclick=share;
$('#codeBtn').onclick=()=>copy(fullCode()).then(()=>toast('Código copiado')).catch(()=>toast('No se pudo copiar'));
$('#newCard').onclick=()=>{
  let n=st.size;
  modal({emoji:'🔄',title:'¿NUEVA?',text:'Elige el tamaño de la nueva calaverita calaverita.',extra:sizePicker(n,v=>n=v),
    btns:[['CANCELAR','ghost',null],['NUEVA CARTILLA','',()=>restart(n)]]});
};

/* ===== ARRANQUE: retoma la cartilla guardada ===== */
st=load();
if(st){setSize(st.size);renderGrid();update();show('game')}
refreshHome();
