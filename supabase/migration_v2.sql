-- Apply AFTER schema.sql. Additive migration; legacy history is retained.
begin;
set local search_path=public,extensions;
alter table public.rooms add column if not exists rules jsonb not null default '{}';
alter table public.rooms add column if not exists revision bigint not null default 0;
alter table public.rooms add column if not exists game jsonb;
alter table public.rooms add column if not exists valid_result boolean not null default false;
alter table public.players add column if not exists participated boolean not null default false;
alter table public.players add column if not exists connected boolean not null default true;
alter table public.players add column if not exists position int;
alter table public.players add column if not exists revision bigint not null default 0;
alter table public.players add column if not exists card jsonb;
alter table public.players add column if not exists swaps int not null default 0;
alter table public.players add column if not exists mini_wins int not null default 0;
alter table public.players add column if not exists last_seen timestamptz not null default now();
create unique index if not exists players_finish_unique on public.players(room_id,position) where position is not null;
alter table public.match_results add column if not exists finished boolean;
alter table public.match_results add column if not exists mini_wins int not null default 0;
create table if not exists public.pingo_credentials(client_id text primary key, secret_hash text not null);
create table if not exists public.pingo_game_secrets(room_id uuid primary key references public.rooms(id) on delete cascade, answer text not null);
create table if not exists public.pingo_crowns(match_id uuid primary key, client_id text not null, created_at timestamptz not null default now());
alter table public.pingo_credentials enable row level security;
alter table public.pingo_game_secrets enable row level security;
alter table public.pingo_crowns enable row level security;
revoke all on public.pingo_credentials,public.pingo_game_secrets from anon,authenticated;
grant select on public.pingo_crowns to anon,authenticated;
drop policy if exists crowns_read on public.pingo_crowns;
create policy crowns_read on public.pingo_crowns for select using(true);
-- All writes go through capability-authenticated, room-serialized RPCs.
drop policy if exists rooms_insert on public.rooms;
drop policy if exists rooms_update on public.rooms;
drop policy if exists players_insert on public.players;
drop policy if exists players_update on public.players;
drop policy if exists players_delete on public.players;
drop policy if exists match_results_insert on public.match_results;
drop policy if exists match_archives_insert on public.match_archives;
-- Do not expose private passwords to public room reads.
update public.rooms set password=encode(digest(password,'sha256'),'hex') where password is not null and length(password)<>64;

create or replace function public.pingo_action(p_client text,p_secret text,p_action text,p_room uuid default null,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public,extensions as $$
declare r rooms; p players; v_card jsonb; v_mark jsonb; v_how jsonb; v_cells jsonb; v_count int; v_target int; v_pos int; v_i int; v_n int; v_a int; v_b int; v_answer text; v_game jsonb; v_options jsonb; v_now timestamptz:=clock_timestamp(); v_valid boolean; v_row record;
begin
 if p_client !~ '^v2-[0-9a-f-]{36}$' or length(p_secret)<64 or length(p_secret)>128 then raise exception 'Identidad inválida'; end if;
 insert into pingo_credentials values(p_client,encode(digest(p_secret,'sha256'),'hex')) on conflict do nothing;
 if not exists(select 1 from pingo_credentials where client_id=p_client and secret_hash=encode(digest(p_secret,'sha256'),'hex')) then raise exception 'Identidad no autorizada'; end if;
 if p_action='create' then
  if (p_data->>'size')::int not in (3,4,5) then raise exception 'Tamaño inválido'; end if;
  if coalesce((p_data->>'private')::boolean,false) and length(coalesce(p_data->>'password',''))<3 then raise exception 'Contraseña demasiado corta'; end if;
  insert into rooms(code,size,host_client_id,title,is_private,password,rules)
   values(upper(substr(encode(gen_random_bytes(6),'hex'),1,8)),(p_data->>'size')::int,p_client,left(coalesce(p_data->>'title','Sala'),40),coalesce((p_data->>'private')::boolean,false),
   case when (p_data->>'private')::boolean then encode(digest(p_data->>'password','sha256'),'hex') end,
   jsonb_build_object('podium',coalesce((p_data#>>'{rules,podium}')::boolean,false),'substitutions',greatest(0,least(3,coalesce((p_data#>>'{rules,substitutions}')::int,1))),'reverse',coalesce((p_data#>>'{rules,reverse}')::boolean,false),'minigames',greatest(0,least(3,coalesce((p_data#>>'{rules,minigames}')::int,1))),'reward',case when p_data#>>'{rules,reward}'='0' then 0 else 1 end)) returning * into r;
 else
  if p_action='join' then select * into r from rooms where code=upper(trim(p_data->>'code')) for update;
  else select * into r from rooms where id=p_room for update; end if;
  if r.id is null then raise exception 'Sala no encontrada'; end if;
 end if;
 select * into p from players where room_id=r.id and client_id=p_client;
 if p_action in ('create','join') then
  if r.is_private and p_action='join' and p.id is null and r.password<>encode(digest(coalesce(p_data->>'password',''),'sha256'),'hex') then raise exception 'Contraseña incorrecta'; end if;
  if p.id is null then
   if r.status<>'lobby' then raise exception 'La partida ya comenzó; solo pueden reconectar sus participantes'; end if;
   insert into players(room_id,client_id,name,card_code,need) values(r.id,p_client,left(coalesce(nullif(p_data->>'name',''),'invitado'),20),coalesce(p_data->>'codeCard','0000'),r.size*r.size-case when r.size%2=1 then 1 else 0 end) returning * into p;
  else update players set connected=true,last_seen=v_now where id=p.id returning * into p; end if;
 elsif p.id is null then raise exception 'No perteneces a la sala';
 end if;
 if p_action='card' then
  if r.status<>'lobby' or p.card is not null then raise exception 'Cartilla ya fijada'; end if;
  v_card:=p_data->'card';v_cells:=v_card->'cells';
  if v_cells is null or jsonb_typeof(v_cells)<>'array' or length(v_cells::text)>16000 or jsonb_array_length(v_cells)<>r.size*r.size then raise exception 'Cartilla inválida'; end if;
  select count(*) into v_count from jsonb_array_elements(v_cells) c where c->>'mini'='true';
  if v_count<>(r.rules->>'minigames')::int then raise exception 'Cantidad de minijuegos inválida'; end if;
  for v_i in 0..r.size*r.size-1 loop
   if (v_cells->v_i='null'::jsonb) is distinct from (r.size%2=1 and v_i=(r.size*r.size-1)/2) then raise exception 'Centro libre inválido'; end if;
   if v_cells->v_i<>'null'::jsonb and (jsonb_typeof(v_cells->v_i)<>'object' or jsonb_typeof(v_cells->v_i->'t') is distinct from 'string' or length(v_cells->v_i->>'t')>250) then raise exception 'Casilla inválida'; end if;
  end loop;
  select count(*) into v_count from jsonb_array_elements(v_cells)c where c->>'ch'='true';
  if v_count<>(case r.size when 3 then 1 when 4 then 2 else 4 end) then raise exception 'Cantidad de retos inválida'; end if;
  v_mark:=(select jsonb_agg(c='null'::jsonb) from jsonb_array_elements(v_cells) c);
  update players set card=jsonb_build_object('cells',v_cells,'marked',v_mark,'how','{}'::jsonb),revision=revision+1 where id=p.id;
 elsif p_action='start' then
  if r.host_client_id<>p_client or r.status<>'lobby' then raise exception 'Solo el anfitrión inicia'; end if;
  if exists(select 1 from players where room_id=r.id and connected and card is null) then raise exception 'Hay cartillas pendientes'; end if;
  update players set participated=true where room_id=r.id and connected;
  update rooms set status='live' where id=r.id;
 elsif p_action='progress' then
  if r.status='live' and p.participated and p.position is null then
   if (p_data->>'revision')::bigint<>p.revision then raise exception 'Progreso desactualizado; sincroniza y vuelve a intentar'; end if;
   v_mark:=p_data->'marked';v_how:=coalesce(p_data->'how','{}');v_cells:=p.card->'cells';
   if v_mark is null or jsonb_typeof(v_mark)<>'array' or jsonb_typeof(v_how)<>'object' or length(v_how::text)>4000 or jsonb_array_length(v_mark)<>r.size*r.size then raise exception 'Progreso inválido'; end if;
   for v_i in 0..r.size*r.size-1 loop
    if jsonb_typeof(v_mark->v_i)<>'boolean' then raise exception 'Marca inválida'; end if;
    if v_cells->v_i='null'::jsonb and v_mark->>v_i<>'true' then raise exception 'Centro libre'; end if;
    if v_cells->v_i->>'mini'='true' and v_mark->v_i<>p.card->'marked'->v_i then raise exception 'El minijuego se valida en el servidor'; end if;
    if v_cells->v_i->>'ch'='true' and v_mark->>v_i='true' and coalesce(v_how->>v_i::text,'') not in ('done','paid') then raise exception 'Reto sin resolver'; end if;
   end loop;
   update players set card=jsonb_set(jsonb_set(card,'{marked}',v_mark),'{how}',v_how),last_event=p_data->>'event',revision=revision+1 where id=p.id;
  end if;
 elsif p_action='swap' then
  v_i:=(p_data->>'index')::int;
  if r.status<>'live' or not p.participated or p.position is not null or p.swaps>=(r.rules->>'substitutions')::int or v_i<0 or v_i>=r.size*r.size or p.card->'marked'->>v_i='true' or p.card->'cells'->v_i='null'::jsonb or p.card->'cells'->v_i->>'mini'='true' then raise exception 'No se puede sustituir'; end if;
  if p.card->'cells'->v_i->>'ch'='true' and not (r.rules->>'reverse')::boolean then raise exception 'Sustitución inversa desactivada'; end if;
  v_game:=case when p.card->'cells'->v_i->>'ch'='true' then jsonb_build_object('t','Encuentra tres objetos de colores diferentes sin desplazarte.','category','observation','difficulty','normal') else jsonb_build_object('t',case p.swaps%3 when 0 then 'Di cinco animales en orden alfabético en 30 segundos.' when 1 then 'Cuenta una historia de un minuto usando cinco palabras elegidas por el grupo.' else 'Inventa cuatro versos que rimen sobre tu disfraz.' end,'ch',true,'category','mental','difficulty','hard') end;
  update players set card=jsonb_set(card,array['cells',v_i::text],v_game),swaps=swaps+1,revision=revision+1 where id=p.id;
 elsif p_action='mini_start' then
  v_i:=(p_data->>'index')::int;
  if r.status<>'live' or not p.participated or p.position is not null or v_i<0 or v_i>=r.size*r.size or p.card->'cells'->v_i->>'mini' is distinct from 'true' or p.card->'marked'->>v_i='true' then raise exception 'Casilla inválida'; end if;
  if r.game is not null and (r.game->>'until')::timestamptz>v_now then raise exception 'Ya hay un minijuego en curso'; end if;
  v_a:=1+floor(random()*15)::int;v_b:=1+floor(random()*15)::int;
  if random()<0.5 then
   v_answer:=(v_a+v_b)::text;select jsonb_agg(value order by random()) into v_options from jsonb_array_elements(jsonb_build_array(v_a+v_b-1,v_a+v_b,v_a+v_b+1,v_a+v_b+2));
   v_game:=jsonb_build_object('kind','quiz','title','Preguntas relámpago','question',v_a||' + '||v_b||' = ?');
  else
   v_a:=floor(random()*6)::int;v_answer:=v_a::text;v_options:='[0,1,2,3,4,5]'::jsonb;
   v_game:=jsonb_build_object('kind','odd','title','Encuentra el diferente','question','Selecciona el símbolo distinto','symbols',(select jsonb_agg(case when i=v_a then '◆' else '●' end order by i) from generate_series(0,5)i));
  end if;
  insert into pingo_game_secrets values(r.id,v_answer) on conflict(room_id) do update set answer=excluded.answer;
  update rooms set game=v_game||jsonb_build_object('id',gen_random_uuid(),'owner',p_client,'index',v_i,'options',v_options,'until',v_now+interval '20 seconds','attempts','[]'::jsonb,'status','live','eligible',(select jsonb_agg(client_id) from players where room_id=r.id and participated and position is null and connected)) where id=r.id;
 elsif p_action='mini_answer' then
  v_game:=r.game;
  if r.status<>'live' or v_game->>'status'<>'live' or v_game->>'id'<>p_data->>'id' or (v_game->>'until')::timestamptz<=v_now or not (v_game->'eligible' ? p_client) or v_game->'attempts' ? p_client or p.position is not null then raise exception 'Respuesta fuera de turno'; end if;
  v_game:=jsonb_set(v_game,'{attempts}',(v_game->'attempts')||to_jsonb(p_client));
  select answer into v_answer from pingo_game_secrets where room_id=r.id;
  if v_answer=p_data->>'answer' then
   v_game:=v_game||jsonb_build_object('status','won','winner',p_client);
   update players set mini_wins=mini_wins+1 where id=p.id;
   if p_client=v_game->>'owner' or r.rules->>'reward'='0' then
    update players set card=jsonb_set(card,array['marked',v_game->>'index'],'true'),revision=revision+1 where room_id=r.id and client_id=v_game->>'owner';
   end if;
  end if;
  update rooms set game=v_game where id=r.id;
 elsif p_action='leave' then
  update players set connected=false,last_seen=v_now where id=p.id;
 elsif p_action='end' then
  if r.host_client_id<>p_client then raise exception 'Solo el anfitrión finaliza'; end if;
  update rooms set status='ended',valid_result=false where id=r.id and status<>'ended';
 elsif p_action not in ('create','join','snapshot','archive','card','start') then raise exception 'Acción desconocida';
 end if;
 if p_action<>'leave' then update players set connected=true,last_seen=v_now where id=p.id; end if;
 -- Expired rounds never block a room. In participation mode the owner earns the tile after submitting.
 select * into r from rooms where id=r.id;
 if r.game->>'status'='live' and (r.game->>'until')::timestamptz<=v_now then
  if r.rules->>'reward'='0' and r.game->'attempts' ? (r.game->>'owner') then
   update players set card=jsonb_set(card,array['marked',r.game->>'index'],'true'),revision=revision+1 where room_id=r.id and client_id=r.game->>'owner';
  end if;
  update rooms set game=game||'{"status":"expired"}'::jsonb where id=r.id;
 end if;
 if r.status='live' then
  -- Derive statistics from the persisted card; no caller can submit crowns or ranks.
  for v_row in select * from players where room_id=r.id and participated and card is not null loop
   v_mark:=v_row.card->'marked';v_cells:=v_row.card->'cells';v_how:=v_row.card->'how';
   select count(*) into v_count from generate_series(0,r.size*r.size-1)i where v_mark->>i='true' and v_cells->i<>'null'::jsonb;
   update players set found=v_count,retos_ok=(select count(*) from jsonb_each_text(v_how) h where h.value='done' and v_mark->>h.key::int='true' and v_cells->h.key::int->>'ch'='true'),retos_paid=(select count(*) from jsonb_each_text(v_how) h where h.value='paid' and v_mark->>h.key::int='true' and v_cells->h.key::int->>'ch'='true'),bingos=(select count(*) from (
     select x from generate_series(0,r.size-1)x where not exists(select 1 from generate_series(0,r.size-1)y where v_mark->>(x*r.size+y)<>'true')
     union all select x from generate_series(0,r.size-1)x where not exists(select 1 from generate_series(0,r.size-1)y where v_mark->>(y*r.size+x)<>'true')
     union all select 0 where not exists(select 1 from generate_series(0,r.size-1)x where v_mark->>(x*r.size+x)<>'true')
     union all select 0 where not exists(select 1 from generate_series(0,r.size-1)x where v_mark->>(x*r.size+r.size-1-x)<>'true')
    ) q) where id=v_row.id;
   if v_count=v_row.need and v_row.position is null then
    select coalesce(max(position),0)+1 into v_pos from players where room_id=r.id;
    update players set position=v_pos,revision=revision+1 where id=v_row.id;
   end if;
  end loop;
  select count(*) into v_count from players where room_id=r.id and position is not null;
  select least(3,count(*)) into v_target from players where room_id=r.id and participated;
  if not (r.rules->>'podium')::boolean then v_target:=1; end if;
  if (v_count>=v_target and v_target>0) or (v_count>0 and not exists(select 1 from players where room_id=r.id and participated and position is null and connected and last_seen>v_now-interval '90 seconds')) then
   update rooms set status='ended',valid_result=true where id=r.id;
   insert into pingo_crowns(match_id,client_id) select r.id,client_id from players where room_id=r.id and position=1 on conflict do nothing;
  end if;
 end if;
 if p_action='archive' then
  if r.host_client_id<>p_client then raise exception 'Solo el anfitrión guarda'; end if;
  if (select status from rooms where id=r.id)<>'ended' then raise exception 'La partida sigue en curso'; end if;
  if not exists(select 1 from match_archives where match_id=r.id) then
   insert into match_archives(match_id,room_code,mode,saved_by) values(r.id,r.code,'room',p_client);
   insert into match_results(match_id,room_code,mode,size,player_name,client_id,position,found,need,bingos,retos_ok,retos_paid,pct,finished,mini_wins)
    select r.id,r.code,'room',r.size,q.name,q.client_id,row_number() over(order by q.position nulls last,q.found desc,q.client_id),q.found,q.need,q.bingos,q.retos_ok,q.retos_paid,round(q.found*100.0/q.need),q.position is not null,q.mini_wins from players q where q.room_id=r.id and q.participated;
  end if;
 end if;
 update rooms set revision=revision+1 where id=r.id returning * into r;
 return jsonb_build_object('room',to_jsonb(r)-'password','players',coalesce((select jsonb_agg(to_jsonb(q) order by q.client_id) from players q where room_id=r.id),'[]'::jsonb),'crowns',(select count(*) from pingo_crowns where client_id=p_client));
end $$;
revoke all on function public.pingo_action(text,text,text,uuid,jsonb) from public;
grant execute on function public.pingo_action(text,text,text,uuid,jsonb) to anon,authenticated;
-- Solo archives remain available online, but never mint competitive server crowns.
create or replace function public.pingo_archive_solo(p_client text,p_secret text,p_match uuid,p_result jsonb) returns jsonb
language plpgsql security definer set search_path=public,extensions as $$
declare n int; f int; need_ int;
begin
 if p_client !~ '^v2-[0-9a-f-]{36}$' or length(p_secret)<>72 then raise exception 'Identidad inválida'; end if;
 insert into pingo_credentials values(p_client,encode(digest(p_secret,'sha256'),'hex')) on conflict do nothing;
 if not exists(select 1 from pingo_credentials where client_id=p_client and secret_hash=encode(digest(p_secret,'sha256'),'hex')) then raise exception 'Identidad no autorizada'; end if;
 if exists(select 1 from rooms where id=p_match) then raise exception 'No es una partida solo'; end if;
 n:=(p_result->>'size')::int;f:=(p_result->>'found')::int;need_:=n*n-case when n%2=1 then 1 else 0 end;
 if n not in (3,4,5) or f<0 or f>need_ then raise exception 'Resultado inválido'; end if;
 -- This lock also serializes retries before the archive row exists.
 perform pg_advisory_xact_lock(hashtextextended(p_match::text,0));
 if exists(select 1 from match_archives where match_id=p_match) then
  if not exists(select 1 from match_archives where match_id=p_match and saved_by=p_client and mode='solo') then raise exception 'Partida no autorizada'; end if;
  return '{"ok":true}'::jsonb;
 end if;
 insert into match_archives(match_id,mode,saved_by) values(p_match,'solo',p_client);
 insert into match_results(match_id,mode,size,player_name,client_id,position,found,need,bingos,retos_ok,retos_paid,pct,finished)
 values(p_match,'solo',n,left(coalesce(p_result->>'player_name','invitado'),20),p_client,1,f,need_,greatest(0,least(12,(p_result->>'bingos')::int)),greatest(0,least(24,(p_result->>'retos_ok')::int)),greatest(0,least(24,(p_result->>'retos_paid')::int)),round(f*100.0/need_),f=need_);
 return '{"ok":true}'::jsonb;
end $$;
revoke all on function public.pingo_archive_solo(text,text,uuid,jsonb) from public;
grant execute on function public.pingo_archive_solo(text,text,uuid,jsonb) to anon,authenticated;

-- Lobby exposes only room summaries. Private card state is available via verified RPC.
drop policy if exists players_select on public.players;
revoke select on public.rooms from anon,authenticated;
grant select(id,code,size,status,host_client_id,title,is_private,created_at,rules,revision,game,valid_result) on public.rooms to anon,authenticated;
create or replace view public.rooms_lobby with (security_invoker=false) as
select r.id,r.code,r.size,r.status,r.title,r.is_private,r.created_at,r.host_client_id,
 (select count(*)::int from public.players p where p.room_id=r.id and p.connected and p.last_seen>now()-interval '90 seconds') as player_count
from public.rooms r where r.status in ('lobby','live');
grant select on public.rooms_lobby to anon,authenticated;
commit;

