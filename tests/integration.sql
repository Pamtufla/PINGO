-- Transactional integration tests; always rolled back. Run on a disposable database.
begin;
create function pg_temp.card(n int, minis int default 0) returns jsonb language sql as $$
 select jsonb_build_object('cells',jsonb_agg(case when i=(n*n-1)/2 and n%2=1 then 'null'::jsonb when i<minis then jsonb_build_object('t','MINI','mini',true) when i=minis then jsonb_build_object('t','Reto','ch',true) else jsonb_build_object('t','Observa') end order by i)) from generate_series(0,n*n-1)i;
$$;
create function pg_temp.mark(r uuid,c text,secret text) returns jsonb language plpgsql as $$
declare p players; m jsonb;
begin select * into p from players where room_id=r and client_id=c;
 select jsonb_agg(true) into m from generate_series(1,9);
 return pingo_action(c,secret,'progress',r,jsonb_build_object('revision',p.revision,'marked',m,'how','{"0":"done"}'::jsonb));end $$;
create function pg_temp.fail_archive() returns trigger language plpgsql as $$
begin if current_setting('pingo.testfail',true)='yes' and new.player_name='Player 3' then raise exception 'Injected storage failure';end if;return new;end $$;
create trigger test_archive_failure before insert on match_results for each row execute function pg_temp.fail_archive();
do $$
declare ids text[]; secret text:=repeat('s',72); s jsonb; r uuid; code text; i int; count_ int; game jsonb; answer text; failed boolean;
begin
 for i in 1..6 loop ids:=array_append(ids,'v2-'||gen_random_uuid()::text);end loop;
 s:=pingo_action(ids[1],secret,'create',null,'{"size":3,"name":"Host","rules":{"podium":true,"minigames":0}}');r:=(s#>>'{room,id}')::uuid;code:=s#>>'{room,code}';
 perform pingo_action(ids[1],secret,'card',r,jsonb_build_object('card',pg_temp.card(3)));
 for i in 2..6 loop
  perform pingo_action(ids[i],secret,'join',null,jsonb_build_object('code',code,'name','Player '||i));
  perform pingo_action(ids[i],secret,'card',r,jsonb_build_object('card',pg_temp.card(3)));
 end loop;
 perform pingo_action(ids[1],secret,'start',r);
 for i in 2..6 loop perform pingo_action(ids[i],secret,'leave',r);end loop;
 s:=pingo_action(ids[2],secret,'join',null,jsonb_build_object('code',code,'name','Different'));
 assert (select count(*)=6 from players where room_id=r),'Reconnect duplicated player';
 assert (select name='Player 2' from players where room_id=r and client_id=ids[2]),'Name overwritten';
 perform pingo_action(ids[2],secret,'leave',r);
 perform pingo_action(ids[1],secret,'end',r);
 perform set_config('pingo.testfail','yes',true);
 failed:=false;begin perform pingo_action(ids[1],secret,'archive',r);exception when others then failed:=true;end;assert failed,'Failure not injected';
 assert not exists(select 1 from match_archives where match_id=r),'Partial archive lock persisted';
 assert not exists(select 1 from match_results where match_id=r),'Partial result persisted';
 perform set_config('pingo.testfail','no',true);
 perform pingo_action(ids[1],secret,'archive',r);
 perform pingo_action(ids[1],secret,'archive',r);
 assert (select count(*)=6 from match_results where match_id=r),'Lost disconnected participants';
 assert (select count(*)=0 from pingo_crowns where match_id=r),'Cancelled match awarded crown';
 raise notice 'PASS six participants / disconnect / reconnect / atomic repeated archive / cancellation';
 -- Two-player podium: first place must not end the match.
 s:=pingo_action(ids[1],secret,'create',null,'{"size":3,"rules":{"podium":true,"minigames":0}}');r:=(s#>>'{room,id}')::uuid;code:=s#>>'{room,code}';
 perform pingo_action(ids[1],secret,'card',r,jsonb_build_object('card',pg_temp.card(3)));
 perform pingo_action(ids[2],secret,'join',null,jsonb_build_object('code',code));perform pingo_action(ids[2],secret,'card',r,jsonb_build_object('card',pg_temp.card(3)));
 perform pingo_action(ids[1],secret,'start',r);perform pg_temp.mark(r,ids[1],secret);
 assert (select status='live' from rooms where id=r),'Podium ended at first winner';
 assert (select position=1 from players where room_id=r and client_id=ids[1]),'Missing first place';
 perform pg_temp.mark(r,ids[1],secret);
 perform pg_temp.mark(r,ids[2],secret);
 assert (select status='ended' and valid_result from rooms where id=r),'Two-player podium did not end';
 assert (select position=2 from players where room_id=r and client_id=ids[2]),'Wrong second place';
 perform pingo_action(ids[1],secret,'archive',r);perform pingo_action(ids[1],secret,'archive',r);
 assert (select count(*)=1 from pingo_crowns where match_id=r),'Duplicate crown';
 failed:=false;begin perform pingo_action(ids[2],secret,'archive',r);exception when others then failed:=true;end;assert failed,'Nonhost archived';
 failed:=false;begin perform pingo_action(ids[1],repeat('x',72),'snapshot',r);exception when others then failed:=true;end;assert failed,'Forged identity accepted';
 raise notice 'PASS podium two players / repeated finish / exactly one crown / authority';
 -- Green tile, substitution limits, one answer, expiry after disconnect.
 s:=pingo_action(ids[1],secret,'create',null,'{"size":3,"rules":{"minigames":1,"substitutions":1,"reverse":true}}');r:=(s#>>'{room,id}')::uuid;
 perform pingo_action(ids[1],secret,'card',r,jsonb_build_object('card',pg_temp.card(3,1)));perform pingo_action(ids[1],secret,'start',r);
 perform pingo_action(ids[1],secret,'swap',r,'{"index":2}');
 failed:=false;begin perform pingo_action(ids[1],secret,'swap',r,'{"index":3}');exception when others then failed:=true;end;assert failed,'Swap limit bypassed';
 s:=pingo_action(ids[1],secret,'mini_start',r,'{"index":0}');game:=s#>'{room,game}';
 select g.answer into answer from pingo_game_secrets g where room_id=r;
 perform pingo_action(ids[1],secret,'mini_answer',r,jsonb_build_object('id',game->>'id','answer',answer));
 assert (select card#>>'{marked,0}'='true' from players where room_id=r and client_id=ids[1]),'Mini did not mark tile';
 failed:=false;begin perform pingo_action(ids[1],secret,'mini_answer',r,jsonb_build_object('id',game->>'id','answer',answer));exception when others then failed:=true;end;assert failed,'Duplicate answer accepted';
 assert (select mini_wins=1 from players where room_id=r and client_id=ids[1]),'Duplicate minigame reward';
 raise notice 'PASS green tile / validated answer / duplicate answer / replacement limit';
end $$;
do $$
declare host text:='v2-'||gen_random_uuid();guest text:='v2-'||gen_random_uuid();secret text:=repeat('s',72);s jsonb;r uuid;code text;g jsonb;failed boolean;
begin
 s:=pingo_action(host,secret,'create',null,'{"size":3,"rules":{"minigames":1,"reward":0}}');r:=(s#>>'{room,id}')::uuid;code:=s#>>'{room,code}';
 perform pingo_action(host,secret,'card',r,jsonb_build_object('card',pg_temp.card(3,1)));
 perform pingo_action(guest,secret,'join',null,jsonb_build_object('code',code));perform pingo_action(guest,secret,'card',r,jsonb_build_object('card',pg_temp.card(3,1)));
 perform pingo_action(host,secret,'start',r);
 s:=pingo_action(host,secret,'mini_start',r,'{"index":0}');g:=s#>'{room,game}';
 perform pingo_action(host,secret,'mini_answer',r,jsonb_build_object('id',g->>'id','answer','wrong'));
 perform pingo_action(guest,secret,'leave',r);
 update rooms set game=jsonb_set(game,'{until}',to_jsonb((now()-interval '1 second')::text)) where id=r;
 perform pingo_action(host,secret,'snapshot',r);
 assert (select game->>'status'='expired' from rooms where id=r),'Disconnected mini stuck';
 assert (select card#>>'{marked,0}'='true' from players where room_id=r and client_id=host),'Participation reward missing';
 failed:=false;begin perform pingo_action(guest,secret,'mini_answer',r,jsonb_build_object('id',g->>'id','answer','1'));exception when others then failed:=true;end;assert failed,'Late answer accepted';
 failed:=false;begin perform pingo_action(host,secret,'progress',r,'{"revision":0,"marked":[true,true,true,true,true,true,true,true,true]}');exception when others then failed:=true;end;assert failed,'Stale progress accepted';
 raise notice 'PASS minigame disconnect / expiry / participation reward / stale progress';
 -- Classic first winner ends, nonparticipants excluded, old history untouched.
 s:=pingo_action(host,secret,'create',null,'{"size":3,"rules":{"minigames":0}}');r:=(s#>>'{room,id}')::uuid;code:=s#>>'{room,code}';
 perform pingo_action(host,secret,'card',r,jsonb_build_object('card',pg_temp.card(3)));
 perform pingo_action(guest,secret,'join',null,jsonb_build_object('code',code));perform pingo_action(guest,secret,'leave',r);
 perform pingo_action(host,secret,'start',r);perform pg_temp.mark(r,host,secret);
 assert (select status='ended' from rooms where id=r),'Classic did not end';
 perform pingo_action(host,secret,'archive',r);
 assert (select count(*)=1 from match_results where match_id=r),'Lobby-only player archived';
 raise notice 'PASS classic first winner / lobby-only player excluded';
end $$;
rollback;
