-- =============================================================
-- Rendimiento: nota del cuerpo técnico por jugador y partido.
--
-- Va aparte de estadisticas_jugador_partido (que se reescribe cada vez
-- que se traen los datos de la fuente) para que nunca se pise. En
-- Rendimiento se compara con la nota automática (Sofascore o Wyscout).
-- =============================================================

create table public.valoraciones_jugador (
  partido_id     uuid not null references public.partidos (id) on delete cascade,
  jugador_id     uuid not null references public.jugadores (id) on delete cascade,
  nota           numeric(3, 1) not null check (nota between 1 and 10),
  comentario     text check (char_length(comentario) <= 300),
  actualizado_en timestamptz not null default now(),
  primary key (partido_id, jugador_id)
);

create index valoraciones_jugador_jugador_idx on public.valoraciones_jugador (jugador_id);

create trigger valoraciones_jugador_actualizado_en
  before update on public.valoraciones_jugador
  for each row execute function public.tocar_actualizado_en();

alter table public.valoraciones_jugador enable row level security;

-- El jugador tiene que ser de la misma temporada que el partido
create policy "Miembros valoran a sus jugadores"
  on public.valoraciones_jugador for all to authenticated
  using (public.es_miembro_partido(partido_id))
  with check (
    public.es_miembro_partido(partido_id)
    and exists (
      select 1 from public.jugadores j
      join public.partidos p on p.temporada_id = j.temporada_id
      where j.id = jugador_id and p.id = partido_id
    )
  );
