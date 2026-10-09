-- =============================================================
-- Emparejamiento de marcas en la pelota quieta defensiva.
--
-- La app sugiere quién marca a quién con el índice aéreo de los dos
-- planteles; acá se guarda solo lo que el cuerpo técnico cambia a mano:
-- · rivales: los jugadores del rival a marcar al hombre (null: los sugeridos).
-- · parejas: { id del rival: id de nuestro jugador } fijadas a mano.
-- =============================================================

create table public.marcas_partido (
  partido_id     uuid primary key references public.partidos (id) on delete cascade,
  rivales        uuid[] check (rivales is null or cardinality(rivales) <= 11),
  parejas        jsonb not null default '{}' check (jsonb_typeof(parejas) = 'object'),
  actualizado_en timestamptz not null default now()
);

create trigger marcas_partido_actualizado_en
  before update on public.marcas_partido
  for each row execute function public.tocar_actualizado_en();

alter table public.marcas_partido enable row level security;

create policy "Miembros ven y editan las marcas de sus partidos"
  on public.marcas_partido for all to authenticated
  using (public.es_miembro_partido(partido_id))
  with check (public.es_miembro_partido(partido_id));
