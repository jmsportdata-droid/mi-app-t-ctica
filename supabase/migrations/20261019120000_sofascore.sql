-- =============================================================
-- Conexión con Sofascore a través de la Mac del analista.
--
-- La web no puede pedirle datos a Sofascore (bloquea los servidores), así
-- que la app deja un pedido y un programa que corre en la Mac del analista
-- (worker/sofascore.py) lo procesa con la skill de informe rival y sube el
-- resultado.
--
-- · pedidos_sofascore: lo que se pidió desde la app y en qué estado está.
-- · estado_mac: la última señal del programa de la Mac (¿está conectada?).
-- · jugadores_rivales: el plantel de cada rival, con altura, pie y
--   estadísticas de sus últimos partidos (capa permanente: es del equipo).
-- · informes_rival_datos: el informe estadístico del partido, los insights
--   de Claude y lo que validó el cuerpo técnico.
-- · Bucket "informes": los PDF de los informes.
-- =============================================================

create type public.tipo_pedido_sofascore as enum ('informe_rival');
create type public.estado_pedido as enum ('pendiente', 'procesando', 'listo', 'error');

create table public.pedidos_sofascore (
  id          uuid primary key default gen_random_uuid(),
  partido_id  uuid not null references public.partidos (id) on delete cascade,
  tipo        public.tipo_pedido_sofascore not null default 'informe_rival',
  estado      public.estado_pedido not null default 'pendiente',
  mensaje     text check (char_length(mensaje) <= 2000),
  creado_por  uuid default auth.uid() references auth.users (id) on delete set null,
  creado_en   timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index pedidos_sofascore_estado_idx on public.pedidos_sofascore (estado, creado_en);
create index pedidos_sofascore_partido_idx on public.pedidos_sofascore (partido_id, creado_en desc);

create trigger pedidos_sofascore_actualizado_en
  before update on public.pedidos_sofascore
  for each row execute function public.tocar_actualizado_en();

-- Un solo pedido abierto por partido
create unique index pedidos_sofascore_abierto_unico
  on public.pedidos_sofascore (partido_id, tipo)
  where estado in ('pendiente', 'procesando');

create table public.estado_mac (
  cuerpo_tecnico_id uuid primary key references public.cuerpos_tecnicos (id) on delete cascade,
  ultima_senal      timestamptz not null default now(),
  version           text check (char_length(version) <= 40)
);

create table public.jugadores_rivales (
  id             uuid primary key default gen_random_uuid(),
  equipo_id      uuid not null references public.equipos (id) on delete cascade,
  sofascore_id   text not null check (char_length(sofascore_id) <= 20),
  nombre         text not null check (char_length(nombre) between 1 and 100),
  corto          text check (char_length(corto) <= 60),
  dorsal         smallint check (dorsal between 0 and 99),
  -- Puesto de Sofascore: G, D, M o F
  posicion       text check (posicion in ('G', 'D', 'M', 'F')),
  altura_cm      smallint check (altura_cm between 140 and 220),
  pie            text check (char_length(pie) <= 20),
  fecha_nac      date,
  nacionalidad   text check (char_length(nacionalidad) <= 60),
  -- Totales de sus últimos partidos (minutos, aéreos, remates de ABP, xG…)
  estadisticas   jsonb not null default '{}' check (jsonb_typeof(estadisticas) = 'object'),
  actualizado_en timestamptz not null default now(),
  unique (equipo_id, sofascore_id)
);

create trigger jugadores_rivales_actualizado_en
  before update on public.jugadores_rivales
  for each row execute function public.tocar_actualizado_en();

create table public.informes_rival_datos (
  partido_id    uuid primary key references public.partidos (id) on delete cascade,
  generado_en   timestamptz not null default now(),
  -- Resumen del análisis (sin mapas de calor): contexto, estadísticas, ABP…
  datos         jsonb not null default '{}' check (jsonb_typeof(datos) = 'object'),
  -- Hipótesis y claves que redacta Claude (formato textos.json de la skill)
  insights      jsonb not null default '{}' check (jsonb_typeof(insights) = 'object'),
  -- { "<id del insight>": "confirmado" | "descartado" } y ediciones
  validaciones  jsonb not null default '{}' check (jsonb_typeof(validaciones) = 'object'),
  -- Ruta en el bucket "informes": <cuerpo_tecnico_id>/<uuid>.pdf
  pdf_ruta      text check (pdf_ruta ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.pdf$'),
  avisos        text[] not null default '{}'
);

alter table public.pedidos_sofascore enable row level security;
alter table public.estado_mac enable row level security;
alter table public.jugadores_rivales enable row level security;
alter table public.informes_rival_datos enable row level security;

create policy "Miembros piden datos de sus partidos"
  on public.pedidos_sofascore for all to authenticated
  using (public.es_miembro_partido(partido_id))
  with check (public.es_miembro_partido(partido_id));

create policy "Miembros ven el estado de su Mac"
  on public.estado_mac for select to authenticated
  using (public.es_miembro(cuerpo_tecnico_id));

create policy "Miembros gestionan el plantel de sus rivales"
  on public.jugadores_rivales for all to authenticated
  using (exists (select 1 from public.equipos e where e.id = equipo_id and public.es_miembro(e.cuerpo_tecnico_id)))
  with check (exists (select 1 from public.equipos e where e.id = equipo_id and public.es_miembro(e.cuerpo_tecnico_id)));

create policy "Miembros gestionan los informes de sus partidos"
  on public.informes_rival_datos for all to authenticated
  using (public.es_miembro_partido(partido_id))
  with check (public.es_miembro_partido(partido_id));

-- -------------------------------------------------------------
-- Storage: PDF de los informes (privado, una carpeta por cuerpo técnico)
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('informes', 'informes', false, 20971520, array['application/pdf'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Miembros leen los informes de su cuerpo técnico"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'informes'
    and (storage.foldername(name))[1] = public.mi_cuerpo_tecnico()::text
  );

