-- =============================================================
-- Rendimiento avanzado.
--
-- · referencias_liga: estadísticas de temporada de todos los equipos y
--   jugadores de la competencia (Sofascore hoy), para los percentiles
--   contra la liga. Las trae la Mac con el pedido "liga".
-- · indicadores_modelo: cómo se mide cada momento (y principio) del
--   modelo de juego: un KPI del post partido con su objetivo. Con eso se
--   calcula el índice de cumplimiento del modelo en cada partido.
-- · Pedido "importar_temporada": trae los partidos ya jugados de la
--   temporada con su post partido (solo cuando el cuerpo técnico lo pide).
-- =============================================================

alter type public.tipo_pedido_sofascore add value if not exists 'liga';
alter type public.tipo_pedido_sofascore add value if not exists 'importar_temporada';

create table public.referencias_liga (
  temporada_id    uuid not null references public.temporadas (id) on delete cascade,
  -- Id de la competencia en la fuente (torneo y temporada de Sofascore)
  id_torneo       text not null check (char_length(id_torneo) <= 40),
  id_temporada    text not null check (char_length(id_temporada) <= 40),
  competicion     text not null check (char_length(competicion) <= 120),
  fuente          text not null default 'sofascore' check (fuente in ('sofascore', 'wyscout')),
  generado_en     timestamptz not null default now(),
  -- [{ id, nombre, partidos, propio: true|false, stats: {...} }]
  equipos         jsonb not null default '[]' check (jsonb_typeof(equipos) = 'array'),
  -- [{ id, nombre, equipo, posicion: G|D|M|F, minutos, stats: {...} }]
  jugadores       jsonb not null default '[]' check (jsonb_typeof(jugadores) = 'array'),
  primary key (temporada_id, id_torneo)
);

alter table public.referencias_liga enable row level security;

create policy "Miembros ven las referencias de la liga"
  on public.referencias_liga for all to authenticated
  using (public.es_miembro_temporada(temporada_id))
  with check (public.es_miembro_temporada(temporada_id));

create table public.indicadores_modelo (
  id                uuid primary key default gen_random_uuid(),
  cuerpo_tecnico_id uuid not null default public.mi_cuerpo_tecnico()
                    references public.cuerpos_tecnicos (id) on delete cascade,
  momento           public.momento_juego not null,
  principio_id      uuid references public.principios_juego (id) on delete set null,
  -- Clave de un KPI del post partido (src/lib/post-partido.ts)
  kpi               text not null check (char_length(kpi) between 1 and 40),
  objetivo          numeric(8, 2) not null,
  orden             integer not null default 0,
  creado_en         timestamptz not null default now()
);

create index indicadores_modelo_cuerpo_idx on public.indicadores_modelo (cuerpo_tecnico_id, momento, orden);

alter table public.indicadores_modelo enable row level security;

-- El principio, si hay, tiene que ser del mismo cuerpo técnico
create policy "Miembros definen los indicadores de su modelo"
  on public.indicadores_modelo for all to authenticated
  using (public.es_miembro(cuerpo_tecnico_id))
  with check (
    public.es_miembro(cuerpo_tecnico_id)
    and (
      principio_id is null
      or exists (
        select 1 from public.principios_juego p
        where p.id = principio_id and p.cuerpo_tecnico_id = indicadores_modelo.cuerpo_tecnico_id
      )
    )
  );
