-- =============================================================
-- Plantel y disponibilidad.
--
-- · Jugadores: posiciones específicas, pie hábil, altura y nacionalidad.
--   La fecha de nacimiento pasa a ser opcional (los importados desde
--   API-Football a veces no la traen).
-- · ids_externos indexado por proveedor para importar sin duplicar.
-- · Disponibilidad diaria: un registro por jugador y fecha, sin diagnóstico
--   (Ley 18.331). El estado se arrastra: vale el último registro con
--   fecha <= el día consultado.
-- =============================================================

-- 1. Jugadores ---------------------------------------------------------
create type public.pie_habil as enum ('derecho', 'izquierdo', 'ambos');

alter table public.jugadores
  alter column fecha_nac drop not null,
  -- Códigos de posición específica (ver src/types/jugador.ts): POR, LD, ZAG, LI…
  add column posiciones   text[] not null default '{}' check (cardinality(posiciones) <= 4),
  add column pie_habil    public.pie_habil,
  add column altura_cm    smallint check (altura_cm between 140 and 220),
  add column nacionalidad text check (char_length(nacionalidad) <= 60);

-- Un mismo jugador de API-Football no se repite en la temporada.
create unique index jugadores_api_football_unico
  on public.jugadores (temporada_id, (ids_externos ->> 'api_football'))
  where ids_externos ? 'api_football';

-- Un mismo equipo de API-Football no se repite en el cuerpo técnico.
create unique index equipos_api_football_unico
  on public.equipos (cuerpo_tecnico_id, (ids_externos ->> 'api_football'))
  where ids_externos ? 'api_football';

-- El club de la temporada en fuentes externas (para "Actualizar plantel").
alter table public.temporadas
  add column ids_externos jsonb not null default '{}'::jsonb;

-- 2. Disponibilidad ------------------------------------------------------
create type public.estado_disponibilidad as enum ('disponible', 'limitado', 'baja', 'sancionado');

create table public.disponibilidad (
  id             uuid primary key default gen_random_uuid(),
  jugador_id     uuid not null references public.jugadores (id) on delete cascade,
  fecha          date not null,
  estado         public.estado_disponibilidad not null,
  -- Fecha estimada de vuelta (solo para limitado, baja o sancionado)
  fecha_regreso  date,
  cargado_por    uuid default auth.uid() references auth.users (id) on delete set null,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint disponibilidad_un_estado_por_dia unique (jugador_id, fecha),
  constraint disponibilidad_regreso_posterior check (fecha_regreso is null or fecha_regreso >= fecha),
  constraint disponibilidad_regreso_sin_disponible check (estado <> 'disponible' or fecha_regreso is null)
);

create index disponibilidad_jugador_fecha_idx on public.disponibilidad (jugador_id, fecha desc);

create trigger disponibilidad_actualizado_en
  before update on public.disponibilidad
  for each row execute function public.tocar_actualizado_en();

create function public.es_miembro_jugador(p_jugador uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.jugadores j
    where j.id = p_jugador and public.es_miembro_temporada(j.temporada_id)
  )
$$;

alter table public.disponibilidad enable row level security;

create policy "Miembros gestionan la disponibilidad de sus jugadores"
  on public.disponibilidad for all to authenticated
  using (public.es_miembro_jugador(jugador_id))
  with check (public.es_miembro_jugador(jugador_id));

-- Estado de cada jugador de la temporada en un día: el último registro con
-- fecha <= p_fecha. Los jugadores sin registros no aparecen (= disponibles).
-- security invoker: respeta las políticas de quien consulta.
create function public.disponibilidad_del_dia(p_temporada uuid, p_fecha date)
returns table (
  jugador_id    uuid,
  estado        public.estado_disponibilidad,
  fecha_regreso date,
  desde         date
)
language sql stable
set search_path = ''
as $$
  select distinct on (d.jugador_id)
    d.jugador_id, d.estado, d.fecha_regreso, d.fecha
  from public.disponibilidad d
  join public.jugadores j on j.id = d.jugador_id
  where j.temporada_id = p_temporada and d.fecha <= p_fecha
  order by d.jugador_id, d.fecha desc
$$;
