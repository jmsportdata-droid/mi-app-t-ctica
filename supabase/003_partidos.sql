-- =============================================================
-- Migración 003: partidos, plan de partido e informe del rival
-- Ejecutar en Supabase → SQL Editor después de 002_fotos_y_equipos.sql
-- =============================================================

-- 1. Partidos -------------------------------------------------------
create table if not exists public.partidos (
  id          uuid primary key default gen_random_uuid(),
  fecha       date not null,
  -- restrict: no se puede borrar un equipo que tiene partidos
  rival_id    uuid not null references public.equipos (id) on delete restrict,
  estadio     text,
  competicion text,
  es_local    boolean not null default true,
  estado      text not null default 'planificado'
              check (estado in ('planificado', 'jugado')),
  created_at  timestamptz not null default now()
);

create index if not exists partidos_fecha_idx on public.partidos (fecha);
create index if not exists partidos_rival_idx on public.partidos (rival_id);

-- 2. Plan de partido (1:1 con partidos) ----------------------------
create table if not exists public.plan_partido (
  partido_id         uuid primary key references public.partidos (id) on delete cascade,
  ataque_notas       text,
  ataque_vimeo       text,
  ataque_imagen1     text,
  ataque_imagen2     text,
  ataque_pdf         text,
  defensa_notas      text,
  defensa_vimeo      text,
  defensa_imagen1    text,
  defensa_imagen2    text,
  defensa_pdf        text,
  transicion_notas   text,
  transicion_vimeo   text,
  transicion_imagen1 text,
  transicion_imagen2 text,
  transicion_pdf     text,
  updated_at         timestamptz not null default now()
);

-- 3. Informe del rival (1:1 con partidos) --------------------------
create table if not exists public.informe_rival (
  partido_id uuid primary key references public.partidos (id) on delete cascade,
  tags       text[] not null default '{}'
             check (tags <@ array['salida_balon', 'presion', 'bloque', 'linea_defensiva']),
  slides_url text,
  vimeo_url  text,
  updated_at timestamptz not null default now()
);

-- 4. Row Level Security: solo usuarios autenticados -----------------
alter table public.partidos      enable row level security;
alter table public.plan_partido  enable row level security;
alter table public.informe_rival enable row level security;

create policy "Autenticados gestionan partidos"
  on public.partidos for all to authenticated using (true) with check (true);

create policy "Autenticados gestionan plan_partido"
  on public.plan_partido for all to authenticated using (true) with check (true);

create policy "Autenticados gestionan informe_rival"
  on public.informe_rival for all to authenticated using (true) with check (true);
