-- =============================================================
-- Calendario de la temporada.
--
-- · actividades: todo lo que pasa en el día (entrenamientos, gimnasio,
--   comidas, viajes…), con hora de citación, indicaciones para jugadores y
--   notas internas. Fecha y horas en hora de Uruguay (sin zona horaria).
-- · Cada partido tiene su actividad, que se crea y actualiza sola (trigger).
-- =============================================================

create type public.tipo_actividad as enum (
  'entrenamiento',
  'partido',
  'gimnasio',
  'charla_tecnica',
  'reunion_cuerpo_tecnico',
  'comida',
  'viaje',
  'concentracion',
  'libre',
  'otro'
);

-- Hora de inicio del partido (hora de Uruguay)
alter table public.partidos add column hora time;

create table public.actividades (
  id                uuid primary key default gen_random_uuid(),
  temporada_id      uuid not null references public.temporadas (id) on delete cascade,
  tipo              public.tipo_actividad not null,
  titulo            text not null check (char_length(trim(titulo)) between 1 and 80),
  fecha             date not null,
  hora_inicio       time,
  hora_fin          time,
  -- A qué hora tienen que estar los jugadores (puede ser antes del inicio)
  hora_citacion     time,
  lugar             text check (char_length(lugar) <= 100),
  -- Lo que ven los jugadores ("traer ropa de gimnasio")
  indicaciones      text check (char_length(indicaciones) <= 500),
  -- Solo para el cuerpo técnico
  notas_internas    text check (char_length(notas_internas) <= 2000),
  visible_jugadores boolean not null default true,
  -- Solo las actividades de tipo partido apuntan a su partido
  partido_id        uuid unique references public.partidos (id) on delete cascade,
  creado_por        uuid default auth.uid() references auth.users (id) on delete set null,
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),
  constraint actividades_horario check (
    hora_fin is null or hora_inicio is null or hora_fin > hora_inicio
  ),
  constraint actividades_partido check ((tipo = 'partido') = (partido_id is not null))
);

create index actividades_temporada_fecha_idx on public.actividades (temporada_id, fecha);

create trigger actividades_actualizado_en
  before update on public.actividades
  for each row execute function public.tocar_actualizado_en();

alter table public.actividades enable row level security;

create policy "Miembros gestionan el calendario de sus temporadas"
  on public.actividades for all to authenticated
  using (public.es_miembro_temporada(temporada_id))
  with check (public.es_miembro_temporada(temporada_id));

-- Sincroniza la actividad de cada partido: fecha, hora, rival y lugar.
-- Lo que se edita desde el calendario (citación, indicaciones, notas,
-- visibilidad) no se pisa.
create function public.sincronizar_actividad_partido()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_titulo text;
begin
  select 'vs ' || e.nombre || case when new.es_local then ' (local)' else ' (visitante)' end
    into v_titulo
    from public.equipos e where e.id = new.rival_id;

  insert into public.actividades (temporada_id, tipo, titulo, fecha, hora_inicio, lugar, partido_id)
  values (new.temporada_id, 'partido', left(coalesce(v_titulo, 'Partido'), 80), new.fecha, new.hora,
          new.estadio, new.id)
  on conflict (partido_id) do update
    set titulo       = excluded.titulo,
        fecha        = excluded.fecha,
        hora_inicio  = excluded.hora_inicio,
        lugar        = excluded.lugar,
        temporada_id = excluded.temporada_id;
  return new;
end;
$$;

create trigger partidos_sincronizar_actividad
  after insert or update of fecha, hora, rival_id, es_local, estadio on public.partidos
  for each row execute function public.sincronizar_actividad_partido();

-- Partidos que ya existían
insert into public.actividades (temporada_id, tipo, titulo, fecha, hora_inicio, lugar, partido_id)
select p.temporada_id, 'partido',
       left('vs ' || e.nombre || case when p.es_local then ' (local)' else ' (visitante)' end, 80),
       p.fecha, p.hora, p.estadio, p.id
from public.partidos p
join public.equipos e on e.id = p.rival_id
on conflict (partido_id) do nothing;

-- Si se renombra un rival, se actualiza el título de sus partidos en el calendario.
create function public.renombrar_actividades_rival()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.actividades a
    set titulo = left('vs ' || new.nombre
                      || case when p.es_local then ' (local)' else ' (visitante)' end, 80)
    from public.partidos p
    where p.id = a.partido_id and p.rival_id = new.id;
  return new;
end;
$$;

create trigger equipos_renombrar_actividades
  after update of nombre on public.equipos
  for each row
  when (old.nombre is distinct from new.nombre)
  execute function public.renombrar_actividades_rival();
