-- PINGO — esquema multiplayer (pegar en Supabase → SQL Editor → Run)
-- Luego: Database → Replication → habilitar realtime en rooms y players

create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  size int not null check (size between 3 and 5),
  status text not null default 'lobby' check (status in ('lobby','live','ended')),
  host_client_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  client_id text not null,
  name text not null,
  card_code text not null,
  found int not null default 0,
  need int not null,
  bingos int not null default 0,
  retos_ok int not null default 0,
  retos_paid int not null default 0,
  last_event text,
  updated_at timestamptz not null default now(),
  unique (room_id, client_id)
);

create index if not exists players_room_id_idx on public.players(room_id);
create index if not exists players_room_found_idx on public.players(room_id, found desc);

-- Limpieza opcional de salas viejas (más de 24h). No ejecutable por anon.
create or replace function public.pingo_cleanup_old_rooms()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rooms where created_at < now() - interval '24 hours';
$$;
revoke all on function public.pingo_cleanup_old_rooms() from public;
revoke all on function public.pingo_cleanup_old_rooms() from anon;
revoke all on function public.pingo_cleanup_old_rooms() from authenticated;

alter table public.rooms enable row level security;
alter table public.players enable row level security;

-- Party game: políticas abiertas con anon key (sala privada por código)
drop policy if exists rooms_select on public.rooms;
drop policy if exists rooms_insert on public.rooms;
drop policy if exists rooms_update on public.rooms;
drop policy if exists players_select on public.players;
drop policy if exists players_insert on public.players;
drop policy if exists players_update on public.players;
drop policy if exists players_delete on public.players;

create policy rooms_select on public.rooms for select to anon, authenticated using (true);
create policy rooms_insert on public.rooms for insert to anon, authenticated with check (true);
create policy rooms_update on public.rooms for update to anon, authenticated using (true) with check (true);

create policy players_select on public.players for select to anon, authenticated using (true);
create policy players_insert on public.players for insert to anon, authenticated with check (true);
create policy players_update on public.players for update to anon, authenticated using (true) with check (true);
create policy players_delete on public.players for delete to anon, authenticated using (true);

-- Realtime (si falla porque ya están publicadas, ignora el error)
do $$
begin
  alter publication supabase_realtime add table public.rooms;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.players;
exception when duplicate_object then null;
end $$;

-- ===== Leaderboard histórico =====
create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  room_code text,
  mode text not null check (mode in ('solo','room')),
  size int not null check (size between 3 and 5),
  player_name text not null,
  client_id text,
  position int not null check (position >= 1),
  found int not null default 0,
  need int not null,
  bingos int not null default 0,
  retos_ok int not null default 0,
  retos_paid int not null default 0,
  pct int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists match_results_created_idx on public.match_results(created_at desc);
create index if not exists match_results_match_id_idx on public.match_results(match_id);
create index if not exists match_results_pct_idx on public.match_results(pct desc, found desc);

alter table public.match_results enable row level security;

drop policy if exists match_results_select on public.match_results;
drop policy if exists match_results_insert on public.match_results;

create policy match_results_select on public.match_results
  for select to anon, authenticated using (true);
create policy match_results_insert on public.match_results
  for insert to anon, authenticated with check (true);

-- Candado anti-duplicados: 1 guardado por partida
create table if not exists public.match_archives (
  match_id uuid primary key,
  room_code text,
  mode text not null check (mode in ('solo','room')),
  saved_by text not null,
  created_at timestamptz not null default now()
);
alter table public.match_archives enable row level security;
drop policy if exists match_archives_select on public.match_archives;
drop policy if exists match_archives_insert on public.match_archives;
create policy match_archives_select on public.match_archives
  for select to anon, authenticated using (true);
create policy match_archives_insert on public.match_archives
  for insert to anon, authenticated with check (true);
create index if not exists match_archives_room_code_idx on public.match_archives(room_code);
