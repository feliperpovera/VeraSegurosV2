drop index if exists public.auto_cotizacion_menor_unica;
alter table public.auto_cotizacion add constraint auto_cotizacion_pct_max check (coalesce((datos->>'pct')::int, 0) between 0 and 10);
