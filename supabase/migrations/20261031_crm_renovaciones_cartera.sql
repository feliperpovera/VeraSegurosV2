-- Pilares: renovaciones (pólizas por vencer) y cartera (primas por cobrar).
alter table public.poliza
  add column renovacion text not null default 'pendiente' check (renovacion in ('pendiente','en_gestion','renovada','no_renueva')),
  add column renovada_por uuid references public.poliza on delete set null,
  add column cartera text not null default 'sin_dato' check (cartera in ('sin_dato','al_dia','pendiente','vencida','cancelada')),
  add column pago_limite date,
  add column saldo numeric(14,0),
  add column origen text not null default 'caratula';  -- caratula (correo), manual (subida en el CRM), base (importación)
create index on public.poliza (vigencia_hasta);

-- Una renovación (misma aseguradora y número, vigencia posterior) marca la anterior como renovada.
create function public.marcar_renovada() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.poliza set renovacion = 'renovada', renovada_por = new.id
  where aseguradora = new.aseguradora and numero = new.numero and id <> new.id
    and vigencia_hasta is not null and new.vigencia_desde is not null and vigencia_hasta <= new.vigencia_desde + 5
    and renovacion <> 'renovada';
  return new;
end $$;
revoke execute on function public.marcar_renovada from public, anon, authenticated;
create trigger renovada after insert on public.poliza for each row execute function public.marcar_renovada();

-- Cada mañana: tarea "Renovar" 45 días antes del vencimiento para el asesor del cliente (o el primer gerente).
create function public.tareas_renovacion() returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  insert into public.tarea (persona_id, asignada_a, titulo, vence)
  select p.persona_id,
    coalesce(p.asesor_id, (select id from public.empleado where rol = 'gerente' and activo order by nombre limit 1)),
    'Renovar ' || p.aseguradora || ' ' || p.ramo || ' N.º ' || p.numero || ' (vence ' || to_char(p.vigencia_hasta, 'DD/MM/YYYY') || ')',
    greatest(current_date, p.vigencia_hasta - 30)
  from public.poliza p
  where p.vigencia_hasta between current_date and current_date + 45
    and p.renovacion = 'pendiente' and p.tipo <> 'modificacion'
    and not exists (select 1 from public.tarea t where t.titulo like 'Renovar % N.º ' || p.numero || ' %' and t.creado > now() - interval '90 days');
  get diagnostics n = row_count;
  update public.poliza set renovacion = 'en_gestion' where vigencia_hasta between current_date and current_date + 45 and renovacion = 'pendiente';
  return n;
end $$;
revoke execute on function public.tareas_renovacion from public, anon, authenticated;
select cron.schedule('crm-renovaciones', '0 11 * * *', 'select public.tareas_renovacion()'); -- 6 a.m. Bogotá

drop view public.produccion;
create view public.produccion with (security_invoker = true) as
select p.id, p.aseguradora, p.ramo, p.numero, p.tipo, p.prima_neta, p.prima_total, p.creado,
       p.vigencia_desde, p.vigencia_hasta, p.revision, p.asesor_id, p.persona_id, p.renovacion, p.cartera, p.pago_limite, p.saldo, p.origen,
       coalesce(p.comision, round(p.prima_neta * t.pct / 100)) as comision
from public.poliza p
left join public.comision_tarifa t on t.aseguradora = p.aseguradora and t.ramo = p.ramo;
revoke all on public.produccion from anon;

-- Acceso limitado puede actualizar el estado de renovación y cartera (no la póliza en sí).
create function public.gestionar_poliza(p_id uuid, p_renovacion text, p_cartera text, p_pago_limite date, p_saldo numeric) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_empleado() then raise exception 'Sin acceso'; end if;
  update public.poliza set renovacion = coalesce(p_renovacion, renovacion), cartera = coalesce(p_cartera, cartera),
    pago_limite = p_pago_limite, saldo = p_saldo where id = p_id;
end $$;
revoke execute on function public.gestionar_poliza from public, anon;
grant execute on function public.gestionar_poliza to authenticated;

-- Clientes que pidieron no recibir mensajes (etiquetas unsuscribed / no_marketing de Woztell): el CRM no les envía plantillas.
alter table public.persona add column no_contactar boolean not null default false;
