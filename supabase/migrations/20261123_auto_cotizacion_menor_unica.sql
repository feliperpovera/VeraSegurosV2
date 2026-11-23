create unique index if not exists auto_cotizacion_menor_unica on public.auto_cotizacion ((datos->>'base')) where estado = 'menor';
