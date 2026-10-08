-- =============================================================
-- Migración inicial: esquema de Táctica FC tal como estaba en
-- producción antes de pasar a migraciones versionadas.
-- Reúne schema.sql, 002_fotos_y_equipos.sql, 003_partidos.sql y
-- 004_avanzado.sql, en ese orden y sin cambios.
-- =============================================================

-- Tabla de jugadores de la plantilla
create table if not exists public.jugadores (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null check (char_length(trim(nombre)) >= 2),
  fecha_nac  date not null,
  posicion   text not null check (posicion in ('POR', 'DEF', 'CEN', 'DEL')),
  numero     integer check (numero between 1 and 99),
  created_at timestamptz not null default now(),
  constraint jugadores_numero_unico unique (numero)
);

-- Row Level Security: solo usuarios autenticados pueden leer y escribir
alter table public.jugadores enable row level security;

create policy "Autenticados pueden leer jugadores"
  on public.jugadores for select
  to authenticated
  using (true);

create policy "Autenticados pueden insertar jugadores"
  on public.jugadores for insert
  to authenticated
  with check (true);

create policy "Autenticados pueden actualizar jugadores"
  on public.jugadores for update
  to authenticated
  using (true)
  with check (true);

create policy "Autenticados pueden borrar jugadores"
  on public.jugadores for delete
  to authenticated
  using (true);


-- =============================================================
-- Migración 002: fotos de jugadores + equipos rivales
-- =============================================================

-- 1. Foto de jugador ------------------------------------------------
alter table public.jugadores
  add column if not exists foto_url text;

-- 2. Tabla de equipos rivales --------------------------------------
create table if not exists public.equipos (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null check (char_length(trim(nombre)) >= 2),
  escudo_url text,
  liga       text,
  estadio    text,
  created_at timestamptz not null default now()
);

-- Nombre único sin distinguir mayúsculas
create unique index if not exists equipos_nombre_unico
  on public.equipos (lower(nombre));

alter table public.equipos enable row level security;

create policy "Autenticados pueden leer equipos"
  on public.equipos for select to authenticated using (true);

create policy "Autenticados pueden insertar equipos"
  on public.equipos for insert to authenticated with check (true);

create policy "Autenticados pueden actualizar equipos"
  on public.equipos for update to authenticated using (true) with check (true);

create policy "Autenticados pueden borrar equipos"
  on public.equipos for delete to authenticated using (true);

-- 3. Buckets de Storage (públicos, PNG/JPG, máx. 2 MB) -------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('player-photos', 'player-photos', true, 2097152, array['image/png', 'image/jpeg']),
  ('team-logos',    'team-logos',    true, 2097152, array['image/png', 'image/jpeg'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 4. Permisos de Storage --------------------------------------------
-- La lectura pública la da el bucket público (URL /object/public/...).
-- Subir, listar y borrar solo para usuarios autenticados.
create policy "Autenticados leen imagenes de la app"
  on storage.objects for select to authenticated
  using (bucket_id in ('player-photos', 'team-logos'));

create policy "Autenticados suben imagenes de la app"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('player-photos', 'team-logos'));

create policy "Autenticados actualizan imagenes de la app"
  on storage.objects for update to authenticated
  using (bucket_id in ('player-photos', 'team-logos'));

create policy "Autenticados borran imagenes de la app"
  on storage.objects for delete to authenticated
  using (bucket_id in ('player-photos', 'team-logos'));


-- =============================================================
-- Migración 003: partidos, plan de partido e informe del rival
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


-- =============================================================
-- Migración 004: atributos de jugador, alineación, ABP y eventos
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


