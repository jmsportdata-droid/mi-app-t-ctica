-- =============================================================
-- El partido como recorrido de la semana (P1).
--
-- · partidos: resultado y formación esperada del rival.
-- · partido_previa: condiciones, árbitro y contexto del rival.
-- · analisis_rival: conclusiones del video del rival por fase.
-- · escenarios_partido: plan B (ganando, perdiendo, con uno menos…).
-- · videos_vestuario: los 4 videos que se muestran a los jugadores.
-- · Formaciones nuevas: 1-3-4-3, 1-4-1-4-1 y 1-3-5-2.
-- =============================================================

alter type public.formacion add value if not exists '3-4-3';
alter type public.formacion add value if not exists '4-1-4-1';
alter type public.formacion add value if not exists '3-5-2';

alter table public.partidos
  add column goles_favor    smallint check (goles_favor between 0 and 50),
  add column goles_contra   smallint check (goles_contra between 0 and 50),
  -- Definición por penales (copas): null si no hubo
  add column penales_favor  smallint check (penales_favor between 0 and 50),
  add column penales_contra smallint check (penales_contra between 0 and 50),
  add column formacion_rival public.formacion,
  add constraint partidos_resultado_completo
    check ((goles_favor is null) = (goles_contra is null)),
  add constraint partidos_penales_completos
    check ((penales_favor is null) = (penales_contra is null));

create type public.tipo_cesped as enum ('natural', 'sintetico', 'hibrido');

create table public.partido_previa (
  partido_id            uuid primary key references public.partidos (id) on delete cascade,
  -- Condiciones
  cancha_largo          smallint check (cancha_largo between 80 and 130),
  cancha_ancho          smallint check (cancha_ancho between 50 and 100),
  cesped                public.tipo_cesped,
  estado_cancha         text check (char_length(estado_cancha) <= 300),
  clima                 text check (char_length(clima) <= 300),
  condiciones_notas     text check (char_length(condiciones_notas) <= 1000),
  -- Árbitro
  arbitro               text check (char_length(arbitro) <= 100),
  arbitro_amarillas     numeric(3, 1) check (arbitro_amarillas between 0 and 20),
  arbitro_rojas         numeric(3, 2) check (arbitro_rojas between 0 and 5),
  arbitro_penales       numeric(3, 2) check (arbitro_penales between 0 and 5),
  arbitro_notas         text check (char_length(arbitro_notas) <= 1000),
  -- Contexto del rival
  rival_racha           text check (char_length(rival_racha) <= 300),
  rival_calendario      text check (char_length(rival_calendario) <= 1000),
  rival_bajas           text check (char_length(rival_bajas) <= 1000),
  rival_dt              text check (char_length(rival_dt) <= 100),
  rival_dt_tendencias   text check (char_length(rival_dt_tendencias) <= 1000),
  rival_notas           text check (char_length(rival_notas) <= 2000),
  actualizado_en        timestamptz not null default now()
);

create trigger partido_previa_actualizado_en
  before update on public.partido_previa
  for each row execute function public.tocar_actualizado_en();

create type public.fase_analisis as enum (
  'ofensiva_inicio',
  'ofensiva_organizacion',
  'ofensiva_finalizacion',
  'defensa_bloque_alto',
  'defensa_bloque_medio',
  'defensa_bloque_bajo',
  'transicion_defensa_ataque',
  'transicion_ataque_defensa'
);

create type public.valoracion_analisis as enum ('fortaleza', 'debilidad', 'patron');

create table public.analisis_rival (
  id         uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.partidos (id) on delete cascade,
  fase       public.fase_analisis not null,
  texto      text not null check (char_length(trim(texto)) between 2 and 1000),
  valoracion public.valoracion_analisis,
  clip_url   text check (clip_url ~* '^https?://' and char_length(clip_url) <= 500),
  -- Minuto o referencia del clip ("12'", "2T 30'")
  referencia text check (char_length(referencia) <= 40),
  orden      integer not null default 0,
  creado_en  timestamptz not null default now()
);

create index analisis_rival_partido_idx on public.analisis_rival (partido_id, fase, orden);

create type public.situacion_partido as enum (
  'ganando',
  'empatando',
  'perdiendo',
  'con_uno_menos',
  'con_uno_mas',
  'otro'
);

create table public.escenarios_partido (
  id          uuid primary key default gen_random_uuid(),
  partido_id  uuid not null references public.partidos (id) on delete cascade,
  situacion   public.situacion_partido not null,
  desde_minuto smallint check (desde_minuto between 0 and 130),
  formacion   public.formacion,
  respuesta   text not null check (char_length(trim(respuesta)) between 2 and 2000),
  -- Cambios planificados: [{ "sale": uuid, "entra": uuid }]
  cambios     jsonb not null default '[]' check (jsonb_typeof(cambios) = 'array'),
  orden       integer not null default 0,
  creado_en   timestamptz not null default now()
);

create index escenarios_partido_idx on public.escenarios_partido (partido_id, orden);

create type public.tipo_video_vestuario as enum ('rival', 'pelota_quieta', 'pre_partido', 'post_partido');

create table public.videos_vestuario (
  partido_id        uuid not null references public.partidos (id) on delete cascade,
  tipo              public.tipo_video_vestuario not null,
  url               text check (url ~* '^https?://' and char_length(url) <= 500),
  duracion          text check (char_length(duracion) <= 20),
  notas             text check (char_length(notas) <= 1000),
  visible_jugadores boolean not null default false,
  actualizado_en    timestamptz not null default now(),
  primary key (partido_id, tipo)
);

create trigger videos_vestuario_actualizado_en
  before update on public.videos_vestuario
  for each row execute function public.tocar_actualizado_en();

alter table public.partido_previa enable row level security;
alter table public.analisis_rival enable row level security;
alter table public.escenarios_partido enable row level security;
alter table public.videos_vestuario enable row level security;

create policy "Miembros gestionan la previa del partido"
  on public.partido_previa for all to authenticated
  using (public.es_miembro_partido(partido_id))
  with check (public.es_miembro_partido(partido_id));

create policy "Miembros gestionan el análisis del rival"
  on public.analisis_rival for all to authenticated
  using (public.es_miembro_partido(partido_id))
  with check (public.es_miembro_partido(partido_id));

create policy "Miembros gestionan los escenarios del partido"
  on public.escenarios_partido for all to authenticated
  using (public.es_miembro_partido(partido_id))
  with check (public.es_miembro_partido(partido_id));

create policy "Miembros gestionan los videos del vestuario"
  on public.videos_vestuario for all to authenticated
  using (public.es_miembro_partido(partido_id))
  with check (public.es_miembro_partido(partido_id));

-- -------------------------------------------------------------
-- Link de jugadores: suma los videos del vestuario marcados como
-- visibles de los partidos de la semana.
-- -------------------------------------------------------------
create or replace function public.semana_publica(p_token text, p_desde date)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_temporada public.temporadas;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{32}$' or p_desde is null then
    return null;
  end if;
  select t.* into v_temporada
  from public.enlaces_jugadores e
  join public.temporadas t on t.id = e.temporada_id
  where e.token = p_token;
  if v_temporada.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'club', v_temporada.club,
    'temporada', v_temporada.etiqueta,
    'partidos', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'fecha', p.fecha) order by p.fecha)
      from public.partidos p where p.temporada_id = v_temporada.id
    ), '[]'::jsonb),
    'actividades', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'tipo', a.tipo, 'titulo', a.titulo, 'fecha', a.fecha,
        'hora_inicio', a.hora_inicio, 'hora_fin', a.hora_fin,
        'hora_citacion', a.hora_citacion, 'lugar', a.lugar, 'indicaciones', a.indicaciones
      ) order by a.fecha, a.hora_inicio nulls first, a.creado_en)
      from public.actividades a
      where a.temporada_id = v_temporada.id
        and a.visible_jugadores
        and a.fecha between p_desde and p_desde + 6
    ), '[]'::jsonb),
    'videos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'partido_id', v.partido_id, 'fecha', p.fecha, 'tipo', v.tipo,
        'url', v.url, 'duracion', v.duracion, 'notas', v.notas
      ) order by p.fecha, v.tipo)
      from public.videos_vestuario v
      join public.partidos p on p.id = v.partido_id
      where p.temporada_id = v_temporada.id
        and v.visible_jugadores
        and v.url is not null
        and p.fecha between p_desde - 3 and p_desde + 9
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.semana_publica(text, date) from public;
grant execute on function public.semana_publica(text, date) to anon, authenticated;
