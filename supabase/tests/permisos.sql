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
  insert into public.plan_partido (partido_id, ataque_notas)
    values ('00000000-0000-4000-f000-00000000000a', 'Notas');

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
    insert into public.plan_partido (partido_id, ataque_notas)
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
end;
$$;

reset role;
select 'OK: todas las pruebas de permisos pasaron' as resultado;

rollback;
