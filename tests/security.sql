-- Verify RLS even when ordinary table DML grants exist (as in Supabase defaults).
begin;
grant insert,update,delete on rooms,players,match_results,match_archives,pingo_crowns to anon;
grant select on players to anon;
set local role anon;
do $$
declare blocked boolean; s jsonb; id text:='v2-'||gen_random_uuid(); secret text:=repeat('s',72);match uuid:=gen_random_uuid();r uuid;
begin
 blocked:=false;begin insert into rooms(code,size,host_client_id)values('FORGED',3,'fake');exception when insufficient_privilege then blocked:=true;end;assert blocked,'Direct room write allowed';
 blocked:=false;begin perform secret_hash from pingo_credentials;exception when insufficient_privilege then blocked:=true;end;assert blocked,'Credential hashes exposed';
 blocked:=false;begin perform password from rooms;exception when insufficient_privilege then blocked:=true;end;assert blocked,'Room passwords exposed';
 blocked:=false;begin insert into pingo_crowns values(gen_random_uuid(),'fake',now());exception when insufficient_privilege then blocked:=true;end;assert blocked,'Direct crown mint allowed';
 assert not exists(select 1 from players),'Private player cards exposed';
 s:=pingo_archive_solo(id,secret,match,'{"size":3,"player_name":"Solo","found":8,"bingos":8,"retos_ok":1,"retos_paid":0}');
 assert s->>'ok'='true','Solo archive failed';
 s:=pingo_archive_solo(id,secret,match,'{"size":3,"player_name":"Solo","found":8,"bingos":8,"retos_ok":1,"retos_paid":0}');
 perform set_config('pingo.test_match',match::text,true);
 raise notice 'PASS anonymous RLS / no credential or password access / solo archive retained and idempotent';
end $$;
reset role;
do $$ begin
 assert (select count(*)=1 from match_results where match_id=current_setting('pingo.test_match')::uuid),'Duplicate solo archive';
 assert not exists(select 1 from pingo_crowns where match_id=current_setting('pingo.test_match')::uuid),'Solo minted competitive crown';
end $$;
rollback;
