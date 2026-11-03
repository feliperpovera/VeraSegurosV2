-- Días de mora: desde cuándo se debe la siguiente cuota sin pagar (inicio de vigencia + cuotas pagadas según forma de pago).
-- Es una estimación mientras no haya fecha límite real; si existe pago_limite, manda esa.
alter table public.poliza add column mora_desde date;
create function public.calcular_mora() returns trigger
language plpgsql set search_path = '' as $$
declare meses int; pagadas int;
begin
  if new.cartera not in ('pendiente', 'vencida', 'compromiso') then new.mora_desde := null; return new; end if;
  meses := case lower(coalesce(new.datos->'conciliacion'->>'forma_pago', new.datos->>'forma_pago', 'anual'))
    when 'mensual' then 1 when 'bimestral' then 2 when 'trimestral' then 3 when 'semestral' then 6 else 12 end;
  pagadas := coalesce(nullif(split_part(new.datos->'conciliacion'->>'cuotas', '/', 1), '')::int, 0);
  new.mora_desde := coalesce(new.pago_limite, (new.vigencia_desde + make_interval(months => meses * pagadas))::date);
  return new;
end $$;
create trigger mora before insert or update on public.poliza for each row execute function public.calcular_mora();
update public.poliza set cartera = cartera where cartera in ('pendiente', 'vencida', 'compromiso');

create or replace view public.produccion with (security_invoker = true) as
select p.id, p.aseguradora, p.ramo, p.numero, p.tipo, p.estado, p.prima_neta, p.prima_total, p.creado,
       p.vigencia_desde, p.vigencia_hasta, p.revision, p.asesor_id, p.operativo_id, p.persona_id, p.renovacion, p.cartera, p.pago_limite, p.saldo, p.origen,
       p.compromiso_fecha, p.cartera_contacto, p.cartera_fuente, p.cartera_actualizado,
       coalesce(p.comision, round(p.prima_neta * t.pct / 100)) as comision, p.mora_desde
from public.poliza p
left join public.comision_tarifa t on t.aseguradora = p.aseguradora and t.ramo = p.ramo;
