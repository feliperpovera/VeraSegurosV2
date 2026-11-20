-- Aplicado el 2026-11-20 por MCP. El celular es único por cliente (persona_telefono_key).
-- pasar_celular(de, a, tel): el número que tenía otro cliente pasa a este; el otro queda sin celular y los dos guardan la nota en su historial (evento).
-- Permiso: empleado activo (incluye comerciales). Corre con RLS de quien lo usa. En el CRM: Editar cliente → al escribir un celular repetido
-- muestra quién lo tiene, con "Dejar el celular en …" o "Editar a …".
create or replace function public.pasar_celular(de uuid, a uuid, tel text)
 returns void language plpgsql security invoker set search_path to '' as $function$
declare quien uuid; nombre_de text; nombre_a text;
begin
  select e.id into quien from public.empleado e where e.email = lower(auth.jwt() ->> 'email') and e.activo;
  if quien is null then raise exception 'Solo el equipo puede cambiar celulares'; end if;
  select nombre into nombre_de from public.persona where id = de and telefono = tel;
  select nombre into nombre_a from public.persona where id = a;
  if nombre_de is null or nombre_a is null then raise exception 'El celular ya no está en ese cliente'; end if;
  update public.persona set telefono = null, actualizado = now() where id = de;
  update public.persona set telefono = tel, actualizado = now() where id = a;
  insert into public.evento (persona_id, canal, texto, empleado_id) values
    (de, 'crm', 'Se le quitó el celular ' || tel || ': ahora es de ' || nombre_a, quien),
    (a, 'crm', 'Recibió el celular ' || tel || ', que estaba en ' || nombre_de, quien);
end $function$;
revoke execute on function public.pasar_celular(uuid, uuid, text) from anon;
