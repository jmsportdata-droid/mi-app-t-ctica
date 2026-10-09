-- =============================================================
-- Microciclo: sesiones de entrenamiento armadas con tareas del banco.
--
-- · sesiones: una por actividad de tipo entrenamiento (cancha), con su
--   objetivo y el cierre (minutos reales, observaciones).
-- · sesion_tareas: las tareas de la sesión, en orden. Se copian tiempo y
--   espacio de la tarea al agregarla: lo que se hizo ese día no cambia si
--   después se edita el banco.
-- · asistencia_sesion: quién entrenó y cómo.
-- · plantillas_sesion / plantilla_tareas: sesiones tipo reutilizables
--   (capa permanente, viajan con el cuerpo técnico).
-- · Nuevo tipo de actividad: pre sesión.
-- =============================================================

alter type public.tipo_actividad add value if not exists 'pre_sesion' after 'entrenamiento';

create type public.estado_asistencia as enum ('completo', 'parcial', 'diferenciado', 'ausente');

create function public.es_miembro_actividad(p_actividad uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.actividades a
    where a.id = p_actividad and public.es_miembro_temporada(a.temporada_id)
  )
$$;

-- ¿La tarea es del mismo cuerpo técnico que la temporada de la actividad?
create function public.tarea_de_la_actividad(p_tarea uuid, p_actividad uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tareas t
    join public.temporadas te on te.cuerpo_tecnico_id = t.cuerpo_tecnico_id
    join public.actividades a on a.temporada_id = te.id
    where t.id = p_tarea and a.id = p_actividad
  )
$$;

-- -------------------------------------------------------------
-- Sesiones
-- -------------------------------------------------------------
create table public.sesiones (
  actividad_id         uuid primary key references public.actividades (id) on delete cascade,
  objetivo             text check (char_length(objetivo) <= 300),
  notas                text check (char_length(notas) <= 2000),
  cerrada              boolean not null default false,
  minutos_reales       smallint check (minutos_reales between 0 and 400),
  observaciones_cierre text check (char_length(observaciones_cierre) <= 2000),
  creado_en            timestamptz not null default now(),
  actualizado_en       timestamptz not null default now()
);

create trigger sesiones_actualizado_en
  before update on public.sesiones
  for each row execute function public.tocar_actualizado_en();

-- Solo los entrenamientos en cancha tienen sesión
create function public.validar_sesion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select tipo from public.actividades where id = new.actividad_id) <> 'entrenamiento' then
    raise exception 'Solo los entrenamientos tienen sesión' using errcode = 'P0001', hint = 'solo_entrenamiento';
  end if;
  return new;
end;
$$;

create trigger sesiones_validar
  before insert on public.sesiones
  for each row execute function public.validar_sesion();

-- Un entrenamiento con sesión no cambia de tipo (se perdería la sesión)
create function public.proteger_tipo_con_sesion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tipo <> old.tipo and exists (select 1 from public.sesiones where actividad_id = new.id) then
    raise exception 'El entrenamiento tiene una sesión armada' using errcode = 'P0001', hint = 'tiene_sesion';
  end if;
  return new;
end;
$$;

create trigger actividades_proteger_sesion
  before update of tipo on public.actividades
  for each row execute function public.proteger_tipo_con_sesion();

create table public.sesion_tareas (
  id               uuid primary key default gen_random_uuid(),
  actividad_id     uuid not null references public.sesiones (actividad_id) on delete cascade,
  tarea_id         uuid not null references public.tareas (id) on delete restrict,
  orden            integer not null default 0,
  series           smallint check (series between 1 and 50),
  duracion_seg     integer check (duracion_seg between 5 and 7200),
  pausa_seg        integer check (pausa_seg between 0 and 1800),
  tiempo_total_seg integer generated always as (
    case
      when duracion_seg is null then null
      when series is null then duracion_seg
      else series * duracion_seg + (series - 1) * coalesce(pausa_seg, 0)
    end
  ) stored,
  espacio          public.espacio_tarea,
  largo_m          smallint check (largo_m between 1 and 120),
  ancho_m          smallint check (ancho_m between 1 and 90),
  jugadores        smallint check (jugadores between 1 and 40),
  notas            text check (char_length(notas) <= 500),
  creado_en        timestamptz not null default now(),
  constraint sesion_tareas_pausa_con_series check (pausa_seg is null or series is not null)
);

create index sesion_tareas_actividad_idx on public.sesion_tareas (actividad_id, orden);
create index sesion_tareas_tarea_idx on public.sesion_tareas (tarea_id);

create table public.asistencia_sesion (
  actividad_id uuid not null references public.sesiones (actividad_id) on delete cascade,
  jugador_id   uuid not null references public.jugadores (id) on delete cascade,
  estado       public.estado_asistencia not null default 'completo',
  nota         text check (char_length(nota) <= 200),
  primary key (actividad_id, jugador_id)
);

create index asistencia_sesion_jugador_idx on public.asistencia_sesion (jugador_id);

alter table public.sesiones enable row level security;
alter table public.sesion_tareas enable row level security;
alter table public.asistencia_sesion enable row level security;

create policy "Miembros gestionan las sesiones"
  on public.sesiones for all to authenticated
  using (public.es_miembro_actividad(actividad_id))
  with check (public.es_miembro_actividad(actividad_id));

create policy "Miembros gestionan las tareas de sus sesiones"
  on public.sesion_tareas for all to authenticated
  using (public.es_miembro_actividad(actividad_id))
  with check (
    public.es_miembro_actividad(actividad_id)
    and public.tarea_de_la_actividad(tarea_id, actividad_id)
  );

create policy "Miembros gestionan la asistencia de sus sesiones"
  on public.asistencia_sesion for all to authenticated
  using (public.es_miembro_actividad(actividad_id))
  with check (
    public.es_miembro_actividad(actividad_id)
    and exists (
      select 1 from public.jugadores j
      join public.actividades a on a.id = actividad_id
      where j.id = jugador_id and j.temporada_id = a.temporada_id
    )
  );

-- -------------------------------------------------------------
-- Plantillas de sesión
-- -------------------------------------------------------------
create table public.plantillas_sesion (
  id                uuid primary key default gen_random_uuid(),
  cuerpo_tecnico_id uuid not null default public.mi_cuerpo_tecnico()
                    references public.cuerpos_tecnicos (id) on delete cascade,
  nombre            text not null check (char_length(trim(nombre)) between 2 and 80),
  -- Día de la semana tipo para el que se pensó: "MD-3", "MD+1"…
  md                text check (md ~ '^MD([+-][1-9])?$'),
  objetivo          text check (char_length(objetivo) <= 300),
  creado_en         timestamptz not null default now()
);

create unique index plantillas_sesion_nombre_unico
  on public.plantillas_sesion (cuerpo_tecnico_id, lower(nombre));

create table public.plantilla_tareas (
  id           uuid primary key default gen_random_uuid(),
  plantilla_id uuid not null references public.plantillas_sesion (id) on delete cascade,
  tarea_id     uuid not null references public.tareas (id) on delete cascade,
  orden        integer not null default 0,
  series       smallint check (series between 1 and 50),
  duracion_seg integer check (duracion_seg between 5 and 7200),
  pausa_seg    integer check (pausa_seg between 0 and 1800),
  espacio      public.espacio_tarea,
  largo_m      smallint check (largo_m between 1 and 120),
  ancho_m      smallint check (ancho_m between 1 and 90),
  jugadores    smallint check (jugadores between 1 and 40),
  notas        text check (char_length(notas) <= 500)
);

create index plantilla_tareas_plantilla_idx on public.plantilla_tareas (plantilla_id, orden);

create function public.es_miembro_plantilla(p_plantilla uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.plantillas_sesion p
    where p.id = p_plantilla and public.es_miembro(p.cuerpo_tecnico_id)
  )
$$;

alter table public.plantillas_sesion enable row level security;
alter table public.plantilla_tareas enable row level security;

create policy "Miembros gestionan las plantillas de sesión"
  on public.plantillas_sesion for all to authenticated
  using (public.es_miembro(cuerpo_tecnico_id))
  with check (public.es_miembro(cuerpo_tecnico_id));

create policy "Miembros gestionan las tareas de sus plantillas"
  on public.plantilla_tareas for all to authenticated
  using (public.es_miembro_plantilla(plantilla_id))
  with check (
    public.es_miembro_plantilla(plantilla_id)
    and exists (
      select 1 from public.tareas t
      join public.plantillas_sesion p on p.id = plantilla_id
      where t.id = tarea_id and t.cuerpo_tecnico_id = p.cuerpo_tecnico_id
    )
  );

-- -------------------------------------------------------------
-- Operaciones (security invoker: las políticas validan cada fila)
-- -------------------------------------------------------------

-- Agrega una tarea del banco al final de la sesión (crea la sesión si no existe),
-- copiando su tiempo y espacio. Devuelve el id de la fila nueva.
create function public.agregar_tarea_sesion(p_actividad uuid, p_tarea uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.sesiones (actividad_id) values (p_actividad) on conflict do nothing;
  insert into public.sesion_tareas (
    actividad_id, tarea_id, orden, series, duracion_seg, pausa_seg, espacio, largo_m, ancho_m, jugadores
  )
  select p_actividad, t.id,
         coalesce((select max(orden) from public.sesion_tareas where actividad_id = p_actividad), 0) + 1,
         t.series, t.duracion_seg, t.pausa_seg, t.espacio, t.largo_m, t.ancho_m, t.jugadores
  from public.tareas t
  where t.id = p_tarea
  returning id into v_id;
  if v_id is null then
    raise exception 'Tarea no válida' using errcode = '42501';
  end if;
  return v_id;
end;
$$;

-- Copia objetivo, notas y tareas de una sesión a otro entrenamiento (sin cierre
-- ni asistencia). Si el destino ya tenía tareas, las nuevas van al final.
create function public.copiar_sesion(p_origen uuid, p_destino uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_base  integer;
  v_total integer;
begin
  if not exists (select 1 from public.sesiones where actividad_id = p_origen) then
    return 0;
  end if;
  insert into public.sesiones (actividad_id, objetivo, notas)
    select p_destino, objetivo, notas from public.sesiones where actividad_id = p_origen
  on conflict (actividad_id) do nothing;
  select coalesce(max(orden), 0) into v_base from public.sesion_tareas where actividad_id = p_destino;
  insert into public.sesion_tareas (
    actividad_id, tarea_id, orden, series, duracion_seg, pausa_seg, espacio, largo_m, ancho_m, jugadores, notas
  )
  select p_destino, tarea_id, v_base + row_number() over (order by orden, creado_en),
         series, duracion_seg, pausa_seg, espacio, largo_m, ancho_m, jugadores, notas
  from public.sesion_tareas where actividad_id = p_origen;
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

-- Guarda las tareas de una sesión como plantilla. Devuelve el id de la plantilla.
create function public.guardar_plantilla_sesion(p_actividad uuid, p_nombre text, p_md text)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.es_miembro_actividad(p_actividad) then
    raise exception 'Sesión no válida' using errcode = '42501';
  end if;
  insert into public.plantillas_sesion (nombre, md, objetivo)
    select trim(p_nombre), p_md, s.objetivo from public.sesiones s where s.actividad_id = p_actividad
  returning id into v_id;
  if v_id is null then
    raise exception 'La sesión no tiene tareas' using errcode = 'P0001', hint = 'sesion_vacia';
  end if;
  insert into public.plantilla_tareas (
    plantilla_id, tarea_id, orden, series, duracion_seg, pausa_seg, espacio, largo_m, ancho_m, jugadores, notas
  )
  select v_id, tarea_id, row_number() over (order by orden, creado_en),
         series, duracion_seg, pausa_seg, espacio, largo_m, ancho_m, jugadores, notas
  from public.sesion_tareas where actividad_id = p_actividad;
  return v_id;
end;
$$;

-- Agrega las tareas de una plantilla al final de la sesión (crea la sesión si no
-- existe y toma el objetivo de la plantilla si la sesión no tenía).
create function public.aplicar_plantilla_sesion(p_plantilla uuid, p_actividad uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_objetivo text;
  v_base     integer;
  v_total    integer;
begin
  if not public.es_miembro_plantilla(p_plantilla) then
    raise exception 'Plantilla no válida' using errcode = '42501';
  end if;
  select objetivo into v_objetivo from public.plantillas_sesion where id = p_plantilla;
  insert into public.sesiones (actividad_id, objetivo) values (p_actividad, v_objetivo)
  on conflict (actividad_id) do update
    set objetivo = coalesce(public.sesiones.objetivo, excluded.objetivo);
  select coalesce(max(orden), 0) into v_base from public.sesion_tareas where actividad_id = p_actividad;
  insert into public.sesion_tareas (
    actividad_id, tarea_id, orden, series, duracion_seg, pausa_seg, espacio, largo_m, ancho_m, jugadores, notas
  )
  select p_actividad, tarea_id, v_base + row_number() over (order by orden),
         series, duracion_seg, pausa_seg, espacio, largo_m, ancho_m, jugadores, notas
  from public.plantilla_tareas where plantilla_id = p_plantilla;
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;
