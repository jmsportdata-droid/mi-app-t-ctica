-- =============================================================
-- Modelo de juego (capa permanente: viaja con el cuerpo técnico).
--
-- · principios_juego: principios (padre_id null) y subprincipios
--   (padre_id = principio) por momento del juego. Solo dos niveles.
-- · contenidos_tecnicos: pase, remate, centro… (objetivos de las tareas
--   que no son principios del modelo).
-- · modelos_juego: filosofía y sistemas con y sin balón.
-- · cargar_modelo_base(): carga el modelo del manual del cuerpo técnico
--   si todavía no hay nada cargado.
-- =============================================================

create type public.momento_juego as enum (
  'organizacion_ofensiva',
  'organizacion_defensiva',
  'transicion_ataque_defensa',
  'transicion_defensa_ataque',
  'balon_parado'
);

create table public.modelos_juego (
  cuerpo_tecnico_id uuid primary key default public.mi_cuerpo_tecnico()
                    references public.cuerpos_tecnicos (id) on delete cascade,
  filosofia         text check (char_length(filosofia) <= 1000),
  sistema_con_balon text check (char_length(sistema_con_balon) <= 300),
  sistema_sin_balon text check (char_length(sistema_sin_balon) <= 300),
  actualizado_en    timestamptz not null default now()
);

create table public.principios_juego (
  id                uuid primary key default gen_random_uuid(),
  cuerpo_tecnico_id uuid not null default public.mi_cuerpo_tecnico()
                    references public.cuerpos_tecnicos (id) on delete cascade,
  momento           public.momento_juego not null,
  -- null = principio; con valor = subprincipio de ese principio
  padre_id          uuid references public.principios_juego (id) on delete cascade,
  nombre            text not null check (char_length(trim(nombre)) between 2 and 120),
  descripcion       text check (char_length(descripcion) <= 1000),
  orden             integer not null default 0,
  oculto            boolean not null default false,
  creado_en         timestamptz not null default now()
);

create index principios_juego_cuerpo_idx
  on public.principios_juego (cuerpo_tecnico_id, momento, padre_id, orden);
create unique index principios_juego_subprincipio_unico
  on public.principios_juego (padre_id, lower(nombre))
  where padre_id is not null;
create unique index principios_juego_principio_unico
  on public.principios_juego (cuerpo_tecnico_id, momento, lower(nombre))
  where padre_id is null;

-- Solo dos niveles, y el subprincipio en el mismo momento y cuerpo técnico que su principio.
create function public.validar_principio_juego()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_padre public.principios_juego;
begin
  if new.padre_id is null then
    return new;
  end if;
  select * into v_padre from public.principios_juego where id = new.padre_id;
  if v_padre.padre_id is not null then
    raise exception 'Un subprincipio no puede tener subprincipios' using errcode = 'P0001', hint = 'dos_niveles';
  end if;
  if v_padre.momento <> new.momento or v_padre.cuerpo_tecnico_id <> new.cuerpo_tecnico_id then
    raise exception 'El subprincipio tiene que ser del mismo momento que su principio' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger principios_juego_validar
  before insert or update of padre_id, momento on public.principios_juego
  for each row execute function public.validar_principio_juego();

create table public.contenidos_tecnicos (
  id                uuid primary key default gen_random_uuid(),
  cuerpo_tecnico_id uuid not null default public.mi_cuerpo_tecnico()
                    references public.cuerpos_tecnicos (id) on delete cascade,
  nombre            text not null check (char_length(trim(nombre)) between 2 and 80),
  orden             integer not null default 0,
  oculto            boolean not null default false,
  creado_en         timestamptz not null default now()
);

create unique index contenidos_tecnicos_nombre_unico
  on public.contenidos_tecnicos (cuerpo_tecnico_id, lower(nombre));

create trigger modelos_juego_actualizado_en
  before update on public.modelos_juego
  for each row execute function public.tocar_actualizado_en();

alter table public.modelos_juego enable row level security;
alter table public.principios_juego enable row level security;
alter table public.contenidos_tecnicos enable row level security;

create policy "Miembros gestionan el modelo de juego"
  on public.modelos_juego for all to authenticated
  using (public.es_miembro(cuerpo_tecnico_id))
  with check (public.es_miembro(cuerpo_tecnico_id));

create policy "Miembros gestionan los principios de juego"
  on public.principios_juego for all to authenticated
  using (public.es_miembro(cuerpo_tecnico_id))
  with check (public.es_miembro(cuerpo_tecnico_id));

create policy "Miembros gestionan los contenidos técnicos"
  on public.contenidos_tecnicos for all to authenticated
  using (public.es_miembro(cuerpo_tecnico_id))
  with check (public.es_miembro(cuerpo_tecnico_id));

-- -------------------------------------------------------------
-- Modelo base, tomado del manual del cuerpo técnico. Solo se carga
-- si el cuerpo técnico todavía no tiene principios. Devuelve cuántos
-- principios y subprincipios cargó (0 si ya había).
-- security invoker: inserta con los permisos de quien lo pide.
-- -------------------------------------------------------------
create function public.cargar_modelo_base()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_cuerpo uuid := public.mi_cuerpo_tecnico();
  v_total  integer := 0;
  v_padre  uuid;
  r        record;
  s        text;
  i        integer;
  j        integer;
begin
  if v_cuerpo is null then
    raise exception 'Sesión no válida' using errcode = '42501';
  end if;
  if exists (select 1 from public.principios_juego where cuerpo_tecnico_id = v_cuerpo) then
    return 0;
  end if;

  insert into public.modelos_juego (cuerpo_tecnico_id, filosofia, sistema_con_balon, sistema_sin_balon)
  values (
    v_cuerpo,
    'Equipos con mucha intensidad y dinámica, agresivos, de propuesta, que priorizan el arco rival, con presión alta y protagonismo en todas las canchas.',
    '1-4-3-3 como referencia, pudiendo ajustar en salida y construcción a una línea de tres (1-3-4-3).',
    'Presión alta con línea defensiva adelantada sobre una base 1-4-4-2, replegando a un bloque medio organizado en 1-4-1-4-1.'
  )
  on conflict (cuerpo_tecnico_id) do nothing;

  i := 0;
  for r in
    select * from (values
      ('organizacion_ofensiva', 'Inicio', 'Salida jugando desde el arco con superioridad en primera línea.',
        array['Salida con línea de tres', 'Volante central entre centrales', 'Arquero como apoyo con los pies', 'Atraer para progresar']),
      ('organizacion_ofensiva', 'Progresión', 'Juego asociado para superar líneas y cambiar el lado del ataque.',
        array['Juego asociado', 'Cambios de orientación', 'Juego entre líneas', 'Tercer hombre']),
      ('organizacion_ofensiva', 'Finalización', 'Amplitud y ataque por bandas, generando duelos individuales.',
        array['Amplitud y ataque por bandas', 'Duelos 1v1', 'Llegada de volantes al área', 'Desmarque de ruptura y juego aéreo del 9']),
      ('organizacion_ofensiva', 'Preparar la pérdida', 'Quienes atacan anticipan la reorganización defensiva.',
        array['Vigilancias ofensivas', 'Equilibrio al atacar']),
      ('organizacion_defensiva', 'Presión alta', 'Presión alta con línea defensiva adelantada sobre base 1-4-4-2.',
        array['Presión en saques de arco rival', 'Gatillos de presión (pase hacia atrás)', 'Línea defensiva adelantada']),
      ('organizacion_defensiva', 'Bloque medio', 'Bloque medio en 1-4-1-4-1 con orientación de la presión a banda.',
        array['Orientar la presión a banda', 'Coordinación de líneas (línea alta y equipo corto)', 'Ayudas defensivas y coberturas']),
      ('organizacion_defensiva', 'Defensa del área', 'Protección del arco cuando el rival llega al último tercio.',
        array['Despejes y perfiles', 'Juego aéreo defensivo', '1v1 defensivo']),
      ('transicion_ataque_defensa', 'Presión tras pérdida', 'Presión inmediata durante los primeros 3 segundos.',
        array['Cerrar línea de pase', 'Presión al poseedor', 'Reacción en 3 segundos']),
      ('transicion_ataque_defensa', 'Repliegue organizado', 'Si no se recupera, volver a ordenar el bloque.',
        array['Repliegue', 'Balance defensivo']),
      ('transicion_defensa_ataque', 'Velocidad para hacer daño', 'Atacar rápido al rival desordenado tras recuperar.',
        array['Primer pase vertical', 'Ataque del espacio', 'Conducción tras recuperación']),
      ('transicion_defensa_ataque', 'Retener la posesión', 'Si no hay ventaja inmediata, asegurar la pelota.',
        array['Pase de seguridad', 'Salir de la zona de presión']),
      ('balon_parado', 'Balón parado ofensivo', '5 a 6 jugadas base, adaptadas según la defensa del rival.',
        array['Córner ofensivo', 'Tiro libre ofensivo', 'Lateral ofensivo']),
      ('balon_parado', 'Balón parado defensivo', 'Marca mixta: dos zonas fuertes en zona y el resto al hombre.',
        array['Córner defensivo', 'Tiro libre defensivo', 'Marca mixta'])
    ) as t(momento, nombre, descripcion, subprincipios)
  loop
    i := i + 1;
    insert into public.principios_juego (cuerpo_tecnico_id, momento, nombre, descripcion, orden)
      values (v_cuerpo, r.momento::public.momento_juego, r.nombre, r.descripcion, i)
      returning id into v_padre;
    v_total := v_total + 1;

    j := 0;
    foreach s in array r.subprincipios loop
      j := j + 1;
      insert into public.principios_juego (cuerpo_tecnico_id, momento, padre_id, nombre, orden)
        values (v_cuerpo, r.momento::public.momento_juego, v_padre, s, j);
      v_total := v_total + 1;
    end loop;
  end loop;

  if not exists (select 1 from public.contenidos_tecnicos where cuerpo_tecnico_id = v_cuerpo) then
    insert into public.contenidos_tecnicos (cuerpo_tecnico_id, nombre, orden)
    select v_cuerpo, nombre, orden
    from unnest(array[
      'Pase y circulación', 'Pase filtrado', 'Control orientado', 'Conducción', 'Centro',
      'Remate', '1v1 ofensivo', 'Juego aéreo', 'Perfilación', 'Coordinación'
    ]) with ordinality as c(nombre, orden);
  end if;

  return v_total;
end;
$$;
