-- =============================================================
-- Migración 002: fotos de jugadores + equipos rivales
-- Ejecutar en Supabase → SQL Editor después de schema.sql
-- =============================================================

-- 1. Foto de jugador ------------------------------------------------
alter table public.jugadores
  add column if not exists foto_url text;

-- 2. Tabla de equipos rivales --------------------------------------
create table if not exists public.equipos (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null check (char_length(trim(nombre)) >= 2),
  escudo_url text,
  liga       text,
  estadio    text,
  created_at timestamptz not null default now()
);

-- Nombre único sin distinguir mayúsculas
create unique index if not exists equipos_nombre_unico
  on public.equipos (lower(nombre));

alter table public.equipos enable row level security;

create policy "Autenticados pueden leer equipos"
  on public.equipos for select to authenticated using (true);

create policy "Autenticados pueden insertar equipos"
  on public.equipos for insert to authenticated with check (true);

create policy "Autenticados pueden actualizar equipos"
  on public.equipos for update to authenticated using (true) with check (true);

create policy "Autenticados pueden borrar equipos"
  on public.equipos for delete to authenticated using (true);

-- 3. Buckets de Storage (públicos, PNG/JPG, máx. 2 MB) -------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('player-photos', 'player-photos', true, 2097152, array['image/png', 'image/jpeg']),
  ('team-logos',    'team-logos',    true, 2097152, array['image/png', 'image/jpeg'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 4. Permisos de Storage --------------------------------------------
-- La lectura pública la da el bucket público (URL /object/public/...).
-- Subir, listar y borrar solo para usuarios autenticados.
create policy "Autenticados leen imagenes de la app"
  on storage.objects for select to authenticated
  using (bucket_id in ('player-photos', 'team-logos'));

create policy "Autenticados suben imagenes de la app"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('player-photos', 'team-logos'));

create policy "Autenticados actualizan imagenes de la app"
  on storage.objects for update to authenticated
  using (bucket_id in ('player-photos', 'team-logos'));

create policy "Autenticados borran imagenes de la app"
  on storage.objects for delete to authenticated
  using (bucket_id in ('player-photos', 'team-logos'));
