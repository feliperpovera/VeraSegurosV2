-- CRM: seguridad.
-- 1. Solo los correos activos en public.empleado pueden crear usuario (el enlace mágico a otro correo falla).
-- 2. Borrar solo lo hace acceso total; el historial (evento) no se edita ni se borra.

create function public.solo_empleados() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.empleado where email = lower(new.email) and activo) then
    raise exception 'Correo no autorizado para el CRM';
  end if;
  return new;
end $$;
revoke execute on function public.solo_empleados from public, anon, authenticated;
create trigger solo_empleados before insert on auth.users for each row execute function public.solo_empleados();

drop policy equipo on public.persona;
drop policy equipo on public.oportunidad;
drop policy equipo on public.evento;
drop policy equipo on public.tarea;
create policy leer on public.persona for select to authenticated using (public.es_empleado());
create policy crear on public.persona for insert to authenticated with check (public.es_empleado());
create policy editar on public.persona for update to authenticated using (public.es_empleado()) with check (public.es_empleado());
create policy borrar on public.persona for delete to authenticated using (public.es_gerente());
create policy leer on public.oportunidad for select to authenticated using (public.es_empleado());
create policy crear on public.oportunidad for insert to authenticated with check (public.es_empleado());
create policy editar on public.oportunidad for update to authenticated using (public.es_empleado()) with check (public.es_empleado());
create policy borrar on public.oportunidad for delete to authenticated using (public.es_gerente());
create policy leer on public.evento for select to authenticated using (public.es_empleado());
-- Cada quien firma lo que escribe: no se puede registrar a nombre de otro.
create policy crear on public.evento for insert to authenticated
  with check (public.es_empleado() and (empleado_id is null or empleado_id = (public.mi_empleado()).id));
create policy leer on public.tarea for select to authenticated using (public.es_empleado());
create policy crear on public.tarea for insert to authenticated with check (public.es_empleado());
create policy editar on public.tarea for update to authenticated using (public.es_empleado()) with check (public.es_empleado());
create policy borrar on public.tarea for delete to authenticated using (public.es_gerente());

-- El rol anónimo (la llave pública de la web) no toca ninguna tabla del CRM.
revoke all on public.empleado, public.persona, public.oportunidad, public.evento, public.comision_tarifa, public.poliza, public.tarea, public.produccion from anon;

-- La web ya no la usa (el cotizador de salud va directo a WhatsApp) y era la única escritura pública abierta.
revoke execute on function public.lead_rapido(text, text, integer, text, boolean, text, boolean, text, text, integer, text) from public, anon, authenticated;
