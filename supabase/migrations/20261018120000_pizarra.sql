-- =============================================================
-- Pizarra de pelota quieta.
--
-- · jugadas: biblioteca del cuerpo técnico (capa permanente). Cada jugada
--   tiene tipo (ofensiva/defensiva), categoría, lado, número, seña, roles
--   ("Ejecutor", "1° palo"…) y el dibujo (jugadores por rol, rivales,
--   pelota, flechas y textos) en JSON.
-- · partido_jugadas: las jugadas elegidas para un partido y qué jugador
--   cumple cada rol. Si cambia la convocatoria, se reasigna el rol.
-- =============================================================

create type public.categoria_jugada as enum ('corner', 'falta_lateral', 'falta_frontal', 'lateral', 'otro');
create type public.lado_jugada as enum ('izquierda', 'derecha', 'ambos');

create table public.jugadas (
  id                uuid primary key default gen_random_uuid(),
  cuerpo_tecnico_id uuid not null default public.mi_cuerpo_tecnico()
                    references public.cuerpos_tecnicos (id) on delete cascade,
  tipo              public.tipo_abp not null,
  categoria         public.categoria_jugada not null,
  lado              public.lado_jugada not null default 'izquierda',
  numero            smallint check (numero between 1 and 99),
  nombre            text not null check (char_length(trim(nombre)) between 2 and 80),
  sena              text check (char_length(sena) <= 120),
  descripcion       text check (char_length(descripcion) <= 2000),
  -- [{ "id": "r1", "nombre": "Ejecutor", "corto": "EJ" }]
  roles             jsonb not null default '[]'
                    check (jsonb_typeof(roles) = 'array' and jsonb_array_length(roles) <= 15),
  -- { "elementos": [ … ] }
  diagrama          jsonb not null default '{"elementos": []}'
                    check (jsonb_typeof(diagrama) = 'object' and octet_length(diagrama::text) <= 100000),
  archivada         boolean not null default false,
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now()
);

create index jugadas_cuerpo_idx on public.jugadas (cuerpo_tecnico_id, tipo, categoria);

create trigger jugadas_actualizado_en
  before update on public.jugadas
  for each row execute function public.tocar_actualizado_en();

create table public.partido_jugadas (
  partido_id   uuid not null references public.partidos (id) on delete cascade,
  jugada_id    uuid not null references public.jugadas (id) on delete cascade,
  -- { "<id del rol>": "<id del jugador>" }
  asignaciones jsonb not null default '{}' check (jsonb_typeof(asignaciones) = 'object'),
  orden        integer not null default 0,
  primary key (partido_id, jugada_id)
);

create index partido_jugadas_jugada_idx on public.partido_jugadas (jugada_id);

alter table public.jugadas enable row level security;
alter table public.partido_jugadas enable row level security;

create policy "Miembros gestionan las jugadas"
  on public.jugadas for all to authenticated
  using (public.es_miembro(cuerpo_tecnico_id))
  with check (public.es_miembro(cuerpo_tecnico_id));

-- La jugada tiene que ser del mismo cuerpo técnico que el partido
create policy "Miembros eligen las jugadas del partido"
  on public.partido_jugadas for all to authenticated
  using (public.es_miembro_partido(partido_id))
  with check (
    public.es_miembro_partido(partido_id)
    and exists (
      select 1
      from public.jugadas j
      join public.temporadas t on t.cuerpo_tecnico_id = j.cuerpo_tecnico_id
      join public.partidos p on p.temporada_id = t.id
      where j.id = jugada_id and p.id = partido_id
    )
  );
