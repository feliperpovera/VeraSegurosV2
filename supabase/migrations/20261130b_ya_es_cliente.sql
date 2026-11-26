-- ¿Ya tomó el seguro? Cruza la cotización con el CRM (y las pólizas leídas del correo, que quedan en poliza) antes de cualquier correo de seguimiento.
-- true si: no_contactar, póliza creada desde que cotizó, oportunidad emitida, o la placa ya tiene póliza vigente con Vera.
create or replace function public.ya_es_cliente(p_tel text, p_email text, p_cedula text, p_placa text, p_desde timestamptz) returns boolean
language sql stable security definer set search_path = public as $$
  with p as (select id, no_contactar from persona
    where (length(coalesce(p_tel, '')) = 10 and right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 10) = p_tel)
       or (coalesce(p_email, '') like '%@%' and lower(email) = lower(p_email))
       or (coalesce(p_cedula, '') ~ '^\d{5,12}$' and cedula = p_cedula))
  select exists (select 1 from p where no_contactar)
      or exists (select 1 from poliza where persona_id in (select id from p) and creado >= p_desde)
      or exists (select 1 from oportunidad where persona_id in (select id from p) and etapa = 'emitido')
      or (length(coalesce(p_placa, '')) >= 5 and exists (select 1 from poliza where upper(datos->>'placa') = upper(p_placa) and (creado >= p_desde or vigencia_hasta >= current_date)))
$$;
revoke all on function public.ya_es_cliente(text, text, text, text, timestamptz) from public, anon, authenticated;
