-- Aplicada 2026-11-25 como correo_caida_lista. Correo de recuperación de Felipe a clientes de Estrategia Digital sin ningún seguro con Vera.
-- La lista (public.correo_caida) se llena una vez y la función correo-caida solo escribe a esas filas.
create table if not exists public.correo_caida (
  id uuid primary key default gen_random_uuid(), persona_id uuid not null unique references public.persona(id) on delete cascade, email text not null, nombre text not null, seguro text not null, varios boolean not null default false,
  token text not null default replace(gen_random_uuid()::text, '-', ''), omitir text, enviado timestamptz, error text, baja timestamptz, creado timestamptz not null default now());
alter table public.correo_caida enable row level security;
revoke all on public.correo_caida from anon, authenticated;
