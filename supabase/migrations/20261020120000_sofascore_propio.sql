-- =============================================================
-- Sofascore para nuestro equipo.
--
-- · pedidos_sofascore admite pedidos de la temporada (sin partido):
--   tipo "plantel_propio".
-- · jugadores.estadisticas_sofascore: totales de los últimos partidos
--   (minutos, aéreos, duelos, ABP, xG, nota…).
-- · analisis_propio: el análisis de nuestro equipo (mismo formato que el
--   del rival) y la autoevaluación de Claude; también los jugadores de
--   Sofascore que no se pudieron vincular con el plantel.
-- =============================================================

alter type public.tipo_pedido_sofascore add value if not exists 'plantel_propio';

alter table public.pedidos_sofascore
  alter column partido_id drop not null,
  add column temporada_id uuid references public.temporadas (id) on delete cascade,
  add constraint pedidos_sofascore_destino check (partido_id is not null or temporada_id is not null);

create index pedidos_sofascore_temporada_idx on public.pedidos_sofascore (temporada_id, creado_en desc);

create unique index pedidos_sofascore_abierto_temporada_unico
  on public.pedidos_sofascore (temporada_id, tipo)
  where estado in ('pendiente', 'procesando') and temporada_id is not null;

drop policy "Miembros piden datos de sus partidos" on public.pedidos_sofascore;
create policy "Miembros piden datos de sus partidos y temporadas"
  on public.pedidos_sofascore for all to authenticated
  using (
    (partido_id is not null and public.es_miembro_partido(partido_id))
    or (temporada_id is not null and public.es_miembro_temporada(temporada_id))
  )
  with check (
    (partido_id is not null and public.es_miembro_partido(partido_id))
    or (temporada_id is not null and public.es_miembro_temporada(temporada_id))
  );

alter table public.jugadores
  add column estadisticas_sofascore jsonb not null default '{}'
    check (jsonb_typeof(estadisticas_sofascore) = 'object');

create table public.analisis_propio (
  temporada_id   uuid primary key references public.temporadas (id) on delete cascade,
  generado_en    timestamptz not null default now(),
  datos          jsonb not null default '{}' check (jsonb_typeof(datos) = 'object'),
  insights       jsonb not null default '{}' check (jsonb_typeof(insights) = 'object'),
  -- Jugadores de Sofascore que no están en el plantel de la app
  no_vinculados  jsonb not null default '[]' check (jsonb_typeof(no_vinculados) = 'array'),
  avisos         text[] not null default '{}'
);

alter table public.analisis_propio enable row level security;

create policy "Miembros ven y editan el análisis propio"
  on public.analisis_propio for all to authenticated
  using (public.es_miembro_temporada(temporada_id))
  with check (public.es_miembro_temporada(temporada_id));
