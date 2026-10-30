/* Minigames: one attempt per round; server deadlines in multiplayer, local practice in solo. */
(function(g){
 const registry={quiz:{name:'Preguntas relámpago',min:1,max:null,seconds:20,rules:'Responde la suma. Gana la primera respuesta correcta.',score:1},odd:{name:'Encuentra el diferente',min:1,max:null,seconds:20,rules:'Toca el símbolo diferente. Una respuesta por ronda.',score:1}};
 let shown=null,clock=null;
 function render(game,answer){
  if(!game)return;const panel=document.getElementById('miniPanel');
  panel.hidden=false;panel.replaceChildren();
  const title=document.createElement('h3');title.textContent=game.title;panel.append(title);
  const question=document.createElement('p');question.textContent=game.question;panel.append(question);
  const status=document.createElement('p');panel.append(status);
  clearInterval(clock);
  const tick=()=>{const remaining=Math.max(0,Math.ceil((Date.parse(game.until)-Date.now())/1000));status.textContent=game.status==='won'?'Ronda resuelta · ganador: '+(game.winnerName||game.winner):game.status==='lost'?'Respuesta incorrecta':!remaining?'Tiempo agotado':remaining+' segundos · una respuesta';if(!remaining||game.status!=='live'){panel.querySelectorAll('button:not(.ghost)').forEach(b=>b.disabled=true);clearInterval(clock);}};
  for(const [i,value] of game.options.entries()){
   const button=document.createElement('button');button.className='btn sm';button.textContent=game.symbols?game.symbols[i]:String(value);
   button.disabled=game.status!=='live'||(game.attempts||[]).includes(PingoRules.identity().id)||(game.eligible&&!game.eligible.includes(PingoRules.identity().id));
   button.onclick=async()=>{panel.querySelectorAll('button').forEach(b=>b.disabled=true);try{await answer(value);}catch(e){status.textContent=e.message;}};panel.append(button);
  }
  const close=document.createElement('button');close.className='btn ghost sm';close.textContent='OCULTAR';close.onclick=()=>panel.hidden=true;panel.append(close);
  tick();clock=setInterval(tick,250);shown=JSON.stringify(game);
 }
 function remote(game,players){if(!game)return;const state={...game,winnerName:(players.find(p=>p.client_id===game.winner)||{}).name};if(JSON.stringify(state)!==shown)render(state,a=>PingoMP.answerMini(game.id,a));}
 function solo(index,complete){
  const kind=Math.random()<.5?'quiz':'odd',a=1+Math.floor(Math.random()*15),b=1+Math.floor(Math.random()*15),odd=Math.floor(Math.random()*6),solution=kind==='quiz'?a+b:odd;
  const game={id:PingoRules.uuid(),kind,title:registry[kind].name,question:kind==='quiz'?a+' + '+b+' = ?':'Selecciona el símbolo distinto',options:kind==='quiz'?[a+b-1,a+b,a+b+1,a+b+2].sort(()=>Math.random()-.5):[0,1,2,3,4,5],symbols:kind==='odd'?Array.from({length:6},(_,i)=>i===odd?'◆':'●'):null,until:new Date(Date.now()+20000).toISOString(),status:'live',attempts:[]};
  render(game,value=>{if(Date.now()>Date.parse(game.until))return;game.attempts=[PingoRules.identity().id];game.status=value===solution?'won':'lost';game.winnerName='Tú';if(value===solution)complete(index);render(game,()=>{});});
 }
 g.PingoMinigames={registry,remote,solo,reset:()=>{clearInterval(clock);shown=null;document.getElementById('miniPanel').hidden=true;}};
})(window);
