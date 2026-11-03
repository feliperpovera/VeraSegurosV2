-- Cartera desde la conciliación de Data Finanzas (Dataseguros Comisiones → Conciliación): por póliza y vigencia,
-- cuotas pagadas vs. totales y prima pagada vs. esperada. Pagado → pagada; Cartera / En proceso → por cobrar;
-- Revisar (la aseguradora no ha pagado lo esperado) → vencida. Pendiente futuro y fuera de cobertura no cambian el estado.
create function public.conciliar_cartera(filas jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb; pid uuid; num text; vig date; est text; n_ok int := 0; sin jsonb := '[]'::jsonb;
begin
  if not public.es_gerente() then raise exception 'Solo acceso total puede importar'; end if;
  for r in select * from jsonb_array_elements(filas) loop
    num := ltrim(regexp_replace(coalesce(r->>'numero', ''), '\D', '', 'g'), '0');
    if num = '' then continue; end if;
    vig := case when r->>'vigencia' ~ '^\d{4}-\d{2}-\d{2}$' then (r->>'vigencia')::date end;
    select id into pid from public.poliza where ltrim(regexp_replace(numero, '\D', '', 'g'), '0') = num and tipo <> 'modificacion'
      order by (vigencia_desde = vig) desc nulls last, vigencia_hasta desc nulls last limit 1;
    if pid is null then sin := sin || jsonb_build_array(r->>'numero'); continue; end if;
    est := case r->>'estado' when 'Pagado' then 'al_dia' when 'Cartera' then 'pendiente' when 'En Proceso' then 'pendiente' when 'Revisar' then 'vencida' end;
    update public.poliza set
      cartera = case when cartera = 'compromiso' and est in ('pendiente', 'vencida') then cartera else coalesce(est, cartera) end,
      saldo = greatest(coalesce((r->>'prima_esperada')::numeric, 0) - coalesce((r->>'prima_pagada')::numeric, 0), 0),
      cartera_fuente = 'Data Finanzas · conciliación', cartera_actualizado = now(),
      datos = coalesce(datos, '{}'::jsonb) || jsonb_build_object('conciliacion', jsonb_build_object('estado', r->>'estado',
        'cuotas', (r->>'cuotas_pagadas') || '/' || (r->>'cuotas_total'), 'prima_pagada', (r->>'prima_pagada')::numeric,
        'prima_esperada', (r->>'prima_esperada')::numeric, 'comision_pagada', (r->>'comision_pagada')::numeric, 'forma_pago', r->>'forma_pago'))
    where id = pid;
    n_ok := n_ok + 1;
  end loop;
  return jsonb_build_object('unidas', n_ok, 'sin_unir', sin);
end $$;
revoke execute on function public.conciliar_cartera from public, anon;
grant execute on function public.conciliar_cartera to authenticated;
