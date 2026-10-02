-- Tabla de jugadores de la plantilla
create table if not exists public.jugadores (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null check (char_length(trim(nombre)) >= 2),
  fecha_nac  date not null,
  posicion   text not null check (posicion in ('POR', 'DEF', 'CEN', 'DEL')),
  numero     integer check (numero between 1 and 99),
  created_at timestamptz not null default now(),
  constraint jugadores_numero_unico unique (numero)
);

-- Row Level Security: solo usuarios autenticados pueden leer y escribir
alter table public.jugadores enable row level security;

create policy "Autenticados pueden leer jugadores"
  on public.jugadores for select
  to authenticated
  using (true);

create policy "Autenticados pueden insertar jugadores"
  on public.jugadores for insert
  to authenticated
  with check (true);

create policy "Autenticados pueden actualizar jugadores"
  on public.jugadores for update
  to authenticated
  using (true)
  with check (true);

create policy "Autenticados pueden borrar jugadores"
  on public.jugadores for delete
  to authenticated
  using (true);
