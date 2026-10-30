const {execFile}=require('node:child_process'),{promisify}=require('node:util'),assert=require('node:assert/strict');const exec=promisify(execFile),db=process.env.PINGO_TEST_DATABASE||'postgresql://postgres@127.0.0.1:55439/postgres';
const sql=async q=>(await exec('psql',[db,'-At','-v','ON_ERROR_STOP=1','-c',q])).stdout.trim();
(async()=>{
 const ids=[crypto.randomUUID(),crypto.randomUUID()].map(id=>'v2-'+id),secret='s'.repeat(72),call=(i,action,r,data)=>`pingo_action('${ids[i]}','${secret}','${action}',${r?"'"+r+"'":'null'},'${JSON.stringify(data)}'::jsonb)`;
 const room=JSON.parse(await sql('select '+call(0,'create',null,{size:3,rules:{podium:true,minigames:0}}))).room;
 try{
 const card={cells:Array.from({length:9},(_,i)=>i===4?null:i===0?{t:'Reto',ch:true}:{t:'Observe'})};
 await sql('select '+call(0,'card',room.id,{card}));await sql('select '+call(1,'join',null,{code:room.code}));await sql('select '+call(1,'card',room.id,{card}));await sql('select '+call(0,'start',room.id,{}));
 const response=await Promise.all(ids.map((_,i)=>sql('select '+call(i,'progress',room.id,{revision:1,marked:Array(9).fill(true),how:{0:'done'}}))));
 assert.equal(response.length,2);assert.equal(await sql(`select string_agg(position::text,',' order by position) from players where room_id='${room.id}'`),'1,2');assert.equal(await sql(`select count(*) from pingo_crowns where match_id='${room.id}'`),'1');
 console.log('PASS concurrent independent database connections: unique places 1/2, one crown');
 }finally{await sql(`delete from pingo_crowns where match_id='${room.id}';delete from rooms where id='${room.id}';delete from pingo_credentials where client_id in ('${ids.join("','")}');`);}
})().catch(e=>{console.error(e);process.exitCode=1});
