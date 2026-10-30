-- Salas públicas / privadas + título + contraseña
alter table public.rooms
  add column if not exists title text not null default 'Sala',
  add column if not exists is_private boolean not null default false,
  add column if not exists password text;

create or replace view public.rooms_lobby
with (security_invoker = true) as
select
  r.id,
  r.code,
  r.size,
  r.status,
  r.title,
  r.is_private,
  r.created_at,
  r.host_client_id,
  (select count(*)::int from public.players p where p.room_id = r.id) as player_count
from public.rooms r
where r.status in ('lobby', 'live');

grant select on public.rooms_lobby to anon, authenticated;
