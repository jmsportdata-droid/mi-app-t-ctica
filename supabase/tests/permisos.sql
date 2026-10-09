-- =============================================================
-- Prueba de permisos (RLS). Se ejecuta con ./scripts/probar-permisos.sh
-- Todo corre dentro de una transacción que termina en ROLLBACK: no deja
-- datos. Si una regla falla, la consulta corta con "FALLA: <motivo>".
--
-- Escenario: dos cuerpos técnicos (A y B).
--   A: entrenador A1 y analista A2.   B: entrenador B1.
--   C: usuario sin cuerpo técnico.
-- =============================================================
begin;

-- Datos de prueba (como postgres, sin RLS) ----------------------------
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-4000-a000-0000000000a1', 'a1@prueba.local', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000a2', 'a2@prueba.local', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000b1', 'b1@prueba.local', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000c1', 'c1@prueba.local', 'authenticated', 'authenticated');

insert into public.cuerpos_tecnicos (id, nombre) values
  ('00000000-0000-4000-b000-00000000000a', 'Cuerpo A'),
  ('00000000-0000-4000-b000-00000000000b', 'Cuerpo B');

insert into public.miembros (cuerpo_tecnico_id, user_id, rol, nombre, email) values
  ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-a000-0000000000a1', 'entrenador', 'Entrenador A', 'a1@prueba.local'),
  ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-a000-0000000000a2', 'analista', 'Analista A', 'a2@prueba.local'),
  ('00000000-0000-4000-b000-00000000000b', '00000000-0000-4000-a000-0000000000b1', 'entrenador', 'Entrenador B', 'b1@prueba.local');

insert into public.temporadas (id, cuerpo_tecnico_id, club, etiqueta, fecha_inicio, fecha_fin, activa) values
  ('00000000-0000-4000-c000-00000000000a', '00000000-0000-4000-b000-00000000000a', 'Club A', '2026', '2026-01-01', '2026-12-31', true),
  ('00000000-0000-4000-c000-00000000000b', '00000000-0000-4000-b000-00000000000b', 'Club B', '2026', '2026-01-01', '2026-12-31', true);

insert into public.equipos (id, cuerpo_tecnico_id, nombre) values
  ('00000000-0000-4000-d000-00000000000a', '00000000-0000-4000-b000-00000000000a', 'Rival de A'),
  ('00000000-0000-4000-d000-00000000000b', '00000000-0000-4000-b000-00000000000b', 'Rival de B');

insert into public.jugadores (id, temporada_id, nombre, fecha_nac, posicion, numero) values
  ('00000000-0000-4000-e000-00000000000a', '00000000-0000-4000-c000-00000000000a', 'Jugador A', '2000-01-01', 'DEL', 9),
  ('00000000-0000-4000-e000-00000000000b', '00000000-0000-4000-c000-00000000000b', 'Jugador B', '2000-01-01', 'DEL', 9);

insert into public.partidos (id, temporada_id, fecha, rival_id) values
  ('00000000-0000-4000-f000-00000000000a', '00000000-0000-4000-c000-00000000000a', '2026-05-01', '00000000-0000-4000-d000-00000000000a'),
  ('00000000-0000-4000-f000-00000000000b', '00000000-0000-4000-c000-00000000000b', '2026-05-01', '00000000-0000-4000-d000-00000000000b');

insert into public.disponibilidad (jugador_id, fecha, estado) values
  ('00000000-0000-4000-e000-00000000000b', '2026-04-01', 'limitado');

insert into public.principios_juego (id, cuerpo_tecnico_id, momento, nombre) values
  ('00000000-0000-4000-9000-00000000000b', '00000000-0000-4000-b000-00000000000b', 'balon_parado', 'Principio de B');
insert into public.tareas (id, cuerpo_tecnico_id, nombre, tipo) values
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-b000-00000000000b', 'Tarea de B', 'rondo');
insert into public.jugadas (id, cuerpo_tecnico_id, tipo, categoria, nombre) values
  ('00000000-0000-4000-6000-00000000000b', '00000000-0000-4000-b000-00000000000b', 'ofensivo', 'corner', 'Jugada de B');
insert into public.actividades (id, temporada_id, tipo, titulo, fecha) values
  ('00000000-0000-4000-7000-00000000000b', '00000000-0000-4000-c000-00000000000b', 'entrenamiento', 'Entrenamiento de B', '2026-04-29');

-- Analista A2: ve y edita lo de su cuerpo técnico, nada de B ----------
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-a000-0000000000a2","role":"authenticated"}';

do $$
declare
  filas integer;
begin
  if (select count(*) from public.jugadores) <> 1 then
    raise exception 'FALLA: el analista A tiene que ver solo el jugador de su temporada';
  end if;
  if (select count(*) from public.equipos) <> 1 then
    raise exception 'FALLA: el analista A tiene que ver solo los equipos de su cuerpo técnico';
  end if;
  if (select count(*) from public.temporadas) <> 1 or (select count(*) from public.cuerpos_tecnicos) <> 1 then
    raise exception 'FALLA: el analista A no tiene que ver la temporada ni el cuerpo técnico de B';
  end if;
  if (select count(*) from public.miembros) <> 2 then
    raise exception 'FALLA: el analista A tiene que ver solo a los 2 miembros de su cuerpo técnico';
  end if;
  if (select count(*) from public.partidos) <> 1 then
    raise exception 'FALLA: el analista A tiene que ver solo el partido de su temporada';
  end if;

  -- Sin flujo de aprobación: cualquier miembro edita
  insert into public.jugadores (temporada_id, nombre, fecha_nac, posicion)
    values ('00000000-0000-4000-c000-00000000000a', 'Nuevo de A', '2001-01-01', 'CEN');
  insert into public.equipos (nombre) values ('Rival nuevo de A');
  if (select cuerpo_tecnico_id from public.equipos where nombre = 'Rival nuevo de A')
       <> '00000000-0000-4000-b000-00000000000a' then
    raise exception 'FALLA: el equipo nuevo tiene que quedar en el cuerpo técnico del usuario';
  end if;
  insert into public.planes_partido (partido_id, objetivo)
    values ('00000000-0000-4000-f000-00000000000a', 'Ganar');

  -- Nada de B: ni leer, ni escribir, ni modificar
  begin
    insert into public.jugadores (temporada_id, nombre, fecha_nac, posicion)
      values ('00000000-0000-4000-c000-00000000000b', 'Intruso', '2001-01-01', 'CEN');
    raise exception 'FALLA: el analista A pudo crear un jugador en la temporada de B';
  exception when insufficient_privilege then null;
  end;

  update public.jugadores set nombre = 'Cambiado' where id = '00000000-0000-4000-e000-00000000000b';
  get diagnostics filas = row_count;
  if filas <> 0 then
    raise exception 'FALLA: el analista A pudo modificar un jugador de B';
  end if;

  begin
    insert into public.planes_partido (partido_id, objetivo)
      values ('00000000-0000-4000-f000-00000000000b', 'Intruso');
    raise exception 'FALLA: el analista A pudo escribir el plan de un partido de B';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.partidos (temporada_id, fecha, rival_id)
      values ('00000000-0000-4000-c000-00000000000a', '2026-06-01', '00000000-0000-4000-d000-00000000000b');
    raise exception 'FALLA: se pudo crear un partido contra un rival de otro cuerpo técnico';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.eventos_partido (partido_id, tipo, minuto, jugador_id)
      values ('00000000-0000-4000-f000-00000000000a', 'gol', 10, '00000000-0000-4000-e000-00000000000b');
    raise exception 'FALLA: se pudo cargar un evento con un jugador de otra temporada';
  exception when insufficient_privilege then null;
  end;

  -- Modelo de juego: se carga el base una sola vez, solo para su cuerpo técnico
  if public.cargar_modelo_base() = 0 then
    raise exception 'FALLA: cargar_modelo_base no cargó nada';
  end if;
  if public.cargar_modelo_base() <> 0 then
    raise exception 'FALLA: cargar_modelo_base cargó dos veces';
  end if;
  if (select count(distinct cuerpo_tecnico_id) from public.principios_juego) <> 1
     or exists (select 1 from public.principios_juego where cuerpo_tecnico_id <> '00000000-0000-4000-b000-00000000000a') then
    raise exception 'FALLA: el modelo de juego no quedó solo en el cuerpo técnico A';
  end if;
  begin
    insert into public.principios_juego (momento, padre_id, nombre)
      select momento, id, 'Tercer nivel' from public.principios_juego
      where padre_id is not null limit 1;
    raise exception 'FALLA: se pudo crear un tercer nivel en el modelo de juego';
  exception when sqlstate 'P0001' then
    if sqlerrm like 'FALLA:%' then raise; end if;
  end;
  begin
    insert into public.principios_juego (cuerpo_tecnico_id, momento, nombre)
      values ('00000000-0000-4000-b000-00000000000b', 'balon_parado', 'Intruso');
    raise exception 'FALLA: el analista A pudo escribir en el modelo de juego de B';
  exception when insufficient_privilege then null;
  end;

  -- Banco de tareas: se carga una sola vez, con objetivos de su propio modelo
  if public.cargar_tareas_base() < 50 then
    raise exception 'FALLA: cargar_tareas_base no cargó el banco';
  end if;
  if public.cargar_tareas_base() <> 0 then
    raise exception 'FALLA: cargar_tareas_base cargó dos veces';
  end if;
  if (select count(*) from public.tareas) <> (select count(*) from public.tareas where cuerpo_tecnico_id = '00000000-0000-4000-b000-00000000000a') then
    raise exception 'FALLA: el analista A ve tareas de B';
  end if;
  if exists (select 1 from public.tareas t where t.tipo not in ('pre_sesion', 'fuerza', 'velocidad', 'partido_condicionado')
             and not exists (select 1 from public.tareas_objetivos o where o.tarea_id = t.id)
             and not exists (select 1 from public.tareas_contenidos c where c.tarea_id = t.id)) then
    raise exception 'FALLA: hay tareas base sin objetivos ni contenidos (revisá los nombres del modelo)';
  end if;
  if (select tiempo_total_seg from public.tareas where nombre = 'Rondos con rotación') <> 510 then
    raise exception 'FALLA: el tiempo total de 3 × 2′30″ + 30″ tiene que ser 8′30″';
  end if;
  begin
    insert into public.tareas_objetivos (tarea_id, principio_id)
      select id, '00000000-0000-4000-9000-00000000000b' from public.tareas limit 1;
    raise exception 'FALLA: una tarea de A quedó vinculada a un principio de B';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.tareas (cuerpo_tecnico_id, nombre, tipo)
      values ('00000000-0000-4000-b000-00000000000b', 'Intrusa', 'rondo');
    raise exception 'FALLA: el analista A pudo crear una tarea en el banco de B';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.reemplazar_vinculos_tarea('00000000-0000-4000-8000-00000000000b', '{}', '{}');
    raise exception 'FALLA: el analista A pudo tocar los objetivos de una tarea de B';
  exception when insufficient_privilege then null;
  end;

  -- Calendario: el partido creó su actividad sola; nada de B
  if (select count(*) from public.actividades where tipo = 'partido') <> 1 then
    raise exception 'FALLA: el partido no generó su actividad en el calendario (o se ve la de B)';
  end if;
  insert into public.actividades (temporada_id, tipo, titulo, fecha, hora_inicio, hora_citacion)
    values ('00000000-0000-4000-c000-00000000000a', 'entrenamiento', 'Entrenamiento', '2026-04-29', '10:00', '09:30');
  begin
    insert into public.actividades (temporada_id, tipo, titulo, fecha)
      values ('00000000-0000-4000-c000-00000000000b', 'entrenamiento', 'Intruso', '2026-04-29');
    raise exception 'FALLA: el analista A pudo cargar una actividad en el calendario de B';
  exception when insufficient_privilege then null;
  end;
  update public.partidos set fecha = '2026-05-03' where id = '00000000-0000-4000-f000-00000000000a';
  if (select fecha from public.actividades where partido_id = '00000000-0000-4000-f000-00000000000a') <> '2026-05-03' then
    raise exception 'FALLA: al cambiar la fecha del partido no se movió en el calendario';
  end if;

  -- Microciclo: sesiones con tareas del banco propio; nada de B
  insert into public.actividades (temporada_id, tipo, titulo, fecha)
    values ('00000000-0000-4000-c000-00000000000a', 'entrenamiento', 'Entrenamiento 2', '2026-04-30');
  perform public.agregar_tarea_sesion(
    (select id from public.actividades where titulo = 'Entrenamiento'),
    (select id from public.tareas where nombre = 'Rondo 4v1'));
  if (select tiempo_total_seg from public.sesion_tareas) <> 420 then
    raise exception 'FALLA: la tarea no se copió a la sesión con su tiempo (3 × 2′ + 30″ = 7′)';
  end if;
  begin
    perform public.agregar_tarea_sesion(
      (select id from public.actividades where tipo = 'partido'),
      (select id from public.tareas where nombre = 'Rondo 4v1'));
    raise exception 'FALLA: se pudo armar una sesión en un partido';
  exception when sqlstate 'P0001' then
    if sqlerrm like 'FALLA:%' then raise; end if;
  end;
  begin
    perform public.agregar_tarea_sesion(
      (select id from public.actividades where titulo = 'Entrenamiento'),
      '00000000-0000-4000-8000-00000000000b');
    raise exception 'FALLA: se pudo agregar una tarea de B a una sesión de A';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.agregar_tarea_sesion(
      '00000000-0000-4000-7000-00000000000b',
      (select id from public.tareas where nombre = 'Rondo 4v1'));
    raise exception 'FALLA: el analista A pudo armar una sesión de B';
  exception when insufficient_privilege then null;
  end;
  perform public.guardar_plantilla_sesion(
    (select id from public.actividades where titulo = 'Entrenamiento'), 'Plantilla MD-3', 'MD-3');
  if public.aplicar_plantilla_sesion(
       (select id from public.plantillas_sesion where nombre = 'Plantilla MD-3'),
       (select id from public.actividades where titulo = 'Entrenamiento 2')) <> 1
     or public.copiar_sesion(
       (select id from public.actividades where titulo = 'Entrenamiento'),
       (select id from public.actividades where titulo = 'Entrenamiento 2')) <> 1 then
    raise exception 'FALLA: las plantillas o la copia de sesión no copiaron las tareas';
  end if;
  begin
    update public.actividades set tipo = 'gimnasio' where titulo = 'Entrenamiento';
    raise exception 'FALLA: un entrenamiento con sesión cambió de tipo';
  exception when sqlstate 'P0001' then
    if sqlerrm like 'FALLA:%' then raise; end if;
  end;
  begin
    insert into public.asistencia_sesion (actividad_id, jugador_id)
      values ((select id from public.actividades where titulo = 'Entrenamiento'), '00000000-0000-4000-e000-00000000000b');
    raise exception 'FALLA: se cargó asistencia de un jugador de B';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.tareas where nombre = 'Rondo 4v1';
    raise exception 'FALLA: se borró una tarea usada en una sesión';
  exception when foreign_key_violation then null;
  end;

  -- Semana compartida: link por temporada, solo lo visible para jugadores
  insert into public.actividades (temporada_id, tipo, titulo, fecha, visible_jugadores)
    values ('00000000-0000-4000-c000-00000000000a', 'reunion_cuerpo_tecnico', 'Reunión secreta', '2026-04-29', false);
  perform set_config('prueba.token', public.regenerar_enlace_jugadores('00000000-0000-4000-c000-00000000000a'), true);
  if exists (
    select 1 from jsonb_array_elements(
      public.semana_publica(current_setting('prueba.token'), '2026-04-27') -> 'actividades') x
    where x ->> 'titulo' = 'Reunión secreta') then
    raise exception 'FALLA: el link de jugadores muestra actividades solo para el cuerpo técnico';
  end if;
  if public.semana_publica('00000000000000000000000000000000', '2026-04-27') is not null then
    raise exception 'FALLA: un token inventado devuelve una semana';
  end if;
  begin
    perform public.regenerar_enlace_jugadores('00000000-0000-4000-c000-00000000000b');
    raise exception 'FALLA: el analista A pudo crear el link de jugadores de B';
  exception when insufficient_privilege then null;
  end;

  -- Partido: previa, análisis, escenarios y vestuario; nada de B
  insert into public.partido_previa (partido_id, arbitro, cesped)
    values ('00000000-0000-4000-f000-00000000000a', 'Árbitro A', 'natural');
  insert into public.analisis_rival (partido_id, fase, texto, valoracion)
    values ('00000000-0000-4000-f000-00000000000a', 'ofensiva_inicio', 'Sale largo al 9', 'patron');
  insert into public.escenarios_partido (partido_id, situacion, respuesta)
    values ('00000000-0000-4000-f000-00000000000a', 'perdiendo', 'Pasamos a 1-3-4-3');
  insert into public.videos_vestuario (partido_id, tipo, url, visible_jugadores) values
    ('00000000-0000-4000-f000-00000000000a', 'rival', 'https://vimeo.com/1', true),
    ('00000000-0000-4000-f000-00000000000a', 'pre_partido', 'https://vimeo.com/2', false);
  update public.partidos set goles_favor = 2, goles_contra = 1 where id = '00000000-0000-4000-f000-00000000000a';
  if jsonb_array_length(public.semana_publica(current_setting('prueba.token'), '2026-04-27') -> 'videos') <> 1 then
    raise exception 'FALLA: el link de jugadores tiene que mostrar solo los videos visibles';
  end if;
  begin
    update public.partidos set goles_contra = null where id = '00000000-0000-4000-f000-00000000000a';
    raise exception 'FALLA: se guardó un resultado con un solo arco';
  exception when check_violation then null;
  end;
  begin
    insert into public.analisis_rival (partido_id, fase, texto)
      values ('00000000-0000-4000-f000-00000000000b', 'ofensiva_inicio', 'Intruso');
    raise exception 'FALLA: el analista A pudo cargar el análisis de un partido de B';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.videos_vestuario (partido_id, tipo, url)
      values ('00000000-0000-4000-f000-00000000000b', 'rival', 'https://vimeo.com/3');
    raise exception 'FALLA: el analista A pudo cargar videos de un partido de B';
  exception when insufficient_privilege then null;
  end;

  -- Concentración y habitaciones: con capacidad; nada de B
  insert into public.concentraciones (partido_id, lugar) values ('00000000-0000-4000-f000-00000000000a', 'Hotel');
  insert into public.habitaciones (partido_id, nombre, capacidad, jugadores)
    values ('00000000-0000-4000-f000-00000000000a', '101', 2, array['00000000-0000-4000-e000-00000000000a']::uuid[]);
  begin
    insert into public.habitaciones (partido_id, nombre, capacidad, jugadores)
      values ('00000000-0000-4000-f000-00000000000a', '102', 1,
              array['00000000-0000-4000-e000-00000000000a', '00000000-0000-4000-e000-00000000000a']::uuid[]);
    raise exception 'FALLA: una habitación quedó con más jugadores que camas';
  exception when check_violation then null;
  end;
  begin
    insert into public.concentraciones (partido_id, lugar) values ('00000000-0000-4000-f000-00000000000b', 'Intruso');
    raise exception 'FALLA: el analista A pudo cargar la concentración de un partido de B';
  exception when insufficient_privilege then null;
  end;

  -- Pizarra: jugadas propias en partidos propios
  insert into public.jugadas (tipo, categoria, nombre, roles)
    values ('ofensivo', 'corner', 'Segundo palo', '[{"id":"r1","nombre":"Ejecutor","corto":"EJ"}]');
  insert into public.partido_jugadas (partido_id, jugada_id, asignaciones)
    select '00000000-0000-4000-f000-00000000000a', id, '{"r1":"00000000-0000-4000-e000-00000000000a"}'
    from public.jugadas where nombre = 'Segundo palo';
  if exists (select 1 from public.jugadas where nombre = 'Jugada de B') then
    raise exception 'FALLA: el analista A ve jugadas de B';
  end if;
  begin
    insert into public.partido_jugadas (partido_id, jugada_id)
      values ('00000000-0000-4000-f000-00000000000a', '00000000-0000-4000-6000-00000000000b');
    raise exception 'FALLA: se usó una jugada de B en un partido de A';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.partido_jugadas (partido_id, jugada_id)
      select '00000000-0000-4000-f000-00000000000b', id from public.jugadas where nombre = 'Segundo palo';
    raise exception 'FALLA: el analista A eligió jugadas en un partido de B';
  exception when insufficient_privilege then null;
  end;

  -- Marcas de la pelota quieta: solo en partidos propios
  insert into public.marcas_partido (partido_id, parejas)
    values ('00000000-0000-4000-f000-00000000000a', '{}');
  begin
    insert into public.marcas_partido (partido_id) values ('00000000-0000-4000-f000-00000000000b');
    raise exception 'FALLA: el analista A cargó marcas en un partido de B';
  exception when insufficient_privilege then null;
  end;

  -- Post partido: estadísticas y evaluación solo en partidos y con jugadores propios
  insert into public.estadisticas_partido (partido_id, fuente)
    values ('00000000-0000-4000-f000-00000000000a', 'sofascore');
  insert into public.estadisticas_jugador_partido (partido_id, jugador_id, fuente, minutos)
    values ('00000000-0000-4000-f000-00000000000a', '00000000-0000-4000-e000-00000000000a', 'sofascore', 90);
  insert into public.post_partido (partido_id, valoracion)
    values ('00000000-0000-4000-f000-00000000000a', 'Buen partido');
  begin
    insert into public.estadisticas_partido (partido_id, fuente)
      values ('00000000-0000-4000-f000-00000000000b', 'sofascore');
    raise exception 'FALLA: el analista A cargó estadísticas en un partido de B';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.estadisticas_jugador_partido (partido_id, jugador_id, fuente)
      values ('00000000-0000-4000-f000-00000000000a', '00000000-0000-4000-e000-00000000000b', 'sofascore');
    raise exception 'FALLA: el analista A cargó minutos de un jugador de B';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.post_partido (partido_id) values ('00000000-0000-4000-f000-00000000000b');
    raise exception 'FALLA: el analista A evaluó un partido de B';
  exception when insufficient_privilege then null;
  end;

  -- Nota del cuerpo técnico: solo jugadores propios en partidos propios
  insert into public.valoraciones_jugador (partido_id, jugador_id, nota)
    values ('00000000-0000-4000-f000-00000000000a', '00000000-0000-4000-e000-00000000000a', 7.5);
  begin
    insert into public.valoraciones_jugador (partido_id, jugador_id, nota)
      values ('00000000-0000-4000-f000-00000000000a', '00000000-0000-4000-e000-00000000000b', 7);
    raise exception 'FALLA: el analista A valoró a un jugador de B';
  exception when insufficient_privilege then null;
  end;

  -- Referencias de la liga e indicadores del modelo: solo lo propio
  insert into public.referencias_liga (temporada_id, id_torneo, id_temporada, competicion)
    values ('00000000-0000-4000-c000-00000000000a', '278', '1', 'Liga');
  begin
    insert into public.referencias_liga (temporada_id, id_torneo, id_temporada, competicion)
      values ('00000000-0000-4000-c000-00000000000b', '278', '1', 'Liga');
    raise exception 'FALLA: el analista A cargó la liga en una temporada de B';
  exception when insufficient_privilege then null;
  end;
  insert into public.indicadores_modelo (momento, kpi, objetivo)
    values ('organizacion_defensiva', 'ppda', 8);
  if (select cuerpo_tecnico_id from public.indicadores_modelo where kpi = 'ppda')
     <> '00000000-0000-4000-b000-00000000000a' then
    raise exception 'FALLA: el indicador no quedó en el cuerpo técnico de A';
  end if;
  begin
    insert into public.indicadores_modelo (momento, principio_id, kpi, objetivo)
      values ('balon_parado', '00000000-0000-4000-9000-00000000000b', 'xg_abp', 0.3);
    raise exception 'FALLA: el analista A usó un principio de B en un indicador';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.indicadores_modelo (cuerpo_tecnico_id, momento, kpi, objetivo)
      values ('00000000-0000-4000-b000-00000000000b', 'balon_parado', 'xg_abp', 0.3);
    raise exception 'FALLA: el analista A creó indicadores para B';
  exception when insufficient_privilege then null;
  end;

  -- Asistente del plan: solo en partidos propios
  insert into public.asistente_plan (partido_id) values ('00000000-0000-4000-f000-00000000000a');
  begin
    insert into public.asistente_plan (partido_id) values ('00000000-0000-4000-f000-00000000000b');
    raise exception 'FALLA: el analista A pidió el asistente en un partido de B';
  exception when insufficient_privilege then null;
  end;

  -- Sofascore: pedidos, plantel rival e informes; uno abierto por partido; nada de B
  insert into public.pedidos_sofascore (partido_id) values ('00000000-0000-4000-f000-00000000000a');
  begin
    insert into public.pedidos_sofascore (partido_id) values ('00000000-0000-4000-f000-00000000000a');
    raise exception 'FALLA: se abrieron dos pedidos de Sofascore para el mismo partido';
  exception when unique_violation then null;
  end;
  begin
    insert into public.pedidos_sofascore (partido_id) values ('00000000-0000-4000-f000-00000000000b');
    raise exception 'FALLA: el analista A pidió datos para un partido de B';
  exception when insufficient_privilege then null;
  end;
  insert into public.jugadores_rivales (equipo_id, id_externo, nombre, altura_cm)
    values ('00000000-0000-4000-d000-00000000000a', '1', 'Rival alto', 190);
  begin
    insert into public.jugadores_rivales (equipo_id, id_externo, nombre)
      values ('00000000-0000-4000-d000-00000000000b', '2', 'Intruso');
    raise exception 'FALLA: el analista A cargó jugadores en un rival de B';
  exception when insufficient_privilege then null;
  end;
  insert into public.informes_rival_datos (partido_id, datos) values ('00000000-0000-4000-f000-00000000000a', '{"n": 5}');
  begin
    insert into public.estado_mac (cuerpo_tecnico_id) values ('00000000-0000-4000-b000-00000000000a');
    raise exception 'FALLA: un miembro pudo escribir la señal de la Mac (solo la escribe el programa)';
  exception when insufficient_privilege then null;
  end;

  -- Sofascore propio: pedidos de la temporada y análisis propio; nada de B
  insert into public.pedidos_sofascore (temporada_id, tipo)
    values ('00000000-0000-4000-c000-00000000000a', 'plantel_propio');
  begin
    insert into public.pedidos_sofascore (temporada_id, tipo)
      values ('00000000-0000-4000-c000-00000000000b', 'plantel_propio');
    raise exception 'FALLA: el analista A pidió datos para la temporada de B';
  exception when insufficient_privilege then null;
  end;
  insert into public.analisis_propio (temporada_id) values ('00000000-0000-4000-c000-00000000000a');
  begin
    insert into public.analisis_propio (temporada_id) values ('00000000-0000-4000-c000-00000000000b');
    raise exception 'FALLA: el analista A escribió el análisis propio de B';
  exception when insufficient_privilege then null;
  end;

  -- Disponibilidad: solo de jugadores propios
  insert into public.disponibilidad (jugador_id, fecha, estado, fecha_regreso)
    values ('00000000-0000-4000-e000-00000000000a', '2026-05-01', 'baja', '2026-05-20');
  if (select estado from public.disponibilidad_del_dia('00000000-0000-4000-c000-00000000000a', '2026-05-10')
      where jugador_id = '00000000-0000-4000-e000-00000000000a') <> 'baja' then
    raise exception 'FALLA: el estado de disponibilidad no se arrastra a los días siguientes';
  end if;
  begin
    insert into public.disponibilidad (jugador_id, fecha, estado)
      values ('00000000-0000-4000-e000-00000000000b', '2026-05-01', 'baja');
    raise exception 'FALLA: el analista A pudo cargar la disponibilidad de un jugador de B';
  exception when insufficient_privilege then null;
  end;
  if exists (select 1 from public.disponibilidad_del_dia('00000000-0000-4000-c000-00000000000b', '2026-12-31')) then
    raise exception 'FALLA: el analista A ve la disponibilidad de B';
  end if;

  -- Solo el entrenador gestiona miembros y temporadas
  begin
    insert into public.miembros (cuerpo_tecnico_id, user_id, rol, nombre, email)
      values ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-a000-0000000000c1', 'ayudante', 'Colado', 'c1@prueba.local');
    raise exception 'FALLA: el analista pudo agregar un miembro';
  exception when insufficient_privilege then null;
  end;

  update public.miembros set rol = 'entrenador' where user_id = '00000000-0000-4000-a000-0000000000a2';
  get diagnostics filas = row_count;
  if filas <> 0 then
    raise exception 'FALLA: el analista pudo cambiarse el rol';
  end if;

  update public.temporadas set club = 'Cambiado' where id = '00000000-0000-4000-c000-00000000000a';
  get diagnostics filas = row_count;
  if filas <> 0 then
    raise exception 'FALLA: el analista pudo editar la temporada';
  end if;

  -- Storage: solo la carpeta de su cuerpo técnico
  insert into storage.objects (bucket_id, name, owner)
    values ('escudos', '00000000-0000-4000-b000-00000000000a/propio.png', auth.uid());
  begin
    insert into storage.objects (bucket_id, name, owner)
      values ('escudos', '00000000-0000-4000-b000-00000000000b/ajeno.png', auth.uid());
    raise exception 'FALLA: el analista A pudo subir un archivo a la carpeta de B';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Entrenador A1: gestiona miembros, pero no puede quedar sin entrenador
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-a000-0000000000a1","role":"authenticated"}';

do $$
declare
  filas integer;
begin
  insert into public.miembros (cuerpo_tecnico_id, user_id, rol, nombre, email)
    values ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-a000-0000000000c1', 'preparador_fisico', 'Profe A', 'c1@prueba.local');
  delete from public.miembros where user_id = '00000000-0000-4000-a000-0000000000c1';

  update public.temporadas set club = 'Club A renombrado' where id = '00000000-0000-4000-c000-00000000000a';
  get diagnostics filas = row_count;
  if filas <> 1 then
    raise exception 'FALLA: el entrenador no pudo editar su temporada';
  end if;

  delete from public.miembros where user_id = auth.uid();
  get diagnostics filas = row_count;
  if filas <> 0 then
    raise exception 'FALLA: el entrenador pudo quitarse a sí mismo';
  end if;

  begin
    update public.miembros set rol = 'ayudante' where user_id = auth.uid();
    raise exception 'FALLA: el cuerpo técnico quedó sin entrenador';
  exception when sqlstate 'P0001' then
    if sqlerrm like 'FALLA:%' then raise; end if;
  end;

  if (select count(*) from public.jugadores where temporada_id = '00000000-0000-4000-c000-00000000000b') <> 0 then
    raise exception 'FALLA: el entrenador A ve jugadores de B';
  end if;
end;
$$;

-- Usuario C (sin cuerpo técnico): no ve nada y puede crear el suyo una vez
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-a000-0000000000c1","role":"authenticated"}';

do $$
begin
  if (select count(*) from public.jugadores) + (select count(*) from public.equipos)
     + (select count(*) from public.temporadas) <> 0 then
    raise exception 'FALLA: un usuario sin cuerpo técnico ve datos';
  end if;

  perform public.crear_cuerpo_tecnico('Cuerpo C', 'Entrenador C', 'Club C', '2026', '2026-01-01', '2026-12-31');
  if (select rol from public.miembros where user_id = auth.uid()) <> 'entrenador'
     or (select count(*) from public.temporadas where activa) <> 1 then
    raise exception 'FALLA: crear_cuerpo_tecnico no dejó al usuario como entrenador con una temporada activa';
  end if;

  begin
    perform public.crear_cuerpo_tecnico('Otro', 'Entrenador C', 'Club', '2027', '2027-01-01', '2027-12-31');
    raise exception 'FALLA: un usuario pudo crear un segundo cuerpo técnico';
  exception when sqlstate 'P0001' then
    if sqlerrm like 'FALLA:%' then raise; end if;
  end;
end;
$$;

-- Visitante sin sesión: nada
reset role;
set local role anon;

do $$
begin
  if (select count(*) from public.jugadores) + (select count(*) from public.equipos)
     + (select count(*) from public.miembros) <> 0 then
    raise exception 'FALLA: un visitante sin sesión ve datos';
  end if;
  if jsonb_array_length(public.semana_publica(current_setting('prueba.token'), '2026-04-27') -> 'actividades') < 1 then
    raise exception 'FALLA: con el link, un visitante sin sesión no ve la semana';
  end if;
  if exists (select 1 from public.enlaces_jugadores) then
    raise exception 'FALLA: un visitante sin sesión ve los links de jugadores';
  end if;
end;
$$;

reset role;
select 'OK: todas las pruebas de permisos pasaron' as resultado;

rollback;
