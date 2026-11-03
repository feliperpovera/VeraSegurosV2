-- Cambio de compañía (traslado): el cliente cancela o deja vencer su póliza en una aseguradora y la expide en otra
-- (mismo cliente y ramo; misma placa cuando se conoce). La nueva no es negocio nuevo: tipo = 'traslado'.
alter table public.poliza drop constraint poliza_tipo_check;
alter table public.poliza add constraint poliza_tipo_check check (tipo in ('nueva', 'renovacion', 'modificacion', 'traslado'));
alter table public.poliza drop constraint poliza_renovacion_check;
alter table public.poliza add constraint poliza_renovacion_check check (renovacion in ('pendiente', 'en_gestion', 'renovada', 'no_renueva', 'trasladada'));

create function public.detectar_traslados() returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  with par as (
    select distinct on (b.id) b.id nueva, a.id vieja
    from public.poliza a
    join public.poliza b on b.persona_id = a.persona_id and b.ramo = a.ramo and b.aseguradora <> a.aseguradora
      and b.vigencia_desde >= a.vigencia_desde and b.tipo = 'nueva'
    where a.persona_id is not null and a.tipo <> 'modificacion' and a.renovacion not in ('renovada', 'trasladada')
      and a.ramo not in ('SOAT', 'ARL')
      -- Como Data Finanzas: la anterior quedó cancelada con la misma fecha de inicio, o la nueva arranca cuando vencía la anterior (±15 días).
      and ((a.estado = 'cancelada' and abs(a.vigencia_desde - b.vigencia_desde) <= 15)
           or abs(a.vigencia_hasta - b.vigencia_desde) <= 15 or b.datos->>'tipo_operacion' = 'Traslado')
      and (a.datos->>'placa' is null or b.datos->>'placa' is null or upper(a.datos->>'placa') = upper(b.datos->>'placa'))
      and not exists (select 1 from public.poliza x where x.datos->>'traslado_de' = a.id::text)
    order by b.id, abs(coalesce(a.vigencia_hasta, b.vigencia_desde) - b.vigencia_desde)
  ), u as (
    update public.poliza b set tipo = 'traslado', datos = coalesce(b.datos, '{}'::jsonb) || jsonb_build_object('traslado_de', par.vieja)
    from par where b.id = par.nueva returning par.vieja, par.nueva
  )
  update public.poliza a set renovacion = 'trasladada', renovada_por = u.nueva from u where a.id = u.vieja;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.detectar_traslados from public, anon, authenticated;
select cron.schedule('crm-traslados', '10 11 * * *', 'select public.detectar_traslados()'); -- 6:10 a.m. Bogotá
