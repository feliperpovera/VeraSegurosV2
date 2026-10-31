-- CRM fase 1: roles (solo gerente escribe pólizas) y cada cotización de autos → cliente + oportunidad + historial + tarea.

drop policy equipo on public.poliza;
create policy leer on public.poliza for select to authenticated using (public.es_empleado());
create policy gerente on public.poliza for all to authenticated using (public.es_gerente()) with check (public.es_gerente());

-- Une una cotización de autos al CRM. Nunca falla: un error aquí no puede romper el cotizador.
create function public.crm_desde_auto(c public.auto_cotizacion) returns void
language plpgsql security definer set search_path = '' as $$
declare
  d jsonb := c.datos;
  tel text := right(regexp_replace(coalesce(d->>'tel', ''), '\D', '', 'g'), 10);
  asesor uuid;
  p uuid;
  o uuid;
begin
  if tel !~ '^3\d{9}$' then return; end if;
  select id into asesor from public.empleado where email = coalesce(d->>'empleado', 'comercial@veraseguros.com') and activo;

  select id into p from public.persona where telefono = tel or (d->>'doc' <> '' and cedula = d->>'doc') order by (telefono = tel) desc limit 1;
  if p is null then
    insert into public.persona (nombre, cedula, telefono, email, asesor_id)
    values (initcap(trim(concat_ws(' ', d->>'nombre', d->>'apellido'))), nullif(d->>'doc', ''), tel, nullif(d->>'email', ''), asesor)
    returning id into p;
  else
    update public.persona set cedula = coalesce(cedula, nullif(d->>'doc', '')), email = coalesce(email, nullif(d->>'email', '')),
      asesor_id = coalesce(asesor_id, asesor) where id = p;
  end if;

  select id into o from public.oportunidad where persona_id = p and producto = 'Autos' and etapa not in ('emitido', 'perdido') limit 1;
  if o is null then
    insert into public.oportunidad (persona_id, producto, origen, etapa, asesor_id, creado)
    values (p, 'Autos', case when d ? 'empleado' then 'crm' else 'cotizador web' end, case when c.estado = 'aceptada' then 'cotizado' else 'nuevo' end, asesor, c.creado)
    returning id into o;
  elsif c.estado = 'aceptada' then
    update public.oportunidad set etapa = 'cotizado', actualizado = now() where id = o and etapa in ('nuevo', 'contactado');
  end if;

  insert into public.evento (persona_id, oportunidad_id, canal, texto, enlace, creado)
  values (p, o, case when d ? 'empleado' then 'crm' else 'web' end,
    'Cotizó auto ' || coalesce(nullif(d->>'placa', ''), '0 km') || case when c.estado = 'aceptada' then '' else ' (no se pudo cotizar en línea)' end,
    'https://veraseguros.com/seguros/auto/?ver=' || c.id || '.' || c.token || '#cotizador', c.creado);

  if asesor is not null and not exists (select 1 from public.tarea where oportunidad_id = o and cerrada_at is null) then
    insert into public.tarea (persona_id, oportunidad_id, asignada_a, titulo, vence)
    values (p, o, asesor, 'Llamar: cotizó auto ' || coalesce(nullif(d->>'placa', ''), '0 km'), (c.creado at time zone 'America/Bogota')::date);
  end if;
exception when others then
  raise warning 'crm_desde_auto %: %', c.id, sqlerrm;
end $$;
revoke execute on function public.crm_desde_auto from public, anon, authenticated;

create function public.trg_auto_crm() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.estado = 'enviada' and new.estado in ('aceptada', 'rechazada') then perform public.crm_desde_auto(new); end if;
  return new;
end $$;
revoke execute on function public.trg_auto_crm from public, anon, authenticated;
create trigger crm after update of estado on public.auto_cotizacion for each row execute function public.trg_auto_crm();

-- Histórico: las cotizaciones que ya existen (las tareas viejas quedan cerradas para no llenar "Mi día").
select public.crm_desde_auto(c) from public.auto_cotizacion c where estado in ('aceptada', 'rechazada') order by creado;
update public.tarea set cerrada_at = now(), resultado = 'hecho' where cerrada_at is null and creado > now() - interval '1 minute' and vence < current_date - 1;
