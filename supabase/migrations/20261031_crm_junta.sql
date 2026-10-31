-- Usuario "junta": solo lectura de Producción, Financiero, Renovaciones y Cartera. No ve clientes ni tareas,
-- no envía, no cotiza, no sube pólizas (las funciones solo aceptan correos de la tabla empleado).
create table public.lector (
  id uuid primary key default gen_random_uuid(),
  usuario text not null unique,           -- lo que escribe al entrar (ej. junta)
  email text not null unique,             -- correo interno de Supabase Auth, no es un buzón
  nombre text not null,
  user_id uuid unique,                    -- usuario de Auth, lo crea la función cuentas
  activo boolean not null default true
);
alter table public.lector enable row level security;
revoke all on public.lector from anon, authenticated;
insert into public.lector (usuario, email, nombre) values ('junta', 'junta@junta.veraseguros.com', 'Junta directiva');

create or replace function public.mi_empleado() returns public.empleado
language sql stable security definer set search_path = '' as $$
  select e.* from public.empleado e
  where e.email = lower(auth.jwt() ->> 'email') and e.activo and e.rol <> 'comercial'
  union all
  select l.id, l.email, l.nombre, 'junta', true, null from public.lector l
  where l.email = lower(auth.jwt() ->> 'email') and l.activo
  limit 1
$$;
-- Trabaja en el CRM (escribe): acceso total o limitado. Junta solo lee.
create or replace function public.es_empleado() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((public.mi_empleado()).rol in ('gerente', 'asesor'), false)
$$;
create function public.es_lector() returns boolean
language sql stable security definer set search_path = '' as $$
  select (public.mi_empleado()).id is not null
$$;
revoke execute on function public.es_lector from public, anon;
grant execute on function public.es_lector to authenticated;

create or replace function public.solo_empleados() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.empleado where email = lower(new.email) and activo and rol <> 'comercial')
     and not exists (select 1 from public.lector where email = lower(new.email) and activo) then
    raise exception 'Correo no autorizado para el CRM';
  end if;
  return new;
end $$;

-- Lo que junta puede leer: pólizas (producción, renovaciones, cartera), finanzas, equipo y comisiones.
drop policy leer on public.poliza;      create policy leer on public.poliza for select to authenticated using (public.es_lector());
drop policy leer on public.empleado;    create policy leer on public.empleado for select to authenticated using (public.es_lector());
drop policy leer on public.comision_tarifa; create policy leer on public.comision_tarifa for select to authenticated using (public.es_lector());
drop policy leer on public.oportunidad; create policy leer on public.oportunidad for select to authenticated using (public.es_lector());
-- Finanzas: acceso total (política gerente) y junta; los de acceso limitado no.
create policy junta on public.finanzas_mes for select to authenticated using ((public.mi_empleado()).rol = 'junta');
