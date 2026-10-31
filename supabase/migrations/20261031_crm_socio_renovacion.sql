-- Comercial sin usuario (socio): aparece en producción y comisiones, pero no puede entrar al CRM ni recibe tareas.
alter table public.empleado drop constraint empleado_rol_check;
alter table public.empleado add constraint empleado_rol_check check (rol in ('gerente', 'asesor', 'comercial'));
alter table public.empleado add column codigo text unique;   -- iniciales de la base: FRV, LAC, JER…

create or replace function public.mi_empleado() returns public.empleado
language sql stable security definer set search_path = '' as $$
  select e.* from public.empleado e
  where e.email = lower(auth.jwt() ->> 'email') and e.activo and e.rol <> 'comercial'
$$;
create or replace function public.solo_empleados() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.empleado where email = lower(new.email) and activo and rol <> 'comercial') then
    raise exception 'Correo no autorizado para el CRM';
  end if;
  return new;
end $$;

update public.empleado set codigo = 'FRV' where email = 'feliperestrepo@veraseguros.com';
update public.empleado set codigo = 'LAC' where email = 'lauracastro@veraseguros.com';
update public.empleado set codigo = 'ED' where email = 'comercial@veraseguros.com';
insert into public.empleado (email, nombre, rol, codigo) values ('jer@sin-usuario.vera', 'JER (socio)', 'comercial', 'JER');

-- Renovaciones: persona natural 1 mes antes; empresarial (ramo Empresarial o tomador con NIT) 3 meses antes.
create or replace function public.tareas_renovacion() returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  with polizas as (
    select p.*, case when p.ramo = 'Empresarial' or per.tipo_doc = 'NIT' then 90 else 30 end as dias
    from public.poliza p left join public.persona per on per.id = p.persona_id
    where p.renovacion = 'pendiente' and p.tipo <> 'modificacion' and p.vigencia_hasta >= current_date
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
  where per.id = p.persona_id and p.renovacion = 'pendiente' and p.vigencia_hasta >= current_date
    and p.vigencia_hasta <= current_date + case when p.ramo = 'Empresarial' or per.tipo_doc = 'NIT' then 90 else 30 end;
  update public.poliza set renovacion = 'en_gestion'
  where persona_id is null and renovacion = 'pendiente' and vigencia_hasta between current_date and current_date + case when ramo = 'Empresarial' then 90 else 30 end;
  return n;
end $$;
