-- =============================================================
-- Microciclo por bloques.
--
-- · Bloques nuevos: pelota quieta y recuperación ("charla técnica" se
--   muestra como "Video" en la app; el valor guardado no cambia).
-- · Llevan ejercicios del banco: entrenamiento (cancha), pre sesión,
--   gimnasio, pelota quieta y recuperación.
-- · Sesión: el tipo de entrenamiento elegido (antes solo se deducía del
--   día) y los principios que se quieren trabajar.
-- · Ejercicio de la sesión: la valoración del cierre y un comentario,
--   para aprender qué funciona.
-- =============================================================

alter type public.tipo_actividad add value if not exists 'pelota_quieta' after 'gimnasio';
alter type public.tipo_actividad add value if not exists 'recuperacion' after 'pelota_quieta';

-- Qué bloques llevan ejercicios
create function public.admite_sesion(p_tipo public.tipo_actividad)
returns boolean
language sql immutable
set search_path = ''
as $$
  select p_tipo::text in ('entrenamiento', 'pre_sesion', 'gimnasio', 'pelota_quieta', 'recuperacion');
$$;

create or replace function public.validar_sesion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.admite_sesion((select tipo from public.actividades where id = new.actividad_id)) then
    raise exception 'Este bloque no lleva ejercicios' using errcode = 'P0001', hint = 'solo_entrenamiento';
  end if;
  return new;
end;
$$;

-- Un bloque con ejercicios puede pasar a otro bloque que también los lleve
create or replace function public.proteger_tipo_con_sesion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tipo <> old.tipo
     and not public.admite_sesion(new.tipo)
     and exists (select 1 from public.sesiones where actividad_id = new.id) then
    raise exception 'El bloque tiene ejercicios armados' using errcode = 'P0001', hint = 'tiene_sesion';
  end if;
  return new;
end;
$$;

create type public.valoracion_tarea as enum ('funciono', 'regular', 'no_funciono');

alter table public.sesiones
  add column orientacion public.orientacion_fisica,
  add column principios  uuid[] not null default '{}' check (cardinality(principios) <= 12);

alter table public.sesion_tareas
  add column valoracion public.valoracion_tarea,
  add column comentario text check (char_length(comentario) <= 500);
