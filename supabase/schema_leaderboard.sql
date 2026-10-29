-- PINGO — leaderboard histórico (ejecutar en SQL Editor si ya corriste schema.sql)
-- Guarda podios cuando eligen "GUARDAR" al finalizar una partida.

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

-- Candado: una sola persona puede archivar cada partida (evita duplicados en sala)
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
