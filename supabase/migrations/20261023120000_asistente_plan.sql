-- =============================================================
-- Asistente de Claude en el plan de partido.
--
-- La Mac del analista (Claude Code, sin costo de API) lee el informe del
-- rival, el video, la previa, nuestros últimos post partidos y la
-- autoevaluación, y devuelve:
-- · puntos: claves con su evidencia (oportunidad, amenaza o ajuste),
--   que el cuerpo técnico confirma o descarta;
-- · borrador: un texto por sección del plan (incluidas las versiones
--   cortas del one sheet) y los jugadores clave del rival.
-- Al usar el borrador se copia al plan; aplicado_en avisa a la pantalla
-- que tiene que volver a cargar los textos.
-- =============================================================

alter type public.tipo_pedido_sofascore add value if not exists 'plan_asistente';

create table public.asistente_plan (
  partido_id    uuid primary key references public.partidos (id) on delete cascade,
  generado_en   timestamptz not null default now(),
  -- [{ id, tipo: oportunidad | amenaza | ajuste, momento, titulo, evidencia, fuente }]
  puntos        jsonb not null default '[]' check (jsonb_typeof(puntos) = 'array'),
  -- { claves: [...], objetivo, contexto, choque, ofensiva_ct, …, jugadores_clave: [...] }
  borrador      jsonb not null default '{}' check (jsonb_typeof(borrador) = 'object'),
  -- { id del punto: confirmado | descartado }
  validaciones  jsonb not null default '{}' check (jsonb_typeof(validaciones) = 'object'),
  -- Qué información había cuando se generó (informe, video, post partidos…)
  fuentes       jsonb not null default '{}' check (jsonb_typeof(fuentes) = 'object'),
  aplicado_en   timestamptz,
  avisos        text[] not null default '{}'
);

alter table public.asistente_plan enable row level security;

create policy "Miembros ven y editan el asistente de sus partidos"
  on public.asistente_plan for all to authenticated
  using (public.es_miembro_partido(partido_id))
  with check (public.es_miembro_partido(partido_id));
