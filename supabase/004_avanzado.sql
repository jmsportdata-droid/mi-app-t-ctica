-- =============================================================
-- Migración 004: atributos de jugador, alineación, ABP y eventos
-- Ejecutar en Supabase → SQL Editor después de 003_partidos.sql
-- =============================================================

-- 1. Atributos de jugador (1:1 con jugadores, valores 0-100) --------
create table if not exists public.jugador_atributos (
  jugador_id      uuid primary key references public.jugadores (id) on delete cascade,
  -- Con balón
  pase_corto      smallint not null default 50 check (pase_corto between 0 and 100),
  regate          smallint not null default 50 check (regate between 0 and 100),
  control         smallint not null default 50 check (control between 0 and 100),
  vision          smallint not null default 50 check (vision between 0 and 100),
  disparo         smallint not null default 50 check (disparo between 0 and 100),
  -- Sin balón
  presion         smallint not null default 50 check (presion between 0 and 100),
  anticipacion    smallint not null default 50 check (anticipacion between 0 and 100),
  marcaje         smallint not null default 50 check (marcaje between 0 and 100),
  posicionamiento smallint not null default 50 check (posicionamiento between 0 and 100),
  recuperacion    smallint not null default 50 check (recuperacion between 0 and 100),
  -- Condición física
  velocidad       smallint not null default 50 check (velocidad between 0 and 100),
  resistencia     smallint not null default 50 check (resistencia between 0 and 100),
  fuerza          smallint not null default 50 check (fuerza between 0 and 100),
  salto           smallint not null default 50 check (salto between 0 and 100),
  agilidad        smallint not null default 50 check (agilidad between 0 and 100),
  updated_at      timestamptz not null default now()
);

-- 2. Alineación (1:1 con partidos) ---------------------------------
-- titulares: 11 posiciones en el orden de la formación (null = hueco vacío)
create table if not exists public.alineacion_partido (
  partido_id uuid primary key references public.partidos (id) on delete cascade,
  formacion  text not null default '4-3-3'
             check (formacion in ('4-3-3', '4-4-2', '4-2-3-1', '5-3-2')),
  titulares  uuid[] not null default '{}' check (cardinality(titulares) <= 11),
  suplentes  uuid[] not null default '{}' check (cardinality(suplentes) <= 30),
  updated_at timestamptz not null default now()
);

-- 3. Acciones a balón parado (ABP) ---------------------------------
-- Una fila por tarjeta: 4 córners y 2 faltas laterales, ofensivas y defensivas
create table if not exists public.abp_partido (
  partido_id  uuid not null references public.partidos (id) on delete cascade,
  tipo        text not null check (tipo in ('ofensivo', 'defensivo')),
  categoria   text not null check (categoria in ('corner', 'falta_lateral')),
  indice      smallint not null check (indice between 1 and 4),
  descripcion text,
  vimeo_url   text,
  updated_at  timestamptz not null default now(),
  primary key (partido_id, tipo, categoria, indice),
  check (categoria = 'corner' or indice <= 2)
);

-- 4. Vídeo del partido + eventos -----------------------------------
alter table public.partidos
  add column if not exists video_url text;

create table if not exists public.eventos_partido (
  id          uuid primary key default gen_random_uuid(),
  partido_id  uuid not null references public.partidos (id) on delete cascade,
  tipo        text not null check (tipo in ('gol', 'ocasion', 'duelo', 'nota')),
  minuto      smallint not null check (minuto between 0 and 130),
  descripcion text,
  jugador_id  uuid references public.jugadores (id) on delete set null,
  -- Posición en el campo en % (0-100), opcional
  x           numeric(5, 2) check (x between 0 and 100),
  y           numeric(5, 2) check (y between 0 and 100),
  created_at  timestamptz not null default now()
);

create index if not exists eventos_partido_partido_idx
  on public.eventos_partido (partido_id, minuto);
create index if not exists eventos_partido_jugador_idx
  on public.eventos_partido (jugador_id) where jugador_id is not null;

-- 5. Row Level Security: solo usuarios autenticados -----------------
alter table public.jugador_atributos  enable row level security;
alter table public.alineacion_partido enable row level security;
alter table public.abp_partido        enable row level security;
alter table public.eventos_partido    enable row level security;

create policy "Autenticados gestionan jugador_atributos"
  on public.jugador_atributos for all to authenticated using (true) with check (true);

create policy "Autenticados gestionan alineacion_partido"
  on public.alineacion_partido for all to authenticated using (true) with check (true);

create policy "Autenticados gestionan abp_partido"
  on public.abp_partido for all to authenticated using (true) with check (true);

create policy "Autenticados gestionan eventos_partido"
  on public.eventos_partido for all to authenticated using (true) with check (true);
