-- =============================================================
-- Plan de partido con el formato del cuerpo técnico, y concentración.
--
-- · planes_partido reemplaza a plan_partido (que no tiene datos y se borra
--   en una migración posterior, cuando la app ya no la use): las 3
--   claves, contexto, choque de estructuras, plan por momento del juego
--   (versión cuerpo técnico + versión corta para el plantel, principios y
--   jugadores), pelota quieta, jugadores clave del rival, gestión y los
--   principios a reforzar en el microciclo.
-- · concentraciones y habitaciones: lugar, entrada y salida, y quién
--   duerme con quién.
-- =============================================================

create table public.planes_partido (
  partido_id            uuid primary key references public.partidos (id) on delete cascade,
  claves                text[] not null default '{}' check (cardinality(claves) <= 3),
  objetivo              text check (char_length(objetivo) <= 300),
  contexto              text check (char_length(contexto) <= 3000),
  choque                text check (char_length(choque) <= 3000),
  -- Por momento del juego: ct = versión extendida, plantel = versión corta
  ofensiva_ct           text check (char_length(ofensiva_ct) <= 3000),
  ofensiva_plantel      text check (char_length(ofensiva_plantel) <= 300),
  ofensiva_principios   uuid[] not null default '{}',
  ofensiva_jugadores    uuid[] not null default '{}',
  defensiva_ct          text check (char_length(defensiva_ct) <= 3000),
  defensiva_plantel     text check (char_length(defensiva_plantel) <= 300),
  defensiva_principios  uuid[] not null default '{}',
  defensiva_jugadores   uuid[] not null default '{}',
  -- Transición defensa-ataque
  tda_ct                text check (char_length(tda_ct) <= 3000),
  tda_plantel           text check (char_length(tda_plantel) <= 300),
  tda_principios        uuid[] not null default '{}',
  tda_jugadores         uuid[] not null default '{}',
  -- Transición ataque-defensa
  tad_ct                text check (char_length(tad_ct) <= 3000),
  tad_plantel           text check (char_length(tad_plantel) <= 300),
  tad_principios        uuid[] not null default '{}',
  tad_jugadores         uuid[] not null default '{}',
  abp_ct                text check (char_length(abp_ct) <= 3000),
  abp_plantel           text check (char_length(abp_plantel) <= 300),
  -- [{ "nombre": "Pérez", "dorsal": 9, "como": "…", "responsable": uuid | null }]
  jugadores_clave       jsonb not null default '[]'
                        check (jsonb_typeof(jugadores_clave) = 'array' and jsonb_array_length(jugadores_clave) <= 6),
  gestion               text check (char_length(gestion) <= 2000),
  microciclo_principios uuid[] not null default '{}',
  actualizado_en        timestamptz not null default now()
);

create trigger planes_partido_actualizado_en
  before update on public.planes_partido
  for each row execute function public.tocar_actualizado_en();

create table public.concentraciones (
  partido_id    uuid primary key references public.partidos (id) on delete cascade,
  lugar         text check (char_length(lugar) <= 150),
  entrada_fecha date,
  entrada_hora  time,
  salida_fecha  date,
  salida_hora   time,
  notas         text check (char_length(notas) <= 1000),
  -- La actividad de concentración que se creó en el calendario
  actividad_id  uuid references public.actividades (id) on delete set null,
  actualizado_en timestamptz not null default now()
);

create trigger concentraciones_actualizado_en
  before update on public.concentraciones
  for each row execute function public.tocar_actualizado_en();

create table public.habitaciones (
  id         uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.concentraciones (partido_id) on delete cascade,
  nombre     text not null check (char_length(trim(nombre)) between 1 and 40),
  capacidad  smallint not null default 2 check (capacidad between 1 and 4),
  jugadores  uuid[] not null default '{}',
  orden      integer not null default 0,
  creado_en  timestamptz not null default now(),
  constraint habitaciones_capacidad check (cardinality(jugadores) <= capacidad)
);

create index habitaciones_partido_idx on public.habitaciones (partido_id, orden);

alter table public.planes_partido enable row level security;
alter table public.concentraciones enable row level security;
alter table public.habitaciones enable row level security;

create policy "Miembros gestionan el plan del partido"
  on public.planes_partido for all to authenticated
  using (public.es_miembro_partido(partido_id))
  with check (public.es_miembro_partido(partido_id));

create policy "Miembros gestionan la concentración"
  on public.concentraciones for all to authenticated
  using (public.es_miembro_partido(partido_id))
  with check (public.es_miembro_partido(partido_id));

create policy "Miembros gestionan las habitaciones"
  on public.habitaciones for all to authenticated
  using (public.es_miembro_partido(partido_id))
  with check (public.es_miembro_partido(partido_id));
