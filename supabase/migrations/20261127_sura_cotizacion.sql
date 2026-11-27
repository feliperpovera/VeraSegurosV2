-- Cotizaciones y expediciones directas con la API de SURA (landing de pauta /seguros-autos-sura/).
-- Solo la función autos-sura (service role) lee y escribe: RLS activo sin políticas.
create table if not exists public.sura_cotizacion (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  ip_hash text,
  estado text not null default 'nueva', -- nueva | cotizada | sin_planes | pendiente_api | error | expedicion_enviada | expedicion_error
  datos jsonb not null,                 -- lo que escribió el cliente
  planes jsonb,                         -- planes ya limpios para la página
  respuesta jsonb,                      -- respuesta cruda de SURA (cotización)
  expedicion jsonb,                     -- solicitud y respuesta de /expedir
  creado timestamptz not null default now()
);
alter table public.sura_cotizacion enable row level security;
create index if not exists sura_cotizacion_creado on public.sura_cotizacion (creado desc);
