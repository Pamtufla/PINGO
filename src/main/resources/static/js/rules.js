/* Shared, dependency-free rules. Existing cards remain unchanged. */
(function(g){
  const defaults={podium:false,substitutions:1,reverse:false,minigames:1,reward:1};
  const challenges=[
    {id:'memory',category:'mental',difficulty:'hard',text:'Memoriza seis palabras elegidas por el grupo y repítelas tras 30 segundos.'},
    {id:'alphabet',category:'mental',difficulty:'hard',text:'Di cinco animales en orden alfabético en 30 segundos.'},
    {id:'story',category:'creative',difficulty:'hard',text:'Cuenta una historia de un minuto usando cinco palabras elegidas por el grupo.'},
    {id:'rhyme',category:'creative',difficulty:'hard',text:'Inventa cuatro versos que rimen sobre tu disfraz.'},
    {id:'observe',category:'observation',difficulty:'normal',text:'Encuentra tres objetos de colores diferentes sin desplazarte.'}
  ];
  function rules(value){const r={...defaults,...value};return {...r,podium:!!r.podium,reverse:!!r.reverse,substitutions:Math.max(0,Math.min(3,Number(r.substitutions)||0)),minigames:Math.max(0,Math.min(3,Number(r.minigames)||0)),reward:r.reward===0?0:1};}
  function uuid(){if(crypto.randomUUID)return crypto.randomUUID();const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);}
  function identity(){let v=JSON.parse(localStorage.getItem('pingo-identity-v2')||'null');if(!v){v={id:'v2-'+uuid(),secret:uuid()+uuid()};localStorage.setItem('pingo-identity-v2',JSON.stringify(v));}return v;}
  function award(match,id,valid){if(!valid)return 0;let ledger=JSON.parse(localStorage.getItem('pingo-crowns-v2')||'{}');ledger[match]=id;localStorage.setItem('pingo-crowns-v2',JSON.stringify(ledger));return Object.values(ledger).filter(x=>x===id).length;}
  function crowns(){return Object.values(JSON.parse(localStorage.getItem('pingo-crowns-v2')||'{}')).filter(x=>x===identity().id).length;}
  function merge(old,rows){const m=new Map(old.map(p=>[p.client_id,p]));for(const p of rows){const prev=m.get(p.client_id);if(!prev||Number(p.revision||0)>=Number(prev.revision||0))m.set(p.client_id,p);}return [...m.values()];}
  const api={uuid,defaults,rules,challenges,identity,award,crowns,merge};g.PingoRules=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
