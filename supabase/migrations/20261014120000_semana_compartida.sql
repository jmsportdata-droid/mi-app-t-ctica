-- =============================================================
-- Semana compartida con los jugadores.
--
-- · enlaces_jugadores: un link secreto por temporada para ver la semana
--   sin usuario. Cualquier miembro lo crea o lo regenera (el viejo deja
--   de andar).
-- · semana_publica(): lo que ve el jugador con ese link: solo las
--   actividades marcadas como visibles, sin notas internas ni sesiones.
-- =============================================================

create table public.enlaces_jugadores (
  temporada_id uuid primary key references public.temporadas (id) on delete cascade,
  token        text not null unique default replace(gen_random_uuid()::text, '-', '')
               check (token ~ '^[0-9a-f]{32}$'),
  creado_en    timestamptz not null default now()
);

alter table public.enlaces_jugadores enable row level security;

create policy "Miembros gestionan el link de jugadores"
  on public.enlaces_jugadores for all to authenticated
  using (public.es_miembro_temporada(temporada_id))
  with check (public.es_miembro_temporada(temporada_id));

-- Crea el link o lo regenera. Devuelve el token nuevo.
create function public.regenerar_enlace_jugadores(p_temporada uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_token text;
begin
  if not public.es_miembro_temporada(p_temporada) then
    raise exception 'Temporada no válida' using errcode = '42501';
  end if;
  insert into public.enlaces_jugadores (temporada_id) values (p_temporada)
  on conflict (temporada_id) do update
    set token = replace(gen_random_uuid()::text, '-', ''), creado_en = now()
  returning token into v_token;
  return v_token;
end;
$$;

-- Semana de 7 días desde p_desde para quien tiene el link. security definer:
-- el visitante no tiene sesión; el token es la credencial y solo se devuelve
-- lo que ya se comparte con los jugadores.
create function public.semana_publica(p_token text, p_desde date)
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
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.semana_publica(text, date) from public;
grant execute on function public.semana_publica(text, date) to anon, authenticated;
