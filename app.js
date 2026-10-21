/* ===== CONFIGURACIÓN: cambia textos y reglas aquí ===== */
const CONFIG = {
  APP_NAME: 'Bingo de Halloween',
  SIZE: 3,                    // 3 = cartilla 3×3 (el banco debe tener al menos SIZE*SIZE)
  FREE: true,                 // casilla central LIBRE (solo si SIZE es impar)
  CODE_PREFIX: 'HALLOWEEN-',
  STORAGE_KEY: 'bingo-halloween-v1'
};

/* ===== BANCO DE CASILLAS: agrega, borra o edita líneas ===== */
const BANK = [
  "Un fantasma que parece que sí murió",
  "Un niño con cara de necesitar terapia",
  "Un adulto llorando detrás de la máscara",
  "Un niño más aterrador que su disfraz",
  "Un esqueleto con mejor postura que tú",
  "Un payaso que debería estar vigilado",
  "Un asesino con el cuchillo de su mamá",
  "Sangre falsa con demasiada convicción",
  "Un niño cobrando dulces como una deuda",
  "Una abuela con más dulces que moral",
  "Un fantasma con hoyo para el celular",
  "Alguien disfrazado de mal diagnóstico",
  "Un zombie que ya venía así de casa",
  "Un niño sin ningún adulto a la vista",
  "Un adulto robándole dulces a un niño",
  "Una calabaza tallada con cara de tu ex",
  "Un vecino fingiendo no estar en casa",
  "Dulces vencidos desde 2019",
  "Un dulce sin envoltorio. Sospechoso",
  "Un perro que te juzga en silencio",
  "Un gato con plan de venganza",
  "Mascota más tolerante que su dueño",
  "Un muerto viviente con 2 horas de sueño",
  "Alguien que da más miedo sin disfraz",
  "Una pareja peleando en pleno disfraz",
  "Dos disfraces iguales",
  "Un grupo que no sabe quién eligió el tema",
  "Un amigo que ya vomitó. Son las 9",
  "Alguien llorando y diciendo “estoy bien”",
  "Buen intento P Diddy",
  "Un asesino serial con sudadera de la U",
  "Una momia desenrollándose en público",
  "Un disfraz roto, ahora es denuncia",
  "Alguien disfrazado de un lunes",
  "Alguien disfrazado de su saldo bancario",
  "Un zombie con mejor vida social que tú",
  "Una persona sola entre mil disfraces",
  "Un chiste de muertos que cayó mal",
  "Un velorio con mejor ambiente que esto",
  "Un señor de 40 pidiendo dulces en serio",
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

/* ===== LÓGICA ===== */
const $ = s => document.querySelector(s);
const N = CONFIG.SIZE, TOTAL = N * N;
const HAS_FREE = CONFIG.FREE && N % 2 === 1;
const FREE_IDX = (TOTAL - 1) / 2;
const POOL = [...new Set(BANK)];               // quita duplicados del banco por seguridad
const NEED = TOTAL - (HAS_FREE ? 1 : 0);
let st = null;

function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function randCode(){return Math.floor(Math.random()*65536).toString(16).toUpperCase().padStart(4,'0')}
// Misma semilla + mismo banco = misma cartilla
function build(code){
  const r = rng(parseInt(code,16));
  const a = POOL.slice();
  for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  const cells = a.slice(0,NEED);               // los primeros NEED del mezclado: sin repetidos
  if(HAS_FREE) cells.splice(FREE_IDX,0,null);
  return cells;
}
function lines(){
  const L=[];
  for(let r=0;r<N;r++)L.push({id:'r'+r,name:'Fila '+(r+1),c:[...Array(N)].map((_,c)=>r*N+c)});
  for(let c=0;c<N;c++)L.push({id:'c'+c,name:'Columna '+(c+1),c:[...Array(N)].map((_,r)=>r*N+c)});
  L.push({id:'d1',name:'Diagonal ↘',c:[...Array(N)].map((_,i)=>i*N+i)});
  L.push({id:'d2',name:'Diagonal ↙',c:[...Array(N)].map((_,i)=>i*N+(N-1-i))});
  return L;
}
const LINES = lines();
function save(){try{localStorage.setItem(CONFIG.STORAGE_KEY,JSON.stringify(st))}catch(e){}}
function load(){try{const s=JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY));if(s&&Array.isArray(s.cells)&&s.cells.length===TOTAL&&Array.isArray(s.marked))return s}catch(e){}return null}
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id===id));window.scrollTo(0,0)}
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2200)}
function parseCode(v){const m=String(v||'').trim().toUpperCase().replace(CONFIG.CODE_PREFIX,'');return /^[0-9A-F]{4}$/.test(m)?m:null}

function fresh(code){
  st.code=code; st.cells=build(code);
  st.marked=st.cells.map(c=>c===null); st.bingos=[];
  save(); renderGrid(); update();
}
function renderGrid(){
  const g=$('#grid'); g.innerHTML=''; g.style.setProperty('--n',N);
  st.cells.forEach((t,i)=>{
    const b=document.createElement('button'); b.type='button'; b.className='cell';
    if(t===null){b.classList.add('free');b.disabled=true;b.innerHTML='<b>🎃</b>LIBRE';b.setAttribute('aria-label','Casilla libre, ya marcada');}
    else{b.textContent=t;b.classList.add(t.length<26?'t1':t.length>44?'t3':'t2');b.dataset.i=i;b.setAttribute('aria-pressed','false');b.setAttribute('aria-label',t);b.onclick=()=>toggle(i)}
    g.append(b);
  });
}
function done(){
  const d=LINES.filter(l=>l.c.every(i=>st.marked[i]));
  if(st.marked.every(Boolean)) d.push({id:'full',name:'¡Cartilla completa!',c:[...Array(TOTAL).keys()]});
  return d;
}
function update(){
  const d=done(), win=new Set(); d.filter(l=>l.id!=='full').forEach(l=>l.c.forEach(i=>win.add(i)));
  [...$('#grid').children].forEach((b,i)=>{
    if(st.cells[i]===null){b.classList.toggle('win',win.has(i));return}
    b.classList.toggle('on',!!st.marked[i]); b.setAttribute('aria-pressed',!!st.marked[i]); b.classList.toggle('win',win.has(i));
  });
  const found=st.marked.filter((m,i)=>m&&st.cells[i]!==null).length, pct=Math.round(found/NEED*100);
  $('#gTitle').textContent='Bingo de '+st.name+' 🎃';
  $('#gCount').textContent=found+' / '+NEED+' encontrados';
  $('#gBar').style.width=pct+'%'; $('#gPct').textContent=pct+'%';
  $('#codeBtn').textContent=CONFIG.CODE_PREFIX+st.code+' 📋';
  return d;
}
function toggle(i){
  st.marked[i]=!st.marked[i];
  if(navigator.vibrate)try{navigator.vibrate(12)}catch(e){}
  const d=update();
  const fresh_=d.filter(l=>!st.bingos.includes(l.id));
  st.bingos=d.map(l=>l.id); save();
  if(fresh_.length&&st.marked[i]) bingo(fresh_);
}
function mini(set){
  const m=document.createElement('div');m.className='mini';m.style.gridTemplateColumns='repeat('+N+',1fr)';
  for(let i=0;i<TOTAL;i++){const c=document.createElement('i');if(set.has(i))c.className='w';m.append(c)}
  return m;
}
function bingo(ls){
  const full=ls.some(l=>l.id==='full'), set=new Set(); ls.forEach(l=>l.c.forEach(i=>set.add(i)));
  confetti();
  modal({emoji:'🎃 👻 🎃',title:full?'¡CARTILLA!':'¡BINGO!',
    text:(full?'¡Completaste TODA la cartilla! ':'Acabas de completar: '+ls.map(l=>l.name).join(' + ')+'. ')+'¡Encontraste '+(full?NEED:N)+' cosas de Halloween!',
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
  const found=st.marked.filter((m,i)=>m&&st.cells[i]!==null).length;
  return '🎃 '+CONFIG.APP_NAME+'\nJugador: '+st.name+'\n'+found+'/'+NEED+' encontrados\nCódigo: '+CONFIG.CODE_PREFIX+st.code;
}
async function share(){
  const text=shareText();
  if(navigator.share){try{await navigator.share({title:CONFIG.APP_NAME,text});return}catch(e){if(e&&e.name==='AbortError')return}}
  try{await copy(text);toast('Copiado. Pégalo en el grupo 📋')}catch(e){toast('No se pudo copiar')}
}
function start(name,codeRaw){
  let code=null;
  if(codeRaw&&codeRaw.trim()){code=parseCode(codeRaw);if(!code){toast('Código inválido. Ej: '+CONFIG.CODE_PREFIX+'7F3A');return}}
  st={name:name||'invitado',code:'',cells:[],marked:[],bingos:[]};
  fresh(code||randCode()); show('game');
}

/* ===== EVENTOS ===== */
document.title=CONFIG.APP_NAME;
$('#goName').onclick=()=>{show('name');$('#nameIn').focus()};
$('#startNamed').onclick=()=>{const n=$('#nameIn').value.trim();if(!n){toast('Escribe tu nombre o entra como invitado');$('#nameIn').focus();return}start(n,$('#codeIn').value)};
$('#startGuest').onclick=()=>start('',$('#codeIn').value);
$('#nameIn').addEventListener('keydown',e=>{if(e.key==='Enter')$('#startNamed').click()});
$('#share').onclick=share;
$('#codeBtn').onclick=()=>copy(CONFIG.CODE_PREFIX+st.code).then(()=>toast('Código copiado')).catch(()=>toast('No se pudo copiar'));
$('#newCard').onclick=()=>modal({emoji:'🔄',title:'¿NUEVA?',text:'¿Quieres generar una nueva cartilla? Perderás el progreso actual.',
  btns:[['CANCELAR','ghost',null],['NUEVA CARTILLA','',()=>fresh(randCode())]]});

/* ===== ARRANQUE: retoma la cartilla guardada ===== */
st=load();
if(st){renderGrid();update();show('game')}
