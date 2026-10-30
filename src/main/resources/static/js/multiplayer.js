/* Supabase RPC authority. Every mutation is serialized locally and under a DB room lock. */
(function(global){
 const CFG=()=>global.PINGO_CONFIG||{};
 let sb=null,room=null,playerRow=null,onPlayers=null,onRoom=null,onError=null,timer=null,chain=Promise.resolve(),generation=0;
 function clientId(){return PingoRules.identity().id;}
 function enabled(){return !CFG().FORCE_SOLO&&!!(CFG().SUPABASE_URL&&CFG().SUPABASE_ANON_KEY&&global.supabase);}
 function init(){if(!enabled())return false;if(!sb)sb=global.supabase.createClient(CFG().SUPABASE_URL,CFG().SUPABASE_ANON_KEY);return true;}
 function accept(s){
  if(room&&s.room.id===room.id&&s.room.revision<room.revision)return;
  room=s.room;playerRow=s.players.find(p=>p.client_id===clientId());
  localStorage.setItem('pingo-remote-crowns',String(s.crowns));
  if(onPlayers)onPlayers(s.players);if(onRoom)onRoom(room);
 }
 function action(kind,data,id){
  const gen=generation, target=id===undefined?(room&&room.id):id;
  const run=chain.catch(()=>{}).then(async()=>{
   if(gen!==generation)throw new Error('Sesión reemplazada');
   if(!init())throw new Error('Supabase no configurado');
   const identity=PingoRules.identity();
   const payload=typeof data==='function'?data():data;
   const {data:state,error}=await sb.rpc('pingo_action',{p_client:identity.id,p_secret:identity.secret,p_action:kind,p_room:target,p_data:payload||{}});
   if(error)throw new Error(/pingo_action/.test(error.message)?'Falta aplicar supabase/migration_v2.sql en el servidor.':error.message);
   if(gen===generation)accept(state);return state;
  });chain=run;return run;
 }
 function poll(){clearInterval(timer);timer=setInterval(()=>{if(room)action('snapshot').catch(e=>{if(onError)onError(e);});},4000);}
 async function createRoom(size,name,cardCode,need,opts){await action('create',{size,name,codeCard:cardCode,title:opts.title,private:opts.isPrivate,password:opts.password,rules:opts.rules},null);poll();return room;}
 async function joinRoom(code,name,cardCode,need,password){await action('join',{code,name,codeCard:cardCode,password},null);poll();return room;}
 async function listRooms(){if(!init())return [];const {data,error}=await sb.from('rooms_lobby').select('*').order('created_at',{ascending:false}).limit(50);if(error)throw error;return data||[];}
 async function fetchPlayers(){return (await action('snapshot')).players;}
 async function startRoom(){await action('start');return room;}
 async function endRoom(){await action('end');return room;}
 async function saveMatchResults(rows,meta){if(meta.mode!=='room'){const identity=PingoRules.identity();const {data,error}=await sb.rpc('pingo_archive_solo',{p_client:identity.id,p_secret:identity.secret,p_match:meta.matchId,p_result:rows[0]});if(error)throw error;return data;}await action('archive');return {ok:true};}
 async function isMatchArchived(id){if(!init())return false;const {data,error}=await sb.from('match_archives').select('match_id').eq('match_id',id).maybeSingle();if(error)throw error;return !!data;}
 async function fetchLeaderboard(limit){
  if(!init())return [];
  const {data:matches,error}=await sb.from('match_results').select('match_id,created_at').order('created_at',{ascending:false}).limit(Math.max(limit||100,100));
  if(error)throw error;if(!matches.length)return [];
  const ids=[...new Set(matches.map(m=>m.match_id))].slice(0,25),rows=[];
  for(let offset=0;;offset+=1000){const {data,error}=await sb.from('match_results').select('*').in('match_id',ids).order('id').range(offset,offset+999);if(error)throw error;rows.push(...data);if(data.length<1000)break;}
  return rows;
 }
 async function refreshCrowns(){if(!init())return;const {count,error}=await sb.from('pingo_crowns').select('match_id',{count:'exact',head:true}).eq('client_id',clientId());if(error)throw error;if(count!==null&&count!==undefined)localStorage.setItem('pingo-remote-crowns',String(count));}

 async function syncProgress(stats){if(!room||!playerRow||!playerRow.card)return;return action('progress',()=>({...stats,revision:playerRow.revision}));}
 function queueSync(stats){return syncProgress(stats).catch(e=>{if(onError)onError(e);});}
 async function leave(){clearInterval(timer);try{if(room)await action('leave');}catch(e){if(onError)onError(new Error('Salida local; el servidor detectará la desconexión en 90 segundos.'));}finally{generation++;room=null;playerRow=null;}}
 global.PingoMP={enabled,init,clientId,createRoom,joinRoom,listRooms,fetchPlayers,startRoom,endRoom,saveMatchResults,isMatchArchived,fetchLeaderboard,
 getClient:()=>sb,refreshCrowns,queueSync,syncProgress,leave,isHost:()=>!!room&&room.host_client_id===clientId(),getRoom:()=>room,getPlayer:()=>playerRow,
 setHandlers:h=>{onPlayers=h.onPlayers;onRoom=h.onRoom;onError=h.onError;},
 setCard:card=>action('card',{card}),swap:index=>action('swap',{index}),startMini:index=>action('mini_start',{index}),answerMini:(id,answer)=>action('mini_answer',{id,answer:String(answer)}),refresh:()=>action('snapshot')};
})(window);
