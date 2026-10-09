-- =============================================================
-- Banco de tareas (capa permanente: viaja con el cuerpo técnico).
--
-- · tareas: la ficha de cada ejercicio, con el formato de la planilla de
--   sesión (tipo, vía metodológica, competitividad, tiempo, espacio,
--   descripción, gráfico).
-- · tareas_objetivos: principios o subprincipios del modelo de juego.
-- · tareas_contenidos: contenidos técnicos.
-- · cargar_tareas_base(): banco inicial de 53 tareas.
-- · Dos subprincipios nuevos en el modelo base.
-- =============================================================

create type public.tipo_tarea as enum (
  'entrada_en_calor',
  'pre_sesion',
  'rondo',
  'posesion',
  'espacio_reducido',
  'tactico',
  'transiciones',
  'partido_condicionado',
  'finalizacion',
  'pelota_parada',
  'velocidad',
  'arqueros',
  'fuerza',
  'recuperacion'
);

create type public.via_metodologica as enum ('analitica', 'global', 'sistemica');

create type public.competitividad_tarea as enum (
  'sin_oposicion',
  'con_oposicion',
  'con_oposicion_y_puntuacion'
);

-- Orientación física del día según la estructura semanal del manual
create type public.orientacion_fisica as enum (
  'tension',
  'duracion',
  'velocidad',
  'activacion',
  'recuperacion'
);

create type public.espacio_tarea as enum (
  'medidas',
  'cancha_entera',
  'tres_cuartos',
  'media_cancha',
  'ultimo_tercio',
  'area',
  'gimnasio'
);

create table public.tareas (
  id                 uuid primary key default gen_random_uuid(),
  cuerpo_tecnico_id  uuid not null default public.mi_cuerpo_tecnico()
                     references public.cuerpos_tecnicos (id) on delete cascade,
  nombre             text not null check (char_length(trim(nombre)) between 2 and 120),
  tipo               public.tipo_tarea not null,
  via                public.via_metodologica,
  competitividad     public.competitividad_tarea,
  orientacion_fisica public.orientacion_fisica,
  formato            text check (char_length(formato) <= 60),
  jugadores          smallint check (jugadores between 1 and 40),
  -- Tiempo: series × duración + pausa. Sin series = una sola duración continua.
  series             smallint check (series between 1 and 50),
  duracion_seg       integer check (duracion_seg between 5 and 7200),
  pausa_seg          integer check (pausa_seg between 0 and 1800),
  tiempo_total_seg   integer generated always as (
    case
      when duracion_seg is null then null
      when series is null then duracion_seg
      else series * duracion_seg + (series - 1) * coalesce(pausa_seg, 0)
    end
  ) stored,
  espacio            public.espacio_tarea,
  largo_m            smallint check (largo_m between 1 and 120),
  ancho_m            smallint check (ancho_m between 1 and 90),
  descripcion        text check (char_length(descripcion) <= 3000),
  -- Prompt personalizado para generar el gráfico; null = el que arma la app
  prompt_imagen      text check (char_length(prompt_imagen) <= 3000),
  -- Ruta en el bucket "graficos-tareas": <cuerpo_tecnico_id>/<uuid>.<ext>
  grafico_ruta       text,
  video_url          text check (video_url ~* '^https?://' and char_length(video_url) <= 500),
  archivada          boolean not null default false,
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),
  constraint tareas_medidas check (espacio <> 'medidas' or (largo_m is not null and ancho_m is not null)),
  constraint tareas_pausa_con_series check (pausa_seg is null or series is not null)
);

create unique index tareas_nombre_unico on public.tareas (cuerpo_tecnico_id, lower(nombre));
create index tareas_cuerpo_idx on public.tareas (cuerpo_tecnico_id, tipo);

create trigger tareas_actualizado_en
  before update on public.tareas
  for each row execute function public.tocar_actualizado_en();

-- on delete restrict: un principio o contenido usado en tareas se oculta, no se borra
create table public.tareas_objetivos (
  tarea_id     uuid not null references public.tareas (id) on delete cascade,
  principio_id uuid not null references public.principios_juego (id) on delete restrict,
  primary key (tarea_id, principio_id)
);
create index tareas_objetivos_principio_idx on public.tareas_objetivos (principio_id);

create table public.tareas_contenidos (
  tarea_id     uuid not null references public.tareas (id) on delete cascade,
  contenido_id uuid not null references public.contenidos_tecnicos (id) on delete restrict,
  primary key (tarea_id, contenido_id)
);
create index tareas_contenidos_contenido_idx on public.tareas_contenidos (contenido_id);

create function public.es_miembro_tarea(p_tarea uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tareas t
    where t.id = p_tarea and public.es_miembro(t.cuerpo_tecnico_id)
  )
$$;

alter table public.tareas enable row level security;
alter table public.tareas_objetivos enable row level security;
alter table public.tareas_contenidos enable row level security;

create policy "Miembros gestionan las tareas"
  on public.tareas for all to authenticated
  using (public.es_miembro(cuerpo_tecnico_id))
  with check (public.es_miembro(cuerpo_tecnico_id));

-- El objetivo y la tarea tienen que ser del mismo cuerpo técnico
create policy "Miembros gestionan los objetivos de sus tareas"
  on public.tareas_objetivos for all to authenticated
  using (public.es_miembro_tarea(tarea_id))
  with check (
    public.es_miembro_tarea(tarea_id)
    and exists (
      select 1 from public.principios_juego p
      join public.tareas t on t.id = tarea_id
      where p.id = principio_id and p.cuerpo_tecnico_id = t.cuerpo_tecnico_id
    )
  );

create policy "Miembros gestionan los contenidos de sus tareas"
  on public.tareas_contenidos for all to authenticated
  using (public.es_miembro_tarea(tarea_id))
  with check (
    public.es_miembro_tarea(tarea_id)
    and exists (
      select 1 from public.contenidos_tecnicos c
      join public.tareas t on t.id = tarea_id
      where c.id = contenido_id and c.cuerpo_tecnico_id = t.cuerpo_tecnico_id
    )
  );

-- Reemplaza objetivos y contenidos de una tarea en una sola transacción.
-- security invoker: las políticas de arriba validan cada fila.
create function public.reemplazar_vinculos_tarea(
  p_tarea      uuid,
  p_objetivos  uuid[],
  p_contenidos uuid[]
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not public.es_miembro_tarea(p_tarea) then
    raise exception 'Tarea no válida' using errcode = '42501';
  end if;
  delete from public.tareas_objetivos where tarea_id = p_tarea;
  delete from public.tareas_contenidos where tarea_id = p_tarea;
  insert into public.tareas_objetivos (tarea_id, principio_id)
    select p_tarea, x from unnest(coalesce(p_objetivos, '{}')) as x group by x;
  insert into public.tareas_contenidos (tarea_id, contenido_id)
    select p_tarea, x from unnest(coalesce(p_contenidos, '{}')) as x group by x;
end;
$$;

-- -------------------------------------------------------------
-- Storage: gráficos de las tareas (hasta 5 MB: los generados con IA pesan más)
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('graficos-tareas', 'graficos-tareas', false, 5242880, array['image/png', 'image/jpeg'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy "Miembros leen las imágenes de su cuerpo técnico" on storage.objects;
drop policy "Miembros suben imágenes a su cuerpo técnico" on storage.objects;
drop policy "Miembros reemplazan imágenes de su cuerpo técnico" on storage.objects;
drop policy "Miembros borran imágenes de su cuerpo técnico" on storage.objects;

create policy "Miembros leen las imágenes de su cuerpo técnico"
  on storage.objects for select to authenticated
  using (
    bucket_id in ('fotos-jugadores', 'escudos', 'graficos-tareas')
    and (storage.foldername(name))[1] = public.mi_cuerpo_tecnico()::text
  );

create policy "Miembros suben imágenes a su cuerpo técnico"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('fotos-jugadores', 'escudos', 'graficos-tareas')
    and (storage.foldername(name))[1] = public.mi_cuerpo_tecnico()::text
  );

create policy "Miembros reemplazan imágenes de su cuerpo técnico"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('fotos-jugadores', 'escudos', 'graficos-tareas')
    and (storage.foldername(name))[1] = public.mi_cuerpo_tecnico()::text
  );

create policy "Miembros borran imágenes de su cuerpo técnico"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('fotos-jugadores', 'escudos', 'graficos-tareas')
    and (storage.foldername(name))[1] = public.mi_cuerpo_tecnico()::text
  );

-- -------------------------------------------------------------
-- Modelo base: dos subprincipios nuevos. Se agregan a los cuerpos técnicos
-- que ya cargaron el modelo (si tienen el principio y no los borraron).
-- -------------------------------------------------------------
insert into public.principios_juego (cuerpo_tecnico_id, momento, padre_id, nombre, orden)
select p.cuerpo_tecnico_id, p.momento, p.id, n.nombre,
       coalesce((select max(s.orden) from public.principios_juego s where s.padre_id = p.id), 0) + 1
from public.principios_juego p
join (values
  ('organizacion_ofensiva'::public.momento_juego, 'Inicio', 'Salida contra presión al hombre'),
  ('organizacion_defensiva'::public.momento_juego, 'Defensa del área', 'Defensa del centro atrás')
) as n(momento, principio, nombre)
  on p.momento = n.momento and p.padre_id is null and lower(p.nombre) = lower(n.principio)
on conflict do nothing;

create or replace function public.cargar_modelo_base()
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
        array['Salida con línea de tres', 'Volante central entre centrales', 'Arquero como apoyo con los pies', 'Atraer para progresar', 'Salida contra presión al hombre']),
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
        array['Despejes y perfiles', 'Juego aéreo defensivo', '1v1 defensivo', 'Defensa del centro atrás']),
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

-- -------------------------------------------------------------
-- Banco base de tareas. Solo se carga si el cuerpo técnico todavía no
-- tiene tareas. Carga antes el modelo base si hace falta, y vincula los
-- objetivos y contenidos por nombre (los que se hayan renombrado o
-- borrado quedan sin vincular). Devuelve cuántas tareas cargó.
-- security invoker: inserta con los permisos de quien lo pide.
-- -------------------------------------------------------------
create function public.cargar_tareas_base()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_cuerpo uuid := public.mi_cuerpo_tecnico();
  v_total  integer := 0;
  v_tarea  uuid;
  r        record;
begin
  if v_cuerpo is null then
    raise exception 'Sesión no válida' using errcode = '42501';
  end if;
  if exists (select 1 from public.tareas where cuerpo_tecnico_id = v_cuerpo) then
    return 0;
  end if;
  perform public.cargar_modelo_base();

  for r in
    select * from (values
      -- Entrada en calor y pre sesión ---------------------------------
      ('Movilidad y técnica en columnas con coordinación', 'entrada_en_calor', 'analitica', 'sin_oposicion', null,
        'Columnas de 4', 20, null, 780, null, 'medidas', 30, 20,
        E'Organización: 5 columnas de 4 jugadores detrás de una línea de conos, con una escalera de coordinación y vallas bajas a 5 m.\nDesarrollo: movilidad articular dinámica de ida y vuelta (skipping, talones, aperturas de cadera), después escalera y vallas, y cierre con conducción y pase al compañero de la columna de enfrente.\nConsignas: intensidad progresiva; el último pasaje a velocidad alta.',
        '{}'::text[], array['Coordinación', 'Conducción']),
      ('Activación con pases en cuadrado', 'entrada_en_calor', 'analitica', 'sin_oposicion', null,
        '4 grupos de 5', 20, null, 600, null, 'medidas', 20, 20,
        E'Organización: cuadrado de 20×20 con un cono en cada esquina y un jugador por cono; el quinto arranca con la pelota.\nDesarrollo: pase y sigo al cono siguiente. Cada 2′ cambia el sentido y se suma una pared con un jugador en el medio.\nConsignas: control orientado con el pie lejano, pase al pie fuerte del compañero, perfil abierto antes de recibir.',
        array['Juego asociado'], array['Pase y circulación', 'Control orientado']),
      ('Rueda de pases con desmarque', 'entrada_en_calor', 'analitica', 'sin_oposicion', null,
        '2 ruedas de 8', 16, null, 600, null, 'medidas', 30, 20,
        E'Organización: rombo de 4 conos (30×20) con 2 jugadores por cono; dos ruedas en paralelo.\nDesarrollo: secuencia fija de pared, apoyo y pase largo; el receptor hace un contramovimiento antes de pedirla. Cada 3′ cambia la secuencia (tercer hombre, cambio de orientación).\nConsignas: desmarque de apoyo con contramovimiento, recibir perfilado, pase tenso a ras del piso.',
        array['Tercer hombre'], array['Pase y circulación', 'Control orientado', 'Perfilación']),
      ('Pre sesión: core, glúteo y movilidad', 'pre_sesion', 'analitica', 'sin_oposicion', null,
        'Individual', null, null, 900, null, 'gimnasio', null, null,
        E'Organización: circuito en el gimnasio antes de salir a la cancha.\nDesarrollo: plancha frontal y lateral 3 × 30″, puente de glúteo a una pierna 2 × 10, estocadas con rotación 2 × 8, movilidad de tobillo y cadera.\nConsignas: técnica antes que carga; cada jugador con su rutina individual de prevención.',
        '{}'::text[], '{}'::text[]),
      ('Pre sesión: isquios nórdicos, Copenhague y aceleraciones', 'pre_sesion', 'analitica', 'sin_oposicion', null,
        'Individual', null, null, 720, null, 'gimnasio', null, null,
        E'Organización: gimnasio y un sector de 20 m antes de salir a la cancha.\nDesarrollo: nórdicos de isquios 2 × 4 a 6, Copenhague para aductores 2 × 6 a 8 por lado, gemelos a una pierna 2 × 12 y 3 aceleraciones progresivas de 20 m.\nConsignas: es el protocolo de prevención con más respaldo científico; 2 veces por semana y lejos del partido (MD-4 y MD-3).',
        '{}'::text[], '{}'::text[]),

      -- Rondos ----------------------------------------------------------
      ('Rondo 4v1', 'rondo', 'analitica', 'con_oposicion', null,
        '4v1', 5, 3, 120, 30, 'medidas', 8, 8,
        E'Organización: cuadrado de 8×8 con 4 jugadores en los lados y 1 defensor adentro.\nDesarrollo: circulación a 2 toques; el que pierde la pelota o da el pase interceptado entra al medio.\nConsignas: recibir con la pierna lejana, apoyos a los dos lados del poseedor, pase al pie para jugar de primera.',
        array['Juego asociado'], array['Pase y circulación', 'Control orientado']),
      ('Rondos con rotación', 'rondo', 'global', 'con_oposicion', null,
        '4/5v2', 14, 3, 150, 30, 'medidas', 10, 10,
        E'Organización: dos rondos de 10×10 en paralelo (4v2 y 5v2).\nDesarrollo: los defensores presionan en pareja; al recuperar, el que perdió y el que dio el pase entran a defender. En cada serie rotan los grupos.\nConsignas: un defensor presiona al poseedor y el otro cierra la línea de pase interior. Atacantes a 2 toques; el pase que divide a la pareja vale punto.',
        array['Cerrar línea de pase', 'Presión al poseedor'], array['Pase y circulación']),
      ('Rondo 5v2 con transición entre rondos', 'rondo', 'global', 'con_oposicion_y_puntuacion', null,
        '5v2 + 5v2', 14, 4, 120, 30, 'medidas', 12, 12,
        E'Organización: dos cuadrados de 12×12 separados por un pasillo de 5 m, con un 5v2 en cada uno.\nDesarrollo: cuando los 2 defensores recuperan, tienen que llevar la pelota (pase o conducción) al otro rondo; los 5 que la perdieron reaccionan en 3″ para impedirlo.\nConsignas: reacción inmediata tras la pérdida; al recuperar, primer pase fuera de la zona de presión. 10 pases seguidos = 1 punto.',
        array['Reacción en 3 segundos', 'Presión al poseedor', 'Salir de la zona de presión'], array['Pase y circulación']),
      ('Rondo de posición 6v3 por carriles', 'rondo', 'global', 'con_oposicion', null,
        '6v3', 9, 4, 180, 60, 'medidas', 20, 15,
        E'Organización: rectángulo de 20×15 dividido en 3 carriles; 4 jugadores por fuera y 2 en el carril central, 3 defensores adentro.\nDesarrollo: los de afuera atraen y buscan al jugador del carril central entre los defensores; el pase entre líneas que el interior juega de cara vale doble.\nConsignas: fijar antes de pasar, el interior cambia de altura para ofrecer línea de pase, perfil abierto para jugar de cara.',
        array['Juego entre líneas', 'Atraer para progresar'], array['Pase y circulación', 'Perfilación']),
      ('Rondo de 3 equipos (4v4+4)', 'rondo', 'global', 'con_oposicion_y_puntuacion', null,
        '4v4+4', 12, 6, 90, 30, 'medidas', 15, 15,
        E'Organización: 15×15 con 3 equipos de 4; dos tienen la pelota (8v4) y uno defiende.\nDesarrollo: cuando el equipo que defiende recupera, el equipo que la perdió pasa a defender. El entrenador repone las pelotas.\nConsignas: reacción inmediata del que pierde; los que tienen la pelota juegan a 2 toques, con apoyos a los costados del poseedor.',
        array['Reacción en 3 segundos', 'Juego asociado', 'Presión al poseedor'], array['Pase y circulación']),

      -- Posesión y juego de posición -----------------------------------
      ('Posesión 4v4+3 comodines', 'posesion', 'global', 'con_oposicion_y_puntuacion', 'duracion',
        '4v4+3', 11, 6, 120, 60, 'medidas', 30, 25,
        E'Organización: 4v4 en 30×25 con 3 comodines (uno en cada lado corto y uno adentro).\nDesarrollo: el equipo con la pelota juega con los comodines (7v4); al perderla, presiona de inmediato. Comodines a 1 toque.\nConsignas: 10 pases seguidos = 1 punto. Altura y amplitud para ofrecer líneas de pase; usar al comodín para cambiar el lado.',
        array['Juego asociado', 'Reacción en 3 segundos'], array['Pase y circulación', 'Control orientado']),
      ('Posesión 5v5+2 con cambio de orientación', 'posesion', 'global', 'con_oposicion_y_puntuacion', 'duracion',
        '5v5+2', 12, 5, 180, 60, 'medidas', 40, 30,
        E'Organización: 40×30 dividido en dos mitades a lo ancho; 5v5 con 2 comodines.\nDesarrollo: el equipo con la pelota suma 1 punto cada vez que completa 4 pases en una mitad y cambia a la otra con un pase.\nConsignas: atraer de un lado para jugar del otro, cambio de orientación tenso y largo, el receptor ya perfilado.',
        array['Cambios de orientación', 'Juego asociado'], array['Pase y circulación', 'Control orientado']),
      ('Juego de posición 7v7+3 por zonas', 'posesion', 'sistemica', 'con_oposicion_y_puntuacion', 'duracion',
        '7v7+3', 17, 4, 300, 90, 'medidas', 45, 40,
        E'Organización: 45×40 dividido en 3 franjas; cada equipo en su estructura (línea de 3, volantes, extremos) y 3 comodines por dentro.\nDesarrollo: la pelota tiene que pasar de una franja de los extremos a la otra por la franja central; el pase al tercer hombre que progresa vale 2 puntos.\nConsignas: ocupar zonas sin perseguir la pelota, superioridad por dentro, presión de los más cercanos tras la pérdida.',
        array['Juego entre líneas', 'Tercer hombre', 'Atraer para progresar'], array['Pase y circulación', 'Perfilación']),
      ('Juego de posición con dirección a zonas finales', 'posesion', 'sistemica', 'con_oposicion_y_puntuacion', 'duracion',
        '6v6+3', 15, 5, 180, 60, 'medidas', 40, 30,
        E'Organización: 40×30 con una zona final de 5 m en cada extremo; 6v6 con 3 comodines (uno en cada zona final y uno adentro).\nDesarrollo: el equipo suma punto cuando, después de 6 pases, juega con el comodín de una zona final y recibe de cara. Hay que progresar, no solo tener la pelota.\nConsignas: atraer la presión de un lado para progresar por el otro, buscar al hombre libre entre líneas y al tercer hombre.',
        array['Atraer para progresar', 'Juego entre líneas', 'Tercer hombre'], array['Pase y circulación', 'Control orientado']),
      ('Salida 3+1 contra 2 a mini arcos', 'posesion', 'global', 'con_oposicion_y_puntuacion', null,
        'Arq + 4v2', 7, 6, 120, 60, 'medidas', 40, 45,
        E'Organización: 40×45 desde nuestro arco; arquero, línea de 3 y volante central contra 2 delanteros, con 2 mini arcos en la línea final.\nDesarrollo: la salida empieza en el arquero y termina en gol si se cruza la línea final conduciendo o se convierte en un mini arco. Si los delanteros recuperan, atacan el arco grande.\nConsignas: atraer al delantero antes de pasar, volante entre centrales para sumar superioridad, el arquero como apoyo.',
        array['Salida con línea de tres', 'Volante central entre centrales', 'Atraer para progresar'], array['Pase y circulación', 'Control orientado']),
      ('Provocar la presión: salida con el arquero contra 3', 'posesion', 'global', 'con_oposicion_y_puntuacion', null,
        'Arq + 4v3', 8, 6, 90, 60, 'medidas', 35, 40,
        E'Organización: 35×40 desde nuestro arco; arquero y 4 jugadores (línea de 3 y volante) contra 3 presionadores, con una línea de salida al final.\nDesarrollo: el equipo con la pelota la frena y espera a que el rival salte a presionar; recién ahí juega para superar la línea de presión. Punto si cruza la línea de salida conduciendo; si los presionadores recuperan, atacan el arco.\nConsignas: pisar la pelota para atraer, el arquero como un jugador más, pase al compañero que quedó libre tras el salto del rival. Es la idea de salida de De Zerbi.',
        array['Arquero como apoyo con los pies', 'Atraer para progresar', 'Salida con línea de tres'], array['Pase y circulación', 'Control orientado']),

      -- Espacios reducidos (MD-4, tensión) ----------------------------
      ('3v3 con arcos y arqueros', 'espacio_reducido', 'global', 'con_oposicion_y_puntuacion', 'tension',
        '3v3 + 2 arq', 8, 6, 90, 90, 'medidas', 25, 20,
        E'Organización: 25×20 con dos arcos y arqueros, 3v3, pelotas de reposición en los arcos.\nDesarrollo: juego libre a máxima intensidad; el arquero repone al instante cuando la pelota sale.\nConsignas: buscar el 1v1 y el remate rápido; el que defiende presiona al poseedor y no lo deja girar. Pausa activa con los arqueros.',
        array['Duelos 1v1', 'Presión al poseedor', '1v1 defensivo'], array['1v1 ofensivo', 'Remate']),
      ('4v4+2 con arcos', 'espacio_reducido', 'global', 'con_oposicion_y_puntuacion', 'tension',
        '4v4 + 2 arq', 10, 6, 120, 60, 'medidas', 30, 25,
        E'Organización: 30×25 con arcos y arqueros, 4v4.\nDesarrollo: el gol vale 1; el gol dentro de los 5″ posteriores a una recuperación vale 2.\nConsignas: presión inmediata tras la pérdida, recuperar y atacar el arco rápido, distancias cortas entre compañeros.',
        array['Reacción en 3 segundos', 'Presión al poseedor', 'Primer pase vertical'], array['Remate', 'Pase y circulación']),
      ('Coordinación de líneas en 2 zonas', 'espacio_reducido', 'sistemica', 'con_oposicion', 'tension',
        '8v8', 16, 8, 180, 60, 'medidas', 75, 60,
        E'Organización: 75×60 dividido en 2 zonas; 8v8 en estructura (línea de 4 y volantes contra los atacantes).\nDesarrollo: el equipo que defiende tiene que tener a todos sus jugadores en la zona donde está la pelota; el que ataca busca el cambio de zona.\nConsignas: bascular juntos, línea alta cuando la pelota está presionada, ayudas al compañero que sale y repliegue cuando no hay presión sobre la pelota.',
        array['Coordinación de líneas (línea alta y equipo corto)', 'Ayudas defensivas y coberturas', 'Repliegue'], '{}'::text[]),
      ('5v5+2 con gol doble si viene de banda', 'espacio_reducido', 'global', 'con_oposicion_y_puntuacion', 'tension',
        '5v5 + 2 arq', 12, 5, 240, 60, 'medidas', 50, 40,
        E'Organización: 50×40 con arcos y arqueros; pasillos laterales de 8 m marcados con conos.\nDesarrollo: juego libre; el gol que llega tras un centro o un pase atrás desde el pasillo vale doble. En el pasillo solo se defiende 1v1.\nConsignas: dar amplitud y atacar el área con al menos 2 jugadores cuando la pelota llega al pasillo.',
        array['Amplitud y ataque por bandas', 'Llegada de volantes al área'], array['Centro', 'Remate']),

      -- Táctico ----------------------------------------------------------
      ('Salidas sin oposición hasta finalizar', 'tactico', 'analitica', 'sin_oposicion', 'duracion',
        '11v0', 11, null, 900, null, 'cancha_entera', null, null,
        E'Organización: el once en su estructura de salida (1-3-4-3) en cancha entera, con conos que simulan a los rivales.\nDesarrollo: el arquero inicia y el equipo repite las salidas acordadas (por dentro, por fuera, en largo) hasta finalizar en el arco rival. Los suplentes rotan cada 2 salidas.\nConsignas: automatizar movimientos y distancias, velocidad de circulación de partido, terminar siempre con remate.',
        array['Salida con línea de tres', 'Arquero como apoyo con los pies', 'Juego asociado'], array['Pase y circulación', 'Remate']),
      ('Estructura de salida 1-3-4-3 contra sombras', 'tactico', 'analitica', 'con_oposicion', null,
        '11 vs sombras', 20, null, 720, null, 'cancha_entera', null, null,
        E'Organización: el once en 1-3-4-3 contra 6 a 8 jugadores que presionan de forma pasiva (sombras), imitando la presión del próximo rival.\nDesarrollo: el entrenador elige la salida; las sombras ocupan las alturas del rival y se mueven sin disputar.\nConsignas: volante entre centrales para formar la línea de 3, laterales altos, saber dónde está el hombre libre según la presión del rival.',
        array['Salida con línea de tres', 'Volante central entre centrales', 'Atraer para progresar'], array['Pase y circulación', 'Perfilación']),
      ('Salida contra presión al hombre: buscar al hombre libre', 'tactico', 'sistemica', 'con_oposicion_y_puntuacion', 'duracion',
        'Arq + 6v6', 13, 5, 180, 60, 'media_cancha', null, null,
        E'Organización: ½ cancha desde nuestro arco; arquero y 6 contra 6 que presionan hombre a hombre, con 2 mini arcos en la línea media.\nDesarrollo: cada defensor tiene una marca fija y el arquero es el hombre libre. Gana el que convierte en un mini arco o el pase largo que el 9 controla detrás de la línea media.\nConsignas: arrastrar marcas con desmarques para abrir espacios, pared y tercer hombre para soltarse, pase largo al 9 cuando nos cierran todo.',
        array['Salida contra presión al hombre', 'Tercer hombre', 'Desmarque de ruptura y juego aéreo del 9'], array['Pase y circulación', 'Juego aéreo']),
      ('Presión alta en saques de arco rival', 'tactico', 'sistemica', 'con_oposicion_y_puntuacion', 'tension',
        '8v8 + arq', 18, 4, 240, 60, 'tres_cuartos', null, null,
        E'Organización: ¾ de cancha; el rival sale desde su arquero en su estructura y nuestro equipo presiona con base 1-4-4-2.\nDesarrollo: cada acción arranca con un saque de arco. Si recuperamos en campo rival y finalizamos en menos de 10″, 2 puntos; si el rival cruza la línea media conduciendo, punto para ellos.\nConsignas: alturas de presión según el saque, saltar con el gatillo (pase atrás, control de espaldas, pase al lateral), línea defensiva adelantada para achicar.',
        array['Presión en saques de arco rival', 'Gatillos de presión (pase hacia atrás)', 'Línea defensiva adelantada'], '{}'::text[]),
      ('Presión hombre a hombre con referencias fijas', 'tactico', 'sistemica', 'con_oposicion_y_puntuacion', 'tension',
        '10v10 + arq', 22, 4, 240, 90, 'cancha_entera', null, null,
        E'Organización: cancha entera, titulares contra suplentes que salen desde su arquero.\nDesarrollo: desde el saque de arco cada jugador nuestro tiene su referencia fija (hombre a hombre); si se recupera en campo rival, el gol vale doble. Al estilo de Gasperini.\nConsignas: llegar a la marca mientras viaja la pelota, el último hombre queda 1v1 y en duelo, saltar todos juntos con el gatillo.',
        array['Presión en saques de arco rival', 'Gatillos de presión (pase hacia atrás)', 'Línea defensiva adelantada'], '{}'::text[]),
      ('Bloque medio 1-4-1-4-1 orientando a banda', 'tactico', 'sistemica', 'con_oposicion', 'duracion',
        '10 + arq v 9', 20, 4, 300, 60, 'medidas', 70, 65,
        E'Organización: 70×65 desde nuestro arco; nuestro equipo defiende en 1-4-1-4-1 contra 9 atacantes que salen desde la mitad de la cancha.\nDesarrollo: el rival ataca nuestro arco; si recuperamos, atacamos 2 mini arcos en la línea media.\nConsignas: cerrar adentro y dejar el pase hacia afuera, saltar sobre el receptor en la banda, basculación y coberturas, distancias cortas entre líneas.',
        array['Orientar la presión a banda', 'Ayudas defensivas y coberturas', 'Coordinación de líneas (línea alta y equipo corto)'], '{}'::text[]),
      ('Balance defensivo: 4 atacan, 3 vigilan y frenan la contra', 'tactico', 'sistemica', 'con_oposicion_y_puntuacion', 'duracion',
        '7 + arq v 5 + 3', 17, 6, 120, 60, 'tres_cuartos', null, null,
        E'Organización: ¾ de cancha; nuestro equipo ataca con 7 contra 5 defensores y 3 delanteros rivales esperan en la mitad de la cancha.\nDesarrollo: cuando el rival recupera, busca a sus 3 delanteros para contraatacar contra nuestros jugadores de vigilancia. Punto si frenamos la contra en menos de 6″ o la llevamos a la banda.\nConsignas: mientras atacamos, 3 jugadores quedan en estructura de vigilancia cerca de los delanteros rivales; anticipar el pase y temporizar si no se llega.',
        array['Vigilancias ofensivas', 'Equilibrio al atacar', 'Balance defensivo'], '{}'::text[]),
      ('Defensa del área contra centros', 'tactico', 'analitica', 'con_oposicion', null,
        '6v5 + 2 centradores', 14, null, 720, null, 'ultimo_tercio', null, null,
        E'Organización: último tercio con arco y arquero; 6 defensores contra 5 atacantes y 2 centradores en las bandas.\nDesarrollo: la pelota circula entre los atacantes hasta que llega a un centrador, que centra o tira el pase atrás. Después del despeje, los defensores salen juntos.\nConsignas: perfil para ver pelota y rival, atacar la pelota en el primer palo, alguien cubre el punto penal, salir juntos tras el despeje.',
        array['Despejes y perfiles', 'Juego aéreo defensivo', 'Defensa del centro atrás'], array['Juego aéreo']),
      ('Defender el centro atrás: cerrar el punto penal', 'tactico', 'analitica', 'con_oposicion', null,
        '4v4 + arq', 11, null, 600, null, 'area', null, null,
        E'Organización: área con arquero; 4 defensores contra 4 atacantes y un centrador que llega al fondo por cada banda.\nDesarrollo: el centrador elige entre el centro al área y el pase atrás; los defensores tienen que cubrir el área chica y el punto penal.\nConsignas: un volante baja a cubrir el punto penal, perfil para ver pelota y rival, no quedar todos en la línea del área chica.',
        array['Defensa del centro atrás', 'Despejes y perfiles'], '{}'::text[]),
      ('Juego directo: pelota larga al 9 y segunda pelota', 'tactico', 'global', 'con_oposicion_y_puntuacion', 'duracion',
        'Arq + 6v6 + arq', 14, 4, 180, 60, 'cancha_entera', null, null,
        E'Organización: cancha entera dividida en 3 zonas, con duelos 2v2 en cada una.\nDesarrollo: el arquero o un central juega largo al 9, que la baja o la peina; los volantes ganan la segunda pelota para atacar el arco. Si los defensores ganan la segunda pelota, salen ellos.\nConsignas: volantes cerca del 9 antes del pase largo, atacar la segunda pelota de frente, el extremo al espacio tras la peinada.',
        array['Desmarque de ruptura y juego aéreo del 9', 'Ataque del espacio'], array['Juego aéreo', 'Control orientado']),

      -- Partido condicionado ---------------------------------------------
      ('10v10 a dos toques', 'partido_condicionado', 'global', 'con_oposicion_y_puntuacion', 'duracion',
        '10v10 + arq', 22, 3, 480, 120, 'medidas', 80, 60,
        E'Organización: 80×60 con arcos y arqueros, 10v10 en las estructuras del equipo.\nDesarrollo: máximo 2 toques por jugador; el tercer toque es tiro libre indirecto para el rival.\nConsignas: velocidad de circulación, recibir orientado para jugar al segundo toque, apoyos cercanos.',
        array['Juego asociado', 'Salir de la zona de presión'], array['Pase y circulación', 'Control orientado']),
      ('10v10: gol doble si recupera en 5″', 'partido_condicionado', 'sistemica', 'con_oposicion_y_puntuacion', 'duracion',
        '10v10 + arq', 22, 2, 600, 120, 'tres_cuartos', null, null,
        E'Organización: ¾ de cancha con arcos y arqueros, 10v10.\nDesarrollo: juego libre; el gol vale doble si llega dentro de los 10″ posteriores a una recuperación hecha en los primeros 5″ tras la pérdida.\nConsignas: presión inmediata de los más cercanos, cerrar la línea de pase de seguridad, atacar rápido tras recuperar.',
        array['Reacción en 3 segundos', 'Cerrar línea de pase', 'Primer pase vertical'], '{}'::text[]),
      ('8v8 sin pausas (murderball)', 'partido_condicionado', 'global', 'con_oposicion_y_puntuacion', 'tension',
        '8v8 + arq', 18, 3, 360, 120, 'tres_cuartos', null, null,
        E'Organización: ¾ de cancha con arcos y arqueros, 8v8, entrenadores con pelotas alrededor de la cancha.\nDesarrollo: la pelota nunca se detiene: cuando sale, el entrenador repone otra al instante y no se cobran faltas salvo las graves. Inspirado en el murderball de Bielsa.\nConsignas: intensidad y duelos a fondo, cada jugador con su marca, sin descanso sin pelota.',
        array['Presión al poseedor', 'Reacción en 3 segundos', 'Duelos 1v1'], '{}'::text[]),
      ('11v11 con objetivos del plan de partido', 'partido_condicionado', 'sistemica', 'con_oposicion_y_puntuacion', 'duracion',
        '11v11', 22, 2, 900, 180, 'cancha_entera', null, null,
        E'Organización: cancha entera, titulares contra suplentes que imitan la estructura del próximo rival.\nDesarrollo: juego real con las consignas del plan de partido; el cuerpo técnico frena para corregir solo en momentos clave.\nConsignas: en cada sesión en que se use, elegir los objetivos del plan de partido de esa semana.',
        '{}'::text[], '{}'::text[]),

      -- Transiciones (MD-2, velocidad) -----------------------------------
      ('6v6+2 por oleadas', 'transiciones', 'global', 'con_oposicion_y_puntuacion', 'velocidad',
        '6v6 + 2 arq', 20, 6, 120, 60, 'medidas', 50, 40,
        E'Organización: 50×40 con arcos y arqueros; 3 grupos de 6 (uno espera en la línea de fondo).\nDesarrollo: un grupo ataca contra otro; cuando termina la acción (gol, salida o recuperación), el que defendía ataca el arco contrario contra el grupo que esperaba.\nConsignas: velocidad para atacar al rival desordenado; el que terminó de atacar repliega de inmediato.',
        array['Ataque del espacio', 'Primer pase vertical', 'Repliegue'], array['Conducción', 'Remate']),
      ('Juego de 3 equipos por transiciones', 'transiciones', 'global', 'con_oposicion_y_puntuacion', 'velocidad',
        '3 equipos de 6 + arq', 20, null, 720, null, 'medidas', 50, 40,
        E'Organización: 50×40 con 2 arcos y arqueros; 3 equipos de 6, dos juegan y el tercero espera afuera junto a un arco.\nDesarrollo: el equipo que recibe un gol o pierde la pelota sale y entra el que espera, que ataca de inmediato. Es continuo, sin pausas.\nConsignas: reacción inmediata en cada pérdida y en cada recuperación; el que entra ataca rápido al rival que todavía no se ordenó.',
        array['Reacción en 3 segundos', 'Primer pase vertical', 'Ataque del espacio'], array['Remate']),
      ('Contraataque 4v3 tras recuperar', 'transiciones', 'global', 'con_oposicion', 'velocidad',
        '4v3 + arq', 8, null, 600, null, 'medidas', 60, 40,
        E'Organización: 60×40 con arco y arquero; 4 atacantes arrancan en su mitad y 3 defensores retroceden desde la línea media.\nDesarrollo: el entrenador simula la recuperación con un pase; los atacantes tienen 8″ para finalizar.\nConsignas: primer pase hacia adelante, conducir para fijar a un defensor, atacar el espacio a la espalda, llegar con 3 al área.',
        array['Primer pase vertical', 'Ataque del espacio', 'Conducción tras recuperación'], array['Conducción', 'Pase filtrado', 'Remate']),
      ('Transición tras centro: 5v4 y contra 3v2', 'transiciones', 'sistemica', 'con_oposicion_y_puntuacion', 'velocidad',
        '5v4 → 3v2', 13, null, 720, null, 'media_cancha', null, null,
        E'Organización: ½ cancha con un arco en cada extremo y arqueros.\nDesarrollo: 5 atacan contra 4 y terminan con un centro; si el arquero o los defensores recuperan, salen 3 contra los 2 que quedaron de vigilancia hacia el otro arco.\nConsignas: los que no van al área quedan de vigilancia bien ubicados; tras la pérdida, el balance frena la contra.',
        array['Balance defensivo', 'Vigilancias ofensivas', 'Ataque del espacio'], array['Centro', 'Remate']),

      -- Velocidad ------------------------------------------------------
      ('Velocidad de reacción y aceleraciones', 'velocidad', 'analitica', 'sin_oposicion', 'velocidad',
        'Parejas', 20, 4, 90, 60, 'medidas', 20, 20,
        E'Organización: parejas en carriles de 15 m.\nDesarrollo: 4 series de 4 aceleraciones de 15 m con estímulo visual o sonoro (salida desde sentado, de espaldas o tras un giro); el que reacciona tarde persigue.\nConsignas: máxima intensidad en cada repetición y recuperación completa entre esfuerzos.',
        '{}'::text[], array['Coordinación']),
      ('Sprint al máximo: 4 a 6 × 30-40 m', 'velocidad', 'analitica', 'sin_oposicion', 'velocidad',
        'Individual', 20, 5, 10, 120, 'medidas', 50, 10,
        E'Organización: carriles de 50 m (10 m de aceleración y 30 a 40 m de sprint), después de una buena entrada en calor. Va en MD-3 o MD-2.\nDesarrollo: 4 a 6 sprints al máximo con recuperación completa (2′). Puede hacerse con pelota (conducción larga) o con carrera a la espalda tras un pase.\nConsignas: llegar a más del 90 % de la velocidad máxima de cada jugador; si baja la calidad, se corta. Es la dosis semanal de sprint que protege los isquios: controlarla con el GPS.',
        '{}'::text[], '{}'::text[]),

      -- Finalización -----------------------------------------------------
      ('Ataque por banda con centro y llegada', 'finalizacion', 'analitica', 'sin_oposicion', null,
        'Grupos de 3 + arq', 13, null, 900, null, 'media_cancha', null, null,
        E'Organización: ½ cancha con arco y arquero; grupos de 3 (extremo, volante interior y 9) que arrancan desde la mitad.\nDesarrollo: pared entre el interior y el extremo, que desborda y centra; el 9 ataca el primer palo y el interior llega al punto penal. Se alternan los dos lados.\nConsignas: centro tenso al área chica o atrás al punto penal, cada atacante a una zona distinta. Progresión: sumar 1 y después 2 defensores.',
        array['Amplitud y ataque por bandas', 'Llegada de volantes al área', 'Desmarque de ruptura y juego aéreo del 9'], array['Centro', 'Remate', 'Juego aéreo']),
      ('Centro atrás al punto penal tras llegar al fondo', 'finalizacion', 'global', 'con_oposicion', null,
        '3v2 + arq', 6, null, 720, null, 'ultimo_tercio', null, null,
        E'Organización: último tercio con arco y arquero; 3 atacantes contra 2 defensores, con la zona entre el área chica y el punto penal marcada.\nDesarrollo: el extremo o el lateral llega al fondo y tira el pase atrás al jugador que llega al punto penal. El gol de pase atrás vale doble.\nConsignas: llegar al fondo antes de centrar, un atacante al primer palo para arrastrar y otro llegando de frente al punto penal.',
        array['Amplitud y ataque por bandas', 'Llegada de volantes al área'], array['Centro', 'Remate']),
      ('Combinaciones con pared y tercer hombre', 'finalizacion', 'analitica', 'sin_oposicion', null,
        'Grupos de 3 + arq', 13, null, 720, null, 'media_cancha', null, null,
        E'Organización: frente al área, con maniquíes en la línea de los defensores; grupos de 3.\nDesarrollo: secuencias de pared y pase al tercer hombre, que llega de frente y remata en 2 toques. La secuencia cambia cada 4′.\nConsignas: pase al pie para jugar de primera, el tercer hombre llega en carrera, rematar en el menor tiempo posible.',
        array['Tercer hombre', 'Juego entre líneas'], array['Pase filtrado', 'Remate', 'Control orientado']),
      ('Duelos 1v1 en banda y centro', 'finalizacion', 'global', 'con_oposicion_y_puntuacion', 'tension',
        '1v1 + arq', 12, null, 600, null, 'ultimo_tercio', null, null,
        E'Organización: dos estaciones: banda (1v1 hasta la línea de fondo y centro) y frontal (1v1 de frente y remate).\nDesarrollo: el atacante recibe del entrenador y encara al defensor; si el defensor recupera, contraataca a un mini arco.\nConsignas: el atacante cambia de ritmo y de dirección; el defensor cuida el perfil y la distancia, y no se tira.',
        array['Duelos 1v1', '1v1 defensivo'], array['1v1 ofensivo', 'Remate', 'Conducción']),

      -- Pelota parada (MD-1, activación) -------------------------------
      ('Córners ofensivos: jugadas base', 'pelota_parada', 'analitica', 'con_oposicion', 'activacion',
        '11v11', 22, null, 720, null, 'area', null, null,
        E'Organización: titulares en el área rival; los suplentes defienden con la marca del próximo rival.\nDesarrollo: se repasan las 5 o 6 jugadas base (primer palo, segundo palo, en corto, al punto penal, jugada ensayada) con el código de cada una.\nConsignas: cada jugador conoce su función y su arranque, el centro según el código, ensayar desde los dos lados.',
        array['Córner ofensivo'], array['Centro', 'Juego aéreo', 'Remate']),
      ('Córner con cortinas y bloqueos sobre el arquero', 'pelota_parada', 'analitica', 'con_oposicion', 'activacion',
        '11v11', 22, null, 720, null, 'area', null, null,
        E'Organización: los titulares atacan el córner contra suplentes que defienden con la marca del próximo rival.\nDesarrollo: jugadas con cortinas (bloqueos legales que liberan al rematador) y un jugador ocupando el espacio del arquero; centro cerrado al área chica.\nConsignas: bloquear sin agarrar y sin hacer falta, el rematador arranca cuando se abre la cortina, centro con efecto hacia el arco. Es la escuela del Arsenal de Arteta.',
        array['Córner ofensivo'], array['Centro', 'Juego aéreo', 'Remate']),
      ('Córners defensivos con marca mixta', 'pelota_parada', 'analitica', 'con_oposicion', 'activacion',
        '11v11', 22, null, 720, null, 'area', null, null,
        E'Organización: nuestro once defiende el córner; los suplentes atacan con las jugadas del próximo rival.\nDesarrollo: 2 zonas fuertes en el área chica marcan en zona y el resto toma a su hombre; tras el despeje, salir juntos y presionar la segunda pelota.\nConsignas: cada uno sabe su zona o su marca, atacar la pelota, no dejar rematar libre a nadie.',
        array['Córner defensivo', 'Marca mixta'], array['Juego aéreo']),
      ('Tiros libres laterales', 'pelota_parada', 'analitica', 'con_oposicion', 'activacion',
        '11v11', 22, null, 600, null, 'tres_cuartos', null, null,
        E'Organización: tiros libres desde los costados del área, a 25 o 35 m.\nDesarrollo: se alterna ataque y defensa. En ataque, jugada de línea con desmarque en bloque; en defensa, línea alta que sale para dejar en offside.\nConsignas: arranque coordinado, centro a la espalda de la línea; en defensa la línea sale junta con la orden del capitán.',
        array['Tiro libre ofensivo', 'Tiro libre defensivo'], array['Centro', 'Juego aéreo']),
      ('Lateral largo al área y segunda pelota', 'pelota_parada', 'analitica', 'con_oposicion', 'activacion',
        '11v11', 22, null, 480, null, 'ultimo_tercio', null, null,
        E'Organización: laterales desde el último tercio con el jugador que tiene el saque largo.\nDesarrollo: lanzamiento al primer palo para peinar; el resto ataca el segundo palo y la segunda pelota en la puerta del área.\nConsignas: uno peina, dos atacan el segundo palo y dos quedan para la segunda pelota y la vigilancia.',
        array['Lateral ofensivo'], array['Juego aéreo', 'Remate']),
      ('Ensayo caminando de la pelota parada', 'pelota_parada', 'analitica', 'sin_oposicion', 'activacion',
        '11', 22, null, 900, null, 'area', null, null,
        E'Organización: en el área, los titulares con la pechera del rol que les toca. Va en MD-1.\nDesarrollo: se recorren caminando las jugadas ofensivas y defensivas del partido, cada jugador en su ubicación, y se responden las dudas. Sin esfuerzo físico.\nConsignas: que cada jugador diga su función en voz alta; repasarlo con el video de la charla técnica.',
        array['Córner ofensivo', 'Córner defensivo', 'Tiro libre ofensivo', 'Tiro libre defensivo', 'Marca mixta'], '{}'::text[]),

      -- Arqueros ---------------------------------------------------------
      ('Arqueros: salida con los pies bajo presión y juego largo', 'arqueros', 'analitica', 'con_oposicion', null,
        '2 arq + 2 presionadores', 6, 4, 180, 60, 'media_cancha', null, null,
        E'Organización: medio campo con arco; 2 arqueros, 2 receptores (centrales o entrenadores) y 2 presionadores.\nDesarrollo: el arquero recibe pases atrás con presión y decide: pase corto al central libre, a la espalda del presionador o largo hacia la banda. Se alternan perfil y pierna.\nConsignas: primer control lejos del presionador, mirar antes de recibir, juego largo tenso a la cabeza o al pecho del receptor.',
        array['Arquero como apoyo con los pies', 'Salida contra presión al hombre'], array['Pase y circulación', 'Control orientado']),

      -- Fuerza y recuperación ------------------------------------------
      ('Fuerza TI y TS por bloques', 'fuerza', 'analitica', 'sin_oposicion', 'tension',
        '3 bloques × 3 series', null, null, 1200, null, 'gimnasio', null, null,
        E'Organización: gimnasio, en grupos de 4 que rotan por 3 bloques.\nDesarrollo:\n· Bloque 1 (tren inferior): sentadilla búlgara 3 × 6 por pierna y peso muerto rumano 3 × 6.\n· Bloque 2 (tren superior): press de banca 3 × 6 y remo con mancuerna 3 × 8.\n· Bloque 3 (potencia): saltos al cajón 3 × 5 y lanzamiento de balón medicinal 3 × 6.\nConsignas: carga según el perfil de cada jugador, buena técnica y velocidad de ejecución.',
        '{}'::text[], '{}'::text[]),
      ('Recuperación MD+1: rondo suave y movilidad', 'recuperacion', 'analitica', 'con_oposicion', 'recuperacion',
        'Grupos de 6', 18, null, 1200, null, 'medidas', 20, 20,
        E'Organización: para los que no jugaron o jugaron pocos minutos, grupos de 6 en 20×20.\nDesarrollo: 10′ de rondos suaves a 2 toques y 10′ de movilidad y elongación guiada.\nConsignas: intensidad baja y prioridad al estado de cada jugador; los titulares hacen la recuperación aparte (gimnasio o pileta).',
        '{}'::text[], array['Pase y circulación'])
    ) as t(nombre, tipo, via, competitividad, orientacion, formato, jugadores, series, duracion_seg,
           pausa_seg, espacio, largo_m, ancho_m, descripcion, objetivos, contenidos)
  loop
    insert into public.tareas (
      cuerpo_tecnico_id, nombre, tipo, via, competitividad, orientacion_fisica, formato, jugadores,
      series, duracion_seg, pausa_seg, espacio, largo_m, ancho_m, descripcion
    ) values (
      v_cuerpo, r.nombre, r.tipo::public.tipo_tarea, r.via::public.via_metodologica,
      r.competitividad::public.competitividad_tarea, r.orientacion::public.orientacion_fisica,
      r.formato, r.jugadores, r.series, r.duracion_seg, r.pausa_seg,
      r.espacio::public.espacio_tarea, r.largo_m, r.ancho_m, r.descripcion
    )
    returning id into v_tarea;
    v_total := v_total + 1;

    insert into public.tareas_objetivos (tarea_id, principio_id)
      select v_tarea, p.id from public.principios_juego p
      where p.cuerpo_tecnico_id = v_cuerpo
        and lower(p.nombre) in (select lower(x) from unnest(r.objetivos) as x)
      on conflict do nothing;

    insert into public.tareas_contenidos (tarea_id, contenido_id)
      select v_tarea, c.id from public.contenidos_tecnicos c
      where c.cuerpo_tecnico_id = v_cuerpo
        and lower(c.nombre) in (select lower(x) from unnest(r.contenidos) as x)
      on conflict do nothing;
  end loop;

  return v_total;
end;
$$;
