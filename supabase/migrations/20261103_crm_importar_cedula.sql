-- Importar clientes: dos cédulas distintas con el mismo celular son dos clientes, no uno.
create or replace function public.importar_personas(filas jsonb, prevalece boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb; p public.persona; n_nuevos int := 0; n_act int := 0; n_err int := 0;
  tel text; tel2 text; ced text; ase uuid; nac date; no_c boolean;
  v_nombre text; v_email text; v_ciudad text; v_dir text; v_notas text; v_origen text; v_wz text;
begin
  if not public.es_gerente() then raise exception 'Solo acceso total puede importar'; end if;
  for r in select * from jsonb_array_elements(filas) loop
    begin
      tel2 := null;
      tel := nullif(right(regexp_replace(coalesce(r->>'telefono', ''), '\D', '', 'g'), 10), '');
      if tel !~ '^3\d{9}$' then tel := null; end if;
      ced := nullif(regexp_replace(coalesce(r->>'cedula', ''), '\D', '', 'g'), '');
      v_nombre := nullif(trim(r->>'nombre'), ''); v_email := nullif(lower(trim(r->>'email')), '');
      v_ciudad := nullif(trim(r->>'ciudad'), ''); v_dir := nullif(trim(r->>'direccion'), '');
      v_notas := nullif(trim(r->>'notas'), ''); v_origen := nullif(trim(r->>'origen'), ''); v_wz := nullif(trim(r->>'woztell_id'), '');
      nac := case when r->>'nacimiento' ~ '^\d{4}-\d{2}-\d{2}$' then (r->>'nacimiento')::date end;
      no_c := lower(coalesce(r->>'no_contactar', '')) in ('si', 'sí', 'true', '1', 'x');
      select id into ase from public.empleado where email = lower(trim(r->>'asesor')) or lower(nombre) = lower(trim(r->>'asesor')) limit 1;
      if ced is null and tel is null then n_err := n_err + 1; continue; end if;

      p := null;
      if ced is not null then select * into p from public.persona where cedula = ced; end if;
      -- El celular solo une si no hay cédulas distintas: familias y empresas comparten celular y son clientes diferentes.
      if p.id is null and tel is not null then select * into p from public.persona where telefono = tel and (ced is null or cedula is null); end if;
      -- Celular que ya es de otro cliente: queda como secundario (en clientes nuevos) y no se le quita al otro.
      if tel is not null and exists (select 1 from public.persona where telefono = tel and id is distinct from p.id) then tel2 := tel; tel := null; end if;

      if p.id is null then
        insert into public.persona (nombre, cedula, telefono, telefono2, email, ciudad, direccion, nacimiento, notas, origen, no_contactar, woztell_id, asesor_id, creado)
        values (coalesce(v_nombre, 'Sin nombre'), ced, tel, tel2, v_email, v_ciudad, v_dir, nac, v_notas, coalesce(v_origen, 'importación'), no_c, v_wz, ase,
                coalesce(case when r->>'creado' ~ '^\d{4}-\d{2}-\d{2}' then (r->>'creado')::timestamptz end, now()));
        n_nuevos := n_nuevos + 1;
      elsif prevalece then
        update public.persona set
          nombre = case when v_nombre is null or v_nombre like 'Sin nombre%' then nombre else v_nombre end,
          cedula = coalesce(ced, cedula), telefono = coalesce(tel, telefono), email = coalesce(v_email, email), ciudad = coalesce(v_ciudad, ciudad),
          direccion = coalesce(v_dir, direccion), nacimiento = coalesce(nac, nacimiento), notas = coalesce(v_notas, notas),
          no_contactar = no_contactar or no_c, woztell_id = coalesce(woztell_id, v_wz), asesor_id = coalesce(ase, asesor_id), actualizado = now()
        where id = p.id;
        n_act := n_act + 1;
      else
        update public.persona set
          nombre = case when nombre like 'Sin nombre%' and v_nombre is not null then v_nombre else nombre end,
          cedula = coalesce(cedula, ced), telefono = coalesce(telefono, tel), email = coalesce(email, v_email), ciudad = coalesce(ciudad, v_ciudad),
          direccion = coalesce(direccion, v_dir), nacimiento = coalesce(nacimiento, nac), notas = coalesce(notas, v_notas),
          no_contactar = no_contactar or no_c, woztell_id = coalesce(woztell_id, v_wz), asesor_id = coalesce(asesor_id, ase), actualizado = now()
        where id = p.id;
        n_act := n_act + 1;
      end if;
    exception when others then n_err := n_err + 1;
    end;
  end loop;
  return jsonb_build_object('nuevos', n_nuevos, 'actualizados', n_act, 'errores', n_err);
end $$;
