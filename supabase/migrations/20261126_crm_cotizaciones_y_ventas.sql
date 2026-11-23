-- Aplicada 2026-11-23 como crm_repetidas_sin_fecha y crm_cotizaciones_y_ventas.
-- 1. quitar_polizas_repetidas también marca las pólizas reenviadas sin fechas (ver función en la base).
-- 2. cotizaciones_crm: la mejor oferta no incluye el seguro por kilómetro (no es prima anual), modelo 0 = sin dato,
--    y un intento fallido que la misma persona logró cotizar después ya no cuenta como "no cotizó".
-- 3. marcar_ventas: si llega la póliza nueva del mismo cliente y ramo, la oportunidad pasa sola a Expedido.
do $$
declare d text := pg_get_functiondef('public.cotizaciones_crm(date)'::regprocedure);
begin
  if position($q$c.datos->>'modelo' as modelo$q$ in d) = 0 or position($q$min((a.data->>'precio')::numeric) filter (where a.evento = 'oferta') as mejor$q$ in d) = 0 or position($q$c.whatsapp_enviado is not null as whatsapp$q$ in d) = 0 then raise exception 'cambió cotizaciones_crm'; end if;
  d := replace(d, $q$c.datos->>'modelo' as modelo$q$, $q$nullif(c.datos->>'modelo', '0') as modelo$q$);
  d := replace(d, $q$min((a.data->>'precio')::numeric) filter (where a.evento = 'oferta') as mejor$q$, $q$min((a.data->>'precio')::numeric) filter (where a.evento = 'oferta' and coalesce(a.data->>'plan', '') !~* 'kil[oó]metro') as mejor$q$);
  d := replace(d, $q$order by (a.data->>'precio')::numeric) filter (where a.evento = 'oferta'))[1] as mejor_cia$q$, $q$order by (a.data->>'precio')::numeric) filter (where a.evento = 'oferta' and coalesce(a.data->>'plan', '') !~* 'kil[oó]metro'))[1] as mejor_cia$q$);
  d := replace(d, $q$c.whatsapp_enviado is not null as whatsapp$q$, $q$exists (select 1 from public.auto_cotizacion c2 where c2.id <> c.id and c2.pdf_url is not null and c2.creado between c.creado - interval '2 days' and c.creado + interval '7 days'
        and right(regexp_replace(coalesce(c2.datos->>'tel', ''), '\D', '', 'g'), 10) = right(regexp_replace(coalesce(c.datos->>'tel', ''), '\D', '', 'g'), 10)) as reintento,
      c.whatsapp_enviado is not null as whatsapp$q$);
  execute d;
end $$;

create or replace function public.marcar_ventas()
returns integer language plpgsql security definer set search_path to '' as $function$
declare n int;
begin
  with v as (
    select distinct on (o.id) o.id, o.persona_id, p.aseguradora, p.ramo, p.numero
    from public.oportunidad o join public.poliza p on p.persona_id = o.persona_id and p.ramo = o.producto and p.tipo in ('nueva', 'traslado') and p.estado = 'vigente'
      and not coalesce(p.datos ?| array['duplicado_de','cotizacion','cambio_asesor'], false) and p.vigencia_desde between o.creado::date - 5 and o.creado::date + 90
    where o.etapa <> 'emitido' order by o.id, p.vigencia_desde
  ), u as (
    update public.oportunidad o set etapa = 'emitido', actualizado = now() from v where o.id = v.id returning o.id
  )
  insert into public.evento (persona_id, oportunidad_id, canal, texto)
  select v.persona_id, v.id, 'crm', 'Venta: llegó la póliza ' || v.aseguradora || ' ' || v.ramo || ' N.º ' || v.numero from v where v.id in (select id from u);
  get diagnostics n = row_count;
  return n;
end $function$;
revoke all on function public.marcar_ventas() from public, anon, authenticated;
select cron.schedule('crm-marcar-ventas', '25 * * * *', 'select public.marcar_ventas()');
select public.marcar_ventas();
