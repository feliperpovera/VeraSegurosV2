-- Revisión total del CRM (aplicada 2026-11-23 como crm_revision_total_23nov).
-- 1. La columna duplicado de produccion también marca las cotizaciones: no se ven en la ficha del cliente.
do $$
declare d text := pg_get_viewdef('public.produccion'::regclass);
        a text := $q$COALESCE((p.datos ? 'duplicado_de'::text), false) AS duplicado$q$;
begin
  if position(a in d) = 0 then raise exception 'no encontré duplicado'; end if;
  execute 'create or replace view public.produccion with (security_invoker = true) as ' || replace(d, a, $q$COALESCE(((p.datos ? 'duplicado_de'::text) OR (p.datos ? 'cotizacion'::text)), false) AS duplicado$q$);
end $$;

-- 2. Tareas: no se crean para duplicados, cotizaciones ni pólizas no vigentes, y se cierran solas cuando ya se resolvieron.
create or replace function public.tareas_renovacion()
returns integer language plpgsql security definer set search_path to '' as $function$
declare n int;
begin
  update public.tarea t set cerrada_at = now(), resultado = coalesce(t.resultado, case when r.pierde then 'perdido' else 'hecho' end)
  from (
    select x.id, bool_and(p.renovacion = 'no_renueva') as pierde
    from public.tarea x join public.poliza p on p.persona_id is not distinct from x.persona_id
      and strpos(x.titulo, ' N.º ' || p.numero || ' (vence ' || to_char(p.vigencia_hasta, 'DD/MM/YYYY') || ')') > 0
    where x.cerrada_at is null and x.titulo like 'Renovar %'
    group by x.id
    having bool_and(p.renovacion in ('renovada','trasladada','no_renueva') or p.estado <> 'vigente' or coalesce(p.datos ?| array['duplicado_de','cotizacion','cambio_asesor'], false))
  ) r where r.id = t.id;
  update public.tarea t set cerrada_at = now(), resultado = coalesce(t.resultado, case o.etapa when 'emitido' then 'vendido' else 'perdido' end)
  from public.oportunidad o where o.id = t.oportunidad_id and t.cerrada_at is null and o.etapa in ('emitido', 'perdido');

  with polizas as (
    select p.*, case when p.ramo = 'Empresarial' or per.tipo_doc = 'NIT' then 90 else 30 end as dias
    from public.poliza p left join public.persona per on per.id = p.persona_id
    where p.renovacion = 'pendiente' and p.tipo <> 'modificacion' and p.estado = 'vigente' and p.vigencia_hasta >= current_date
      and not coalesce(p.datos ?| array['duplicado_de','cotizacion','cambio_asesor'], false)
  ), toca as (select * from polizas where vigencia_hasta <= current_date + dias)
  insert into public.tarea (persona_id, asignada_a, titulo, vence)
  select t.persona_id,
    coalesce((select id from public.empleado where id = t.asesor_id and rol <> 'comercial' and activo),
             (select id from public.empleado where rol = 'gerente' and activo order by nombre limit 1)),
    'Renovar ' || t.aseguradora || ' ' || t.ramo || ' N.º ' || t.numero || ' (vence ' || to_char(t.vigencia_hasta, 'DD/MM/YYYY') || ')',
    current_date
  from toca t
  where not exists (select 1 from public.tarea x where x.titulo like 'Renovar % N.º ' || t.numero || ' %' and x.creado > now() - interval '120 days');
  get diagnostics n = row_count;
  update public.poliza p set renovacion = 'en_gestion'
  from public.persona per
  where per.id = p.persona_id and p.renovacion = 'pendiente' and p.estado = 'vigente' and p.vigencia_hasta >= current_date
    and p.vigencia_hasta <= current_date + case when p.ramo = 'Empresarial' or per.tipo_doc = 'NIT' then 90 else 30 end;
  update public.poliza set renovacion = 'en_gestion'
  where persona_id is null and renovacion = 'pendiente' and estado = 'vigente' and vigencia_hasta between current_date and current_date + case when ramo = 'Empresarial' then 90 else 30 end;
  return n;
end $function$;

-- 3. Al guardar una póliza se normalizan compañía y ramo, y una prima negativa queda como modificación (devolución).
create or replace function public.normalizar_poliza()
returns trigger language plpgsql set search_path to '' as $function$
begin
  new.aseguradora := case lower(trim(new.aseguradora)) when 'bolivar' then 'Bolívar' when 'seguros bolivar' then 'Bolívar' when 'seguros bolívar' then 'Bolívar' when 'mapfre' then 'Mapfre' when 'sura' then 'SURA' else trim(new.aseguradora) end;
  new.ramo := case lower(trim(new.ramo)) when 'rc mascotas' then 'Responsabilidad civil' when 'autos colectivos' then 'Autos' else trim(new.ramo) end;
  if new.prima_neta < 0 and new.tipo <> 'modificacion' then
    new.tipo := 'modificacion';
    new.datos := coalesce(new.datos, '{}'::jsonb) || jsonb_build_object('devolucion', true);
  end if;
  return new;
end $function$;
drop trigger if exists normalizar on public.poliza;
create trigger normalizar before insert or update of aseguradora, ramo, prima_neta on public.poliza for each row execute function public.normalizar_poliza();

-- 4. Cotizaciones de autos para el CRM (solo empleados; sin datos técnicos ni respuestas crudas de las aseguradoras).
create or replace function public.cotizaciones_crm(p_desde date default (current_date - 60))
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
begin
  if not public.es_empleado() then raise exception 'Sin acceso'; end if;
  return coalesce((select jsonb_agg(to_jsonb(q) order by q.creado desc) from (
    select c.id, c.creado, c.estado, initcap(trim(concat_ws(' ', c.datos->>'nombre', c.datos->>'apellido'))) as nombre,
      nullif(c.datos->>'placa', '') as placa, coalesce((c.datos->>'ceroKm') in ('true','si','1'), false) as cero_km, c.datos->>'modelo' as modelo,
      right(regexp_replace(coalesce(c.datos->>'tel', ''), '\D', '', 'g'), 10) as tel, c.datos->>'email' as email,
      c.datos ? 'empleado' as interna,
      per.id as persona_id, o.id as oportunidad_id, o.etapa, coalesce(o.asesor_id, per.asesor_id) as asesor_id,
      f.ofertas, f.errores, f.mejor, f.mejor_cia, f.sin_acceso,
      c.pdf_url as pdf, 'https://veraseguros.com/seguros/auto/?ver=' || c.id || '.' || c.token || '#cotizador' as enlace,
      case when f.ofertas = 0 and c.pdf_url is null then coalesce(c.respuesta->>'message', c.respuesta#>>'{data,message}', c.respuesta#>>'{data,data,message}', 'Sin respuesta del cotizador') end as motivo,
      (select e.estado from public.auto_expedicion e where e.cotizacion_id = c.id order by e.creado desc limit 1) as expedicion,
      c.whatsapp_enviado is not null as whatsapp, c.correo_cliente is not null as correo
    from public.auto_cotizacion c
    left join lateral (select p.id, p.asesor_id from public.persona p
      where p.telefono = right(regexp_replace(coalesce(c.datos->>'tel', ''), '\D', '', 'g'), 10) or (c.datos->>'doc' <> '' and p.cedula = c.datos->>'doc')
      order by (p.telefono = right(regexp_replace(coalesce(c.datos->>'tel', ''), '\D', '', 'g'), 10)) desc nulls last limit 1) per on true
    left join lateral (select x.id, x.etapa, x.asesor_id from public.oportunidad x where x.persona_id = per.id and x.producto = 'Autos' order by x.creado desc limit 1) o on true
    left join lateral (select count(*) filter (where a.evento = 'oferta') as ofertas, count(*) filter (where a.evento = 'error') as errores,
        min((a.data->>'precio')::numeric) filter (where a.evento = 'oferta') as mejor,
        (array_agg(a.data->>'aseguradora' order by (a.data->>'precio')::numeric) filter (where a.evento = 'oferta'))[1] as mejor_cia,
        array_agg(distinct a.data->>'aseguradora') filter (where a.evento = 'error' and a.data->>'mensaje' ~* 'token|iniciar sesi') as sin_acceso
      from public.auto_oferta a where a.cotizacion_id = c.id) f on true
    where c.creado >= p_desde and c.estado <> 'prueba'
  ) q), '[]'::jsonb);
end $function$;

create or replace function public.cotizacion_detalle(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
begin
  if not public.es_empleado() then raise exception 'Sin acceso'; end if;
  return (select jsonb_build_object(
    'datos', jsonb_build_object('modelo', c.datos->>'modelo', 'ciudad', c.datos->>'ciudad', 'fasecolda', c.datos->>'fasecolda', 'genero', c.datos->>'genero', 'nac', c.datos->>'nac', 'doc', c.datos->>'doc', 'email', c.datos->>'email'),
    'ofertas', coalesce((select jsonb_agg(jsonb_build_object('aseguradora', a.data->>'aseguradora', 'plan', a.data->>'plan', 'precio', (a.data->>'precio')::numeric, 'pdf', nullif(a.data->>'pdf', ''), 'recomendada', coalesce((a.data->>'recomendada')::boolean, false)) order by (a.data->>'precio')::numeric)
      from public.auto_oferta a where a.cotizacion_id = c.id and a.evento = 'oferta'), '[]'::jsonb),
    'errores', coalesce((select jsonb_agg(distinct jsonb_build_object('aseguradora', a.data->>'aseguradora', 'mensaje', a.data->>'mensaje')) from public.auto_oferta a where a.cotizacion_id = c.id and a.evento = 'error'), '[]'::jsonb))
  from public.auto_cotizacion c where c.id = p_id);
end $function$;
revoke all on function public.cotizaciones_crm(date) from public, anon;
revoke all on function public.cotizacion_detalle(uuid) from public, anon;
grant execute on function public.cotizaciones_crm(date) to authenticated;
grant execute on function public.cotizacion_detalle(uuid) to authenticated;

select public.tareas_renovacion();
