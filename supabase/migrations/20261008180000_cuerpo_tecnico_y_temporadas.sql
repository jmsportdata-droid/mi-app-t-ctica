-- =============================================================
-- Cuerpo técnico, miembros y temporadas.
--
-- Borra los datos de prueba y rearma el esquema en dos capas:
--   · Permanente (cuelga de cuerpo_tecnico_id): viaja con el cuerpo
--     técnico de club en club. Hoy: equipos rivales.
--   · Club-temporada (cuelga de temporada_id): queda en cada club.
--     Hoy: jugadores, partidos y el detalle de cada partido.
--
-- Permisos: cualquier miembro edita todo lo de su cuerpo técnico;
-- solo el entrenador gestiona miembros y temporadas.
-- =============================================================

-- 1. Esquema anterior (solo datos de prueba) ------------------------
drop table if exists
  public.eventos_partido,
  public.abp_partido,
  public.alineacion_partido,
  public.jugador_atributos,
  public.informe_rival,
  public.plan_partido,
  public.partidos,
  public.equipos,
  public.jugadores
cascade;

drop policy if exists "Autenticados leen imagenes de la app" on storage.objects;
drop policy if exists "Autenticados suben imagenes de la app" on storage.objects;
drop policy if exists "Autenticados actualizan imagenes de la app" on storage.objects;
drop policy if exists "Autenticados borran imagenes de la app" on storage.objects;

-- Los buckets viejos dejan de ser públicos ya mismo. Se vacían y borran
-- con la API de Storage: Supabase no permite borrar objetos por SQL.
update storage.buckets
  set public = false
  where id in ('player-photos', 'team-logos', 'Player-Photos', 'Team-Logos');

-- 2. Tipos -----------------------------------------------------------
create type public.rol_miembro as enum ('entrenador', 'ayudante', 'preparador_fisico', 'analista');
create type public.linea_jugador as enum ('POR', 'DEF', 'CEN', 'DEL');
create type public.estado_partido as enum ('planificado', 'jugado');
create type public.formacion as enum ('4-3-3', '4-4-2', '4-2-3-1', '5-3-2');
create type public.etiqueta_informe as enum ('salida_balon', 'presion', 'bloque', 'linea_defensiva');
create type public.tipo_abp as enum ('ofensivo', 'defensivo');
create type public.categoria_abp as enum ('corner', 'falta_lateral');
create type public.tipo_evento as enum ('gol', 'ocasion', 'duelo', 'nota');

-- Mantiene actualizado_en al día en cada UPDATE.
create function public.tocar_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

-- 3. Cuerpo técnico, miembros y temporadas ----------------------------
create table public.cuerpos_tecnicos (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null check (char_length(trim(nombre)) between 2 and 80),
  creado_por uuid default auth.uid() references auth.users (id) on delete set null,
  creado_en  timestamptz not null default now()
);

create table public.miembros (
  cuerpo_tecnico_id uuid not null references public.cuerpos_tecnicos (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  rol               public.rol_miembro not null,
  nombre            text not null check (char_length(trim(nombre)) between 2 and 80),
  -- Copia del email de auth.users, que no es legible desde el cliente
  email             text not null,
  creado_en         timestamptz not null default now(),
  primary key (cuerpo_tecnico_id, user_id),
  -- Una persona pertenece a un solo cuerpo técnico
  constraint miembros_un_cuerpo_por_usuario unique (user_id)
);

create table public.temporadas (
  id                uuid primary key default gen_random_uuid(),
  cuerpo_tecnico_id uuid not null references public.cuerpos_tecnicos (id) on delete cascade,
  club              text not null check (char_length(trim(club)) between 2 and 80),
  -- Ej. "2026" o "2026/27"
  etiqueta          text not null check (char_length(trim(etiqueta)) between 1 and 20),
  fecha_inicio      date not null,
  fecha_fin         date not null,
  activa            boolean not null default false,
  -- Ruta en el bucket "escudos": <cuerpo_tecnico_id>/<uuid>.<ext>
  escudo_ruta       text,
  color_principal   text not null default '#059669' check (color_principal ~ '^#[0-9a-fA-F]{6}$'),
  archivada_en      timestamptz,
  creado_en         timestamptz not null default now(),
  constraint temporadas_fechas check (fecha_fin > fecha_inicio),
  constraint temporadas_unica unique (cuerpo_tecnico_id, club, etiqueta)
);

create unique index temporadas_una_activa
  on public.temporadas (cuerpo_tecnico_id) where activa;

-- 4. Funciones de permisos (security definer: leen miembros sin RLS) ---
create function public.mi_cuerpo_tecnico()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select cuerpo_tecnico_id from public.miembros where user_id = auth.uid()
$$;

create function public.tiene_rol(p_cuerpo_tecnico uuid, p_roles public.rol_miembro[])
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.miembros
    where user_id = auth.uid()
      and cuerpo_tecnico_id = p_cuerpo_tecnico
      and rol = any (p_roles)
  )
$$;

create function public.es_miembro(p_cuerpo_tecnico uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.miembros
    where user_id = auth.uid() and cuerpo_tecnico_id = p_cuerpo_tecnico
  )
$$;

create function public.es_entrenador(p_cuerpo_tecnico uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.tiene_rol(p_cuerpo_tecnico, array['entrenador']::public.rol_miembro[])
$$;

create function public.es_miembro_temporada(p_temporada uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.temporadas t
    join public.miembros m on m.cuerpo_tecnico_id = t.cuerpo_tecnico_id
    where t.id = p_temporada and m.user_id = auth.uid()
  )
$$;

-- 5. Políticas: cuerpo técnico, miembros y temporadas -----------------
alter table public.cuerpos_tecnicos enable row level security;
alter table public.miembros enable row level security;
alter table public.temporadas enable row level security;

-- Se crea con la función crear_cuerpo_tecnico(); no hay insert directo.
create policy "Miembros ven su cuerpo técnico"
  on public.cuerpos_tecnicos for select to authenticated
  using (public.es_miembro(id));
create policy "El entrenador edita el cuerpo técnico"
  on public.cuerpos_tecnicos for update to authenticated
  using (public.es_entrenador(id)) with check (public.es_entrenador(id));

create policy "Miembros ven a sus compañeros"
  on public.miembros for select to authenticated
  using (public.es_miembro(cuerpo_tecnico_id));
create policy "El entrenador agrega miembros"
  on public.miembros for insert to authenticated
  with check (public.es_entrenador(cuerpo_tecnico_id));
create policy "El entrenador edita miembros"
  on public.miembros for update to authenticated
  using (public.es_entrenador(cuerpo_tecnico_id))
  with check (public.es_entrenador(cuerpo_tecnico_id));
create policy "El entrenador quita miembros, salvo a sí mismo"
  on public.miembros for delete to authenticated
  using (public.es_entrenador(cuerpo_tecnico_id) and user_id <> auth.uid());

create policy "Miembros ven las temporadas"
  on public.temporadas for select to authenticated
  using (public.es_miembro(cuerpo_tecnico_id));
create policy "El entrenador crea temporadas"
  on public.temporadas for insert to authenticated
  with check (public.es_entrenador(cuerpo_tecnico_id));
create policy "El entrenador edita temporadas"
  on public.temporadas for update to authenticated
  using (public.es_entrenador(cuerpo_tecnico_id))
  with check (public.es_entrenador(cuerpo_tecnico_id));
create policy "El entrenador borra temporadas"
  on public.temporadas for delete to authenticated
  using (public.es_entrenador(cuerpo_tecnico_id));

-- Siempre queda al menos un entrenador en cada cuerpo técnico.
create function public.asegurar_entrenador()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.cuerpos_tecnicos where id = old.cuerpo_tecnico_id)
     and not exists (
       select 1 from public.miembros
       where cuerpo_tecnico_id = old.cuerpo_tecnico_id and rol = 'entrenador'
     )
  then
    raise exception 'El cuerpo técnico tiene que tener al menos un entrenador'
      using errcode = 'P0001', hint = 'sin_entrenador';
  end if;
  return null;
end;
$$;

create trigger miembros_asegurar_entrenador
  after update of rol or delete on public.miembros
  for each row execute function public.asegurar_entrenador();

-- Alta inicial: el usuario que no pertenece a ningún cuerpo técnico crea
-- el suyo, queda como entrenador y crea su primera temporada (activa).
create function public.crear_cuerpo_tecnico(
  p_nombre        text,
  p_mi_nombre     text,
  p_club          text,
  p_etiqueta      text,
  p_fecha_inicio  date,
  p_fecha_fin     date
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_cuerpo  uuid;
begin
  if v_usuario is null then
    raise exception 'Sesión no válida' using errcode = '42501';
  end if;
  if exists (select 1 from public.miembros where user_id = v_usuario) then
    raise exception 'Ya formás parte de un cuerpo técnico' using errcode = 'P0001', hint = 'ya_es_miembro';
  end if;

  insert into public.cuerpos_tecnicos (nombre, creado_por)
    values (p_nombre, v_usuario)
    returning id into v_cuerpo;

  insert into public.miembros (cuerpo_tecnico_id, user_id, rol, nombre, email)
    select v_cuerpo, v_usuario, 'entrenador', p_mi_nombre, u.email
    from auth.users u where u.id = v_usuario;

  insert into public.temporadas (cuerpo_tecnico_id, club, etiqueta, fecha_inicio, fecha_fin, activa)
    values (v_cuerpo, p_club, p_etiqueta, p_fecha_inicio, p_fecha_fin, true);

  return v_cuerpo;
end;
$$;

revoke execute on function public.crear_cuerpo_tecnico(text, text, text, text, date, date) from public, anon;
grant execute on function public.crear_cuerpo_tecnico(text, text, text, text, date, date) to authenticated;

-- Marca una temporada como la activa del cuerpo técnico (y desmarca la anterior).
create function public.activar_temporada(p_temporada uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_cuerpo uuid;
begin
  select cuerpo_tecnico_id into v_cuerpo from public.temporadas where id = p_temporada;
  if v_cuerpo is null or not public.es_entrenador(v_cuerpo) then
    raise exception 'Solo el entrenador puede cambiar la temporada activa' using errcode = '42501';
  end if;

  update public.temporadas set activa = false where cuerpo_tecnico_id = v_cuerpo and activa;
  update public.temporadas set activa = true where id = p_temporada;
end;
$$;

-- 6. Capa permanente: equipos rivales --------------------------------
create table public.equipos (
  id                uuid primary key default gen_random_uuid(),
  cuerpo_tecnico_id uuid not null default public.mi_cuerpo_tecnico()
                    references public.cuerpos_tecnicos (id) on delete cascade,
  nombre            text not null check (char_length(trim(nombre)) >= 2),
  -- Ruta en el bucket "escudos": <cuerpo_tecnico_id>/<uuid>.<ext>
  escudo_ruta       text,
  liga              text,
  estadio           text,
  -- Identificadores en fuentes externas (Wyscout, Sofascore…)
  ids_externos      jsonb not null default '{}'::jsonb,
  creado_en         timestamptz not null default now()
);

create unique index equipos_nombre_unico
  on public.equipos (cuerpo_tecnico_id, lower(nombre));

alter table public.equipos enable row level security;

create policy "Miembros gestionan los equipos de su cuerpo técnico"
  on public.equipos for all to authenticated
  using (public.es_miembro(cuerpo_tecnico_id))
  with check (public.es_miembro(cuerpo_tecnico_id));

-- 7. Capa club-temporada: jugadores y partidos -------------------------
create table public.jugadores (
  id           uuid primary key default gen_random_uuid(),
  temporada_id uuid not null references public.temporadas (id) on delete cascade,
  nombre       text not null check (char_length(trim(nombre)) >= 2),
  fecha_nac    date not null,
  posicion     public.linea_jugador not null,
  numero       integer check (numero between 1 and 99),
  -- Ruta en el bucket "fotos-jugadores": <cuerpo_tecnico_id>/<uuid>.<ext>
  foto_ruta    text,
  ids_externos jsonb not null default '{}'::jsonb,
  creado_en    timestamptz not null default now(),
  constraint jugadores_numero_unico unique (temporada_id, numero)
);

create index jugadores_temporada_idx on public.jugadores (temporada_id);

create table public.partidos (
  id           uuid primary key default gen_random_uuid(),
  temporada_id uuid not null references public.temporadas (id) on delete cascade,
  fecha        date not null,
  -- restrict: no se puede borrar un equipo que tiene partidos
  rival_id     uuid not null references public.equipos (id) on delete restrict,
  estadio      text,
  competicion  text,
  es_local     boolean not null default true,
  estado       public.estado_partido not null default 'planificado',
  -- Vídeo del partido (Vimeo o YouTube)
  video_url    text,
  ids_externos jsonb not null default '{}'::jsonb,
  creado_en    timestamptz not null default now()
);

create index partidos_temporada_fecha_idx on public.partidos (temporada_id, fecha);
create index partidos_rival_idx on public.partidos (rival_id);

-- El rival tiene que ser del mismo cuerpo técnico que la temporada.
create function public.rival_valido(p_rival uuid, p_temporada uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.equipos e
    join public.temporadas t on t.cuerpo_tecnico_id = e.cuerpo_tecnico_id
    where e.id = p_rival and t.id = p_temporada
  )
$$;

create function public.es_miembro_partido(p_partido uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.partidos p
    where p.id = p_partido and public.es_miembro_temporada(p.temporada_id)
  )
$$;

-- El jugador tiene que ser de la misma temporada que el partido.
create function public.jugador_del_partido(p_jugador uuid, p_partido uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.jugadores j
    join public.partidos p on p.temporada_id = j.temporada_id
    where j.id = p_jugador and p.id = p_partido
  )
$$;

alter table public.jugadores enable row level security;
alter table public.partidos enable row level security;

create policy "Miembros gestionan los jugadores de sus temporadas"
  on public.jugadores for all to authenticated
  using (public.es_miembro_temporada(temporada_id))
  with check (public.es_miembro_temporada(temporada_id));

create policy "Miembros gestionan los partidos de sus temporadas"
  on public.partidos for all to authenticated
  using (public.es_miembro_temporada(temporada_id))
  with check (
    public.es_miembro_temporada(temporada_id)
    and public.rival_valido(rival_id, temporada_id)
  );

-- 8. Detalle del partido (todo cuelga de partidos) ---------------------
create table public.plan_partido (
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
  actualizado_en     timestamptz not null default now()
);

create table public.informe_rival (
  partido_id     uuid primary key references public.partidos (id) on delete cascade,
  tags           public.etiqueta_informe[] not null default '{}',
  slides_url     text,
  vimeo_url      text,
  actualizado_en timestamptz not null default now()
);

-- titulares: 11 posiciones en el orden de la formación (null = hueco vacío)
create table public.alineacion_partido (
  partido_id     uuid primary key references public.partidos (id) on delete cascade,
  formacion      public.formacion not null default '4-3-3',
  titulares      uuid[] not null default '{}' check (cardinality(titulares) <= 11),
  suplentes      uuid[] not null default '{}' check (cardinality(suplentes) <= 30),
  actualizado_en timestamptz not null default now()
);

-- Una fila por tarjeta: 4 córners y 2 faltas laterales, ofensivas y defensivas
create table public.abp_partido (
  partido_id     uuid not null references public.partidos (id) on delete cascade,
  tipo           public.tipo_abp not null,
  categoria      public.categoria_abp not null,
  indice         smallint not null check (indice between 1 and 4),
  descripcion    text,
  vimeo_url      text,
  actualizado_en timestamptz not null default now(),
  primary key (partido_id, tipo, categoria, indice),
  check (categoria = 'corner' or indice <= 2)
);

create table public.eventos_partido (
  id          uuid primary key default gen_random_uuid(),
  partido_id  uuid not null references public.partidos (id) on delete cascade,
  tipo        public.tipo_evento not null,
  minuto      smallint not null check (minuto between 0 and 130),
  descripcion text,
  jugador_id  uuid references public.jugadores (id) on delete set null,
  -- Posición en el campo en % (0-100), opcional
  x           numeric(5, 2) check (x between 0 and 100),
  y           numeric(5, 2) check (y between 0 and 100),
  creado_en   timestamptz not null default now()
);

create index eventos_partido_partido_idx on public.eventos_partido (partido_id, minuto);
create index eventos_partido_jugador_idx
  on public.eventos_partido (jugador_id) where jugador_id is not null;

create trigger plan_partido_actualizado_en
  before update on public.plan_partido
  for each row execute function public.tocar_actualizado_en();
create trigger informe_rival_actualizado_en
  before update on public.informe_rival
  for each row execute function public.tocar_actualizado_en();
create trigger alineacion_partido_actualizado_en
  before update on public.alineacion_partido
  for each row execute function public.tocar_actualizado_en();
create trigger abp_partido_actualizado_en
  before update on public.abp_partido
  for each row execute function public.tocar_actualizado_en();

alter table public.plan_partido enable row level security;
alter table public.informe_rival enable row level security;
alter table public.alineacion_partido enable row level security;
alter table public.abp_partido enable row level security;
alter table public.eventos_partido enable row level security;

create policy "Miembros gestionan el plan de partido"
  on public.plan_partido for all to authenticated
  using (public.es_miembro_partido(partido_id))
  with check (public.es_miembro_partido(partido_id));

create policy "Miembros gestionan el informe del rival"
  on public.informe_rival for all to authenticated
  using (public.es_miembro_partido(partido_id))
  with check (public.es_miembro_partido(partido_id));

create policy "Miembros gestionan la alineación"
  on public.alineacion_partido for all to authenticated
  using (public.es_miembro_partido(partido_id))
  with check (public.es_miembro_partido(partido_id));

create policy "Miembros gestionan la pelota parada"
  on public.abp_partido for all to authenticated
  using (public.es_miembro_partido(partido_id))
  with check (public.es_miembro_partido(partido_id));

create policy "Miembros gestionan los eventos del partido"
  on public.eventos_partido for all to authenticated
  using (public.es_miembro_partido(partido_id))
  with check (
    public.es_miembro_partido(partido_id)
    and (jugador_id is null or public.jugador_del_partido(jugador_id, partido_id))
  );

-- 9. Storage: buckets privados, una carpeta por cuerpo técnico ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('fotos-jugadores', 'fotos-jugadores', false, 2097152, array['image/png', 'image/jpeg']),
  ('escudos',         'escudos',         false, 2097152, array['image/png', 'image/jpeg'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- La primera carpeta de la ruta es el id del cuerpo técnico.
create policy "Miembros leen las imágenes de su cuerpo técnico"
  on storage.objects for select to authenticated
  using (
    bucket_id in ('fotos-jugadores', 'escudos')
    and (storage.foldername(name))[1] = public.mi_cuerpo_tecnico()::text
  );

create policy "Miembros suben imágenes a su cuerpo técnico"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('fotos-jugadores', 'escudos')
    and (storage.foldername(name))[1] = public.mi_cuerpo_tecnico()::text
  );

create policy "Miembros reemplazan imágenes de su cuerpo técnico"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('fotos-jugadores', 'escudos')
    and (storage.foldername(name))[1] = public.mi_cuerpo_tecnico()::text
  );

create policy "Miembros borran imágenes de su cuerpo técnico"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('fotos-jugadores', 'escudos')
    and (storage.foldername(name))[1] = public.mi_cuerpo_tecnico()::text
  );
