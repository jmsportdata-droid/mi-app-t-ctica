-- =============================================================
-- Post partido.
--
-- · estadisticas_partido: lo que trae la fuente de datos (Sofascore hoy,
--   Wyscout mañana): estadísticas de los dos equipos, tiros, incidencias
--   (goles, tarjetas, cambios) y el borrador de conclusiones de Claude.
-- · estadisticas_jugador_partido: minutos, nota, goles, tarjetas y el resto
--   de las estadísticas de cada uno de nuestros jugadores (alimenta
--   Rendimiento y la Memoria del ciclo).
-- · post_partido: la evaluación del cuerpo técnico (plan vs realidad y
--   conclusiones).
-- · analisis_rival.equipo: el mismo análisis de video sirve para el rival
--   y para nosotros.
-- · Nombres neutros para los datos externos: no dependen de la fuente.
-- · Jugador: formado en el club, debut y selección (Memoria del ciclo).
-- =============================================================

alter type public.tipo_pedido_sofascore add value if not exists 'post_partido';

-- ---------- Nombres neutros -----------------------------------------

alter table public.jugadores rename column estadisticas_sofascore to estadisticas_externas;
alter table public.jugadores_rivales rename column sofascore_id to id_externo;
alter table public.jugadores_rivales
  add column fuente text not null default 'sofascore' check (fuente in ('sofascore', 'wyscout'));

-- ---------- Jugador: datos para la Memoria del ciclo ------------------

alter table public.jugadores
  add column formado_en_club boolean not null default false,
  add column fecha_debut date,
  add column seleccion text check (char_length(seleccion) <= 200);

-- ---------- Análisis de video: rival o propio ------------------------

alter table public.analisis_rival
  add column equipo text not null default 'rival' check (equipo in ('rival', 'propio'));

drop index public.analisis_rival_partido_idx;
create index analisis_rival_partido_idx on public.analisis_rival (partido_id, equipo, fase, orden);

-- ---------- Estadísticas del partido ---------------------------------

create table public.estadisticas_partido (
  partido_id       uuid primary key references public.partidos (id) on delete cascade,
  fuente           text not null check (fuente in ('sofascore', 'wyscout', 'manual')),
  id_evento        text check (char_length(id_evento) <= 40),
  generado_en      timestamptz not null default now(),
  formacion_propia text check (char_length(formacion_propia) <= 20),
  formacion_rival  text check (char_length(formacion_rival) <= 20),
  -- Estadísticas de equipo con nombres propios de la app (posesion, xg, tiros…)
  propio           jsonb not null default '{}' check (jsonb_typeof(propio) = 'object'),
  rival            jsonb not null default '{}' check (jsonb_typeof(rival) = 'object'),
  -- [{ minuto, propio, xg, situacion, cuerpo, resultado, jugador }]
  tiros            jsonb not null default '[]' check (jsonb_typeof(tiros) = 'array'),
  -- [{ tipo: gol | tarjeta | cambio, minuto, propio, jugador, … }]
  incidencias      jsonb not null default '[]' check (jsonb_typeof(incidencias) = 'array'),
  -- Borrador de Claude: resumen, positivos, a mejorar, plan vs realidad…
  insights         jsonb not null default '{}' check (jsonb_typeof(insights) = 'object'),
  avisos           text[] not null default '{}'
);

alter table public.estadisticas_partido enable row level security;

create policy "Miembros ven y editan las estadísticas de sus partidos"
  on public.estadisticas_partido for all to authenticated
  using (public.es_miembro_partido(partido_id))
  with check (public.es_miembro_partido(partido_id));

-- ---------- Estadísticas por jugador ---------------------------------

create table public.estadisticas_jugador_partido (
  partido_id  uuid not null references public.partidos (id) on delete cascade,
  jugador_id  uuid not null references public.jugadores (id) on delete cascade,
  fuente      text not null check (fuente in ('sofascore', 'wyscout', 'manual')),
  titular     boolean not null default false,
  minutos     smallint not null default 0 check (minutos between 0 and 150),
  nota        numeric(3, 1) check (nota between 0 and 10),
  goles       smallint not null default 0 check (goles between 0 and 20),
  asistencias smallint not null default 0 check (asistencias between 0 and 20),
  amarillas   smallint not null default 0 check (amarillas between 0 and 2),
  rojas       smallint not null default 0 check (rojas between 0 and 1),
  -- El resto: pases, duelos, recuperaciones, xG, km, sprints…
  stats       jsonb not null default '{}' check (jsonb_typeof(stats) = 'object'),
  primary key (partido_id, jugador_id)
);

create index estadisticas_jugador_partido_jugador_idx
  on public.estadisticas_jugador_partido (jugador_id);

alter table public.estadisticas_jugador_partido enable row level security;

-- El jugador tiene que ser de la misma temporada que el partido
create policy "Miembros ven y editan las estadísticas de sus jugadores"
  on public.estadisticas_jugador_partido for all to authenticated
  using (public.es_miembro_partido(partido_id))
  with check (
    public.es_miembro_partido(partido_id)
    and exists (
      select 1 from public.jugadores j
      join public.partidos p on p.temporada_id = j.temporada_id
      where j.id = jugador_id and p.id = partido_id
    )
  );

-- ---------- Evaluación del cuerpo técnico ----------------------------

create table public.post_partido (
  partido_id     uuid primary key references public.partidos (id) on delete cascade,
  -- { "objetivo" | "clave_1" | "ofensiva" | …: { cumplimiento: si | parcial | no, nota } }
  plan_vs_real   jsonb not null default '{}' check (jsonb_typeof(plan_vs_real) = 'object'),
  valoracion     text check (char_length(valoracion) <= 3000),
  positivos      text check (char_length(positivos) <= 3000),
  a_mejorar      text check (char_length(a_mejorar) <= 3000),
  para_la_semana text check (char_length(para_la_semana) <= 3000),
  actualizado_en timestamptz not null default now()
);

create trigger post_partido_actualizado_en
  before update on public.post_partido
  for each row execute function public.tocar_actualizado_en();

alter table public.post_partido enable row level security;

create policy "Miembros ven y editan el post partido"
  on public.post_partido for all to authenticated
  using (public.es_miembro_partido(partido_id))
  with check (public.es_miembro_partido(partido_id));
